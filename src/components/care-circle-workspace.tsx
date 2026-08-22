/**
 * Design system: Care pathway. The care-circle view makes authorization
 * understandable without exposing joined account identity data Core does not
 * provide, and it deliberately contains no approval control for extraction.
 */
'use client';

import { AlertTriangle, ArrowRight, CircleDashed, LoaderCircle, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import type { AccountProjection } from '@/lib/core-api';
import { coreMessage, readCore, type ProfileGrantSummary } from '@/lib/core-read-model';

type CareCircleState =
  | { phase: 'loading'; account: AccountProjection | null; grants: ProfileGrantSummary[]; error?: string }
  | { phase: 'ready'; account: AccountProjection; grants: ProfileGrantSummary[]; refreshing: boolean; error?: string };

function roleLabel(role: ProfileGrantSummary['roleCode']): string {
  return role === 'caregiver' ? 'Caregiver' : role === 'curator' ? 'Curator' : 'Viewer';
}

export function CareCircleWorkspace() {
  const [state, setState] = useState<CareCircleState>({ phase: 'loading', account: null, grants: [] });
  const [profileId, setProfileId] = useState('');

  const load = useCallback(async (requestedProfileId = '') => {
    setState((current) => {
      if (current.account) {
        return { phase: 'ready', account: current.account, grants: current.grants, refreshing: true, error: undefined };
      }
      return { phase: 'loading', account: null, grants: [] };
    });
    try {
      const account = await readCore<AccountProjection>('me');
      const resolvedProfileId = requestedProfileId || account.profiles[0]?.id || '';
      const grants = resolvedProfileId ? await readCore<ProfileGrantSummary[]>(`profiles/${resolvedProfileId}/access-grants`) : [];
      setProfileId(resolvedProfileId);
      setState({ phase: 'ready', account, grants, refreshing: false });
    } catch (error) {
      setState((current) => ({
        phase: current.account ? 'ready' : 'loading',
        account: current.account,
        grants: current.grants,
        ...(current.account ? { refreshing: false } : {}),
        error: coreMessage(error, 'Care-circle access could not be loaded. No access changed.'),
      }) as CareCircleState);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const account = state.account;
  const activeGrants = state.grants.filter((grant) => grant.status === 'active');

  return <AppShell><section className="care-circle-page"><header className="evidence-hero"><div className="evidence-hero-copy"><p className="eyebrow">Care-circle access</p><h1>Make shared care visible without making it a gate.</h1><p>Authorized access is profile-scoped. Caregivers can inspect care context, provenance, and drafts when granted permission, while automatic extraction continues independently.</p></div><div className="evidence-hero-actions"><span className={state.phase === 'ready' && !state.refreshing ? 'live-status ready' : 'live-status'}><ShieldCheck size={15} /> {state.phase === 'ready' && !state.refreshing ? 'Access record loaded' : 'Checking access'}</span><button className="button button-secondary" disabled={state.phase === 'loading'} onClick={() => void load(profileId)} type="button"><RefreshCw className={state.phase === 'loading' || (state.phase === 'ready' && state.refreshing) ? 'spin' : undefined} size={16} /> Refresh</button></div></header>
    {state.error && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>Care-circle data needs attention.</strong><p>{state.error}</p></div><button className="button button-secondary" onClick={() => void load(profileId)} type="button">Try again</button></section>}
    <section className="care-circle-selector"><label>Profile<select value={profileId} onChange={(event) => void load(event.target.value)} disabled={state.phase === 'loading'}><option value="">Select a profile</option>{account?.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.preferredName}</option>)}</select></label><p><ShieldCheck size={16} /> Access is granted by Core and evaluated per profile.</p></section>
    <section className="care-circle-layout"><article className="care-circle-principle"><span className="principle-number">01</span><h2>Extraction is automatic</h2><p>Once a prescription is received, the asynchronous workflow prepares editable medication drafts. A caregiver does not need to approve or unblock this work.</p></article><article className="care-circle-principle"><span className="principle-number">02</span><h2>Visibility is permissioned</h2><p>Access grants define which profile context a person can inspect. The Web companion shows only safe relationship status and permission counts supplied by Core.</p></article><article className="care-circle-principle"><span className="principle-number">03</span><h2>Regimens stay explicit</h2><p>Submitting a medication regimen remains a separate patient or authorized-caregiver action. Nothing on this screen creates a regimen.</p></article></section>
    <section className="grant-stage"><div className="draft-stage-heading"><div><p className="eyebrow">Authorized relationship record</p><h2>Profile access grants</h2><p>Core returns role, status, scope, and expiry. It intentionally does not send joined names, emails, or avatars for other accounts to this view.</p></div><span>{activeGrants.length} active</span></div>{state.phase === 'loading' ? <p className="state-line"><LoaderCircle className="spin" size={17} /> Loading profile access…</p> : activeGrants.length === 0 ? <p className="state-line state-line-empty"><CircleDashed size={17} /> No additional active grants are recorded for this profile.</p> : <ul className="grant-grid">{activeGrants.map((grant) => <li key={grant.id}><span className="grant-icon"><UsersRound size={18} /></span><div><strong>{roleLabel(grant.roleCode)} access</strong><p>{grant.permissions.length} delegated permission{grant.permissions.length === 1 ? '' : 's'} · {grant.expiresAt ? 'expires on a scheduled date' : 'no expiry recorded'}</p></div><span className="status-chip">Active</span></li>)}</ul>}<Link className="button button-secondary" href="/evidence">Open prescription workspace <ArrowRight size={16} /></Link></section>
  </section></AppShell>;
}
