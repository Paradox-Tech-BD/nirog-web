/**
 * Design system: Care pathway. This owner-only workspace makes delivery intent,
 * quiet time, and consent-aware eligibility legible without suggesting a provider send.
 */
'use client';

import { AlertTriangle, BellRing, CircleDashed, LoaderCircle, RefreshCw, ShieldCheck, Trash2, UserRoundCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import type { AccountProjection } from '@/lib/core-api';
import {
  coreMessage,
  readCore,
  type NotificationPolicySummary,
  type ProfileAccessContext,
  type ProfileGrantSummary,
} from '@/lib/core-read-model';
import {
  notificationPolicyChannelLabel,
  notificationPolicyEventLabel,
  notificationPolicyRequest,
  validateNotificationPolicyForm,
  type NotificationPolicyForm,
} from '@/lib/notification-policy-form';

type PolicyState = {
  phase: 'loading' | 'ready';
  account: AccountProjection | null;
  context: ProfileAccessContext | null;
  grants: ProfileGrantSummary[];
  policies: NotificationPolicySummary[];
  refreshing: boolean;
  error?: string;
};

const initialState: PolicyState = { phase: 'loading', account: null, context: null, grants: [], policies: [], refreshing: false };

function idempotencyKey(): string {
  return `notification-policy-${crypto.randomUUID()}`;
}

function roleLabel(role: ProfileGrantSummary['roleCode']): string {
  return role === 'caregiver' ? 'Caregiver' : role === 'curator' ? 'Curator' : 'Viewer';
}

function recipientLabel(policy: NotificationPolicySummary, grants: readonly ProfileGrantSummary[]): string {
  if (policy.recipientKind === 'owner') return 'Profile owner';
  const grant = grants.find((candidate) => candidate.granteeAccountId === policy.recipientAccountId && candidate.status === 'active');
  return grant ? `${roleLabel(grant.roleCode)} recipient` : 'Delegated recipient';
}

function quietHoursLabel(policy: NotificationPolicySummary): string {
  return policy.quietHoursStart && policy.quietHoursEnd ? `Quiet ${policy.quietHoursStart}–${policy.quietHoursEnd}` : 'No quiet hours';
}

export function NotificationPolicyWorkspace() {
  const [state, setState] = useState<PolicyState>(initialState);
  const [profileId, setProfileId] = useState('');
  const [form, setForm] = useState<NotificationPolicyForm>({ recipientAccountId: '', eventClass: 'reminder_due', channel: 'in_app', timezone: 'UTC', quietHoursStart: '', quietHoursEnd: '' });
  const [action, setAction] = useState<{ kind: 'idle' | 'saving' | 'withdrawing'; message?: string; error?: string; policyId?: string }>({ kind: 'idle' });

  const load = useCallback(async (requestedProfileId = '') => {
    setState((current) => ({ ...current, phase: current.account ? 'ready' : 'loading', refreshing: Boolean(current.account), error: undefined }));
    try {
      const account = await readCore<AccountProjection>('me');
      const resolvedProfileId = requestedProfileId || profileId || account.profiles[0]?.id || '';
      if (!resolvedProfileId) {
        setProfileId('');
        setState({ ...initialState, phase: 'ready', account, error: 'A profile is required before notification policies can be managed.' });
        return;
      }
      const context = await readCore<ProfileAccessContext>(`profiles/${resolvedProfileId}/access-context`);
      const ownerReads = context.accessKind === 'owner'
        ? await Promise.allSettled([
            readCore<ProfileGrantSummary[]>(`profiles/${resolvedProfileId}/access-grants`),
            readCore<NotificationPolicySummary[]>(`profiles/${resolvedProfileId}/notification-policies`),
          ])
        : [];
      const grants = ownerReads[0]?.status === 'fulfilled' ? ownerReads[0].value : [];
      const policies = ownerReads[1]?.status === 'fulfilled' ? ownerReads[1].value : [];
      const timezone = account.profiles.find((profile) => profile.id === resolvedProfileId)?.timezone ?? 'UTC';
      setProfileId(resolvedProfileId);
      setForm((current) => ({ ...current, recipientAccountId: current.recipientAccountId || account.account?.id || '', timezone }));
      setState({ phase: 'ready', account, context, grants, policies, refreshing: false });
    } catch (error) {
      setState((current) => ({ ...current, phase: current.account ? 'ready' : 'loading', refreshing: false, error: coreMessage(error, 'Notification policies could not be loaded. No policy was changed.') }));
    }
  }, [profileId]);

  useEffect(() => { void load(); }, [load]);

  const isOwner = state.context?.accessKind === 'owner';
  const recipients = useMemo(() => {
    const owner = state.account?.account?.id ? [{ accountId: state.account.account.id, label: 'Profile owner' }] : [];
    return [...owner, ...state.grants.filter((grant) => grant.status === 'active').map((grant) => ({ accountId: grant.granteeAccountId, label: `${roleLabel(grant.roleCode)} recipient` }))];
  }, [state.account?.account?.id, state.grants]);

  const savePolicy = async () => {
    if (!profileId || !isOwner) return;
    const validation = validateNotificationPolicyForm(form);
    if (validation) {
      setAction({ kind: 'idle', error: validation });
      return;
    }
    try {
      setAction({ kind: 'saving' });
      await readCore<NotificationPolicySummary>(`profiles/${profileId}/notification-policies/${form.recipientAccountId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() },
        body: JSON.stringify(notificationPolicyRequest(form)),
      });
      setAction({ kind: 'idle', message: 'Policy saved. It records delivery intent only; no provider message was sent.' });
      await load(profileId);
    } catch (error) {
      setAction({ kind: 'idle', error: coreMessage(error, 'The policy could not be saved. No provider message was sent.') });
    }
  };

  const withdrawPolicy = async (policy: NotificationPolicySummary) => {
    if (!profileId || !isOwner) return;
    try {
      setAction({ kind: 'withdrawing', policyId: policy.id });
      const query = new URLSearchParams({ eventClass: policy.eventClass, channel: policy.channel });
      await readCore(`profiles/${profileId}/notification-policies/${policy.recipientAccountId}?${query}`, {
        method: 'DELETE',
        headers: { 'idempotency-key': idempotencyKey() },
      });
      setAction({ kind: 'idle', message: 'Policy withdrawn. No provider message was cancelled or sent.' });
      await load(profileId);
    } catch (error) {
      setAction({ kind: 'idle', error: coreMessage(error, 'The policy could not be withdrawn. No provider message was sent.') });
    }
  };

  return <AppShell><section className="policy-page care-pathway"><header className="evidence-hero"><div className="evidence-hero-copy"><p className="eyebrow">Notification policy</p><h1>Set delivery intent. Keep delivery claims honest.</h1><p>Choose who may receive a profile care signal, the intended channel, and quiet hours. A policy is not a provider configuration, send, delivery, read receipt, or adherence record.</p></div><div className="evidence-hero-actions"><span className={state.phase === 'ready' && !state.refreshing ? 'live-status ready' : 'live-status'}><BellRing size={15} /> {state.phase === 'ready' && !state.refreshing ? 'Policy record loaded' : 'Loading policy record'}</span><button className="button button-secondary" disabled={state.phase === 'loading' || action.kind !== 'idle'} onClick={() => void load(profileId)} type="button"><RefreshCw className={state.phase === 'loading' || state.refreshing ? 'spin' : undefined} size={16} /> Refresh</button></div></header>
    {state.error && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>Notification policy data needs attention.</strong><p>{state.error}</p></div></section>}
    {action.error && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>Policy action not completed.</strong><p>{action.error}</p></div></section>}
    {action.message && <section className="workflow-banner" aria-live="polite"><ShieldCheck size={19} /><div><strong>Policy action completed.</strong><p>{action.message}</p></div></section>}
    <section className="care-circle-selector"><label>Profile<select value={profileId} onChange={(event) => void load(event.target.value)} disabled={state.phase === 'loading' || action.kind !== 'idle'}><option value="">Select a profile</option>{state.account?.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.preferredName}</option>)}</select></label><p><ShieldCheck size={16} /> Core evaluates ownership, delegated grants, and notification-delivery consent before a policy can be stored.</p></section>
    {state.phase === 'loading' ? <section className="grant-stage"><p className="state-line"><LoaderCircle className="spin" size={17} /> Loading notification-policy access…</p></section> : !profileId ? <section className="grant-stage"><div className="draft-stage-heading"><div><p className="eyebrow">Profile required</p><h2>Select an owned profile to manage notification policies.</h2><p>Policies are scoped to an individual care profile. No provider configuration is available from this page.</p></div></div></section> : !isOwner ? <section className="grant-stage"><div className="draft-stage-heading"><div><p className="eyebrow">Owner-managed control</p><h2>Only the profile owner can change notification policies.</h2><p>Your delegated care access remains separate from recipient eligibility. This view does not expose policy recipients, provider configuration, or delivery targets.</p></div><span>Read only</span></div></section> : <>
      <section className="policy-grid"><article className="plan-panel plan-panel-emphasis"><div className="plan-panel-heading"><div><p className="eyebrow">Policy intent</p><h2>Create or reactivate a policy</h2></div><UserRoundCheck size={20} /></div><p>Core will reject a delegated recipient if its grant or notification-delivery consent is inactive or expired. External channels remain intent-only until their provider is configured.</p><div className="policy-form-grid"><label>Eligible recipient<select value={form.recipientAccountId} onChange={(event) => setForm((current) => ({ ...current, recipientAccountId: event.target.value }))}>{recipients.length === 0 && <option value="">No eligible recipient available</option>}{recipients.map((recipient) => <option key={recipient.accountId} value={recipient.accountId}>{recipient.label}</option>)}</select></label><label>Care signal<select value={form.eventClass} onChange={(event) => setForm((current) => ({ ...current, eventClass: event.target.value as NotificationPolicySummary['eventClass'] }))}><option value="reminder_due">Reminder due</option><option value="refill_alert">Refill alert</option></select></label><label>Intended channel<select value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value as NotificationPolicySummary['channel'] }))}><option value="in_app">In-app</option><option value="email">Email — intent only</option><option value="push">Push — intent only</option><option value="sms">SMS — intent only</option></select></label><label>Profile timezone<input readOnly value={form.timezone} /></label><label>Quiet hours start<input type="time" value={form.quietHoursStart} onChange={(event) => setForm((current) => ({ ...current, quietHoursStart: event.target.value }))} /></label><label>Quiet hours end<input type="time" value={form.quietHoursEnd} onChange={(event) => setForm((current) => ({ ...current, quietHoursEnd: event.target.value }))} /></label></div><button className="button button-primary" disabled={action.kind !== 'idle' || recipients.length === 0} onClick={() => void savePolicy()} type="button"><ShieldCheck size={16} /> {action.kind === 'saving' ? 'Saving policy…' : 'Save policy intent'}</button></article>
        <article className="plan-panel"><div className="plan-panel-heading"><div><p className="eyebrow">Delivery boundary</p><h2>What this page does not do</h2></div><CircleDashed size={20} /></div><p>This workspace never displays a recipient address or phone number, device target, provider payload, credential, or encrypted registration. It also never triggers a provider send.</p><div className="care-boundary"><CircleDashed size={16} /><span>Use the owner delivery-status panel to see safe provider readiness and lifecycle metadata. A ready provider still does not prove a message was delivered.</span></div></article></section>
      <section className="grant-stage policy-list-stage"><div className="draft-stage-heading"><div><p className="eyebrow">Stored intent</p><h2>Profile notification policies</h2><p>These policy rows show authorization intent only. They do not expose contact details or prove any external delivery.</p></div><span>{state.policies.length} record{state.policies.length === 1 ? '' : 's'}</span></div>{state.policies.length === 0 ? <p className="state-line state-line-empty"><CircleDashed size={17} /> No policy is stored for this profile yet.</p> : <ul className="policy-list">{state.policies.map((policy) => <li key={policy.id}><div><strong>{notificationPolicyEventLabel(policy.eventClass)} · {notificationPolicyChannelLabel(policy.channel)}</strong><p>{recipientLabel(policy, state.grants)} · {quietHoursLabel(policy)} · {policy.status}</p><small>{policy.channel === 'in_app' ? 'In-app intent does not replace a durable inbox record.' : `${notificationPolicyChannelLabel(policy.channel)} is not a delivery claim.`}</small></div>{policy.status === 'active' ? <button className="button button-secondary" disabled={action.kind !== 'idle'} onClick={() => void withdrawPolicy(policy)} type="button"><Trash2 size={15} /> {action.kind === 'withdrawing' && action.policyId === policy.id ? 'Withdrawing…' : 'Withdraw'}</button> : <span className="status-chip">Withdrawn</span>}</li>)}</ul>}</section>
    </>}
  </section></AppShell>;
}
