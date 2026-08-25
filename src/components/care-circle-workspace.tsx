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
import { coreMessage, readCore, type ProfileAccessContext, type ProfileGrantSummary } from '@/lib/core-read-model';
import {
  defaultActiveProfileId,
  isArchivedProfileSelection,
  profileOptionLabel,
} from '@/lib/profile-selection';

type CareCircleState =
  | { phase: 'loading'; account: AccountProjection | null; grants: ProfileGrantSummary[]; context: ProfileAccessContext | null; error?: string }
  | { phase: 'ready'; account: AccountProjection; grants: ProfileGrantSummary[]; context: ProfileAccessContext | null; refreshing: boolean; error?: string };

function roleLabel(role: ProfileGrantSummary['roleCode']): string {
  return role === 'caregiver' ? 'Caregiver' : role === 'curator' ? 'Curator' : 'Viewer';
}

export function CareCircleWorkspace() {
  const [state, setState] = useState<CareCircleState>({ phase: 'loading', account: null, grants: [], context: null });
  const [profileId, setProfileId] = useState('');

  const load = useCallback(async (requestedProfileId = '') => {
    setState((current) => {
      if (current.account) {
        return { phase: 'ready', account: current.account, grants: current.grants, context: current.context, refreshing: true, error: undefined };
      }
      return { phase: 'loading', account: null, grants: [], context: null };
    });
    try {
      const account = await readCore<AccountProjection>('me');
      const resolvedProfileId = requestedProfileId || defaultActiveProfileId(account.profiles);
      if (isArchivedProfileSelection(account.profiles, resolvedProfileId)) {
        setProfileId(resolvedProfileId);
        setState({
          phase: 'ready',
          account,
          grants: [],
          context: null,
          refreshing: false,
          error: 'This profile is archived. Choose an active profile to inspect current care-circle access.',
        });
        return;
      }
      const [contextResult, grantsResult] = resolvedProfileId
        ? await Promise.allSettled([
            readCore<ProfileAccessContext>(`profiles/${resolvedProfileId}/access-context`),
            readCore<ProfileGrantSummary[]>(`profiles/${resolvedProfileId}/access-grants`),
          ])
        : [];
      const context = contextResult?.status === 'fulfilled' ? contextResult.value : null;
      const grants = grantsResult?.status === 'fulfilled' ? grantsResult.value : [];
      setProfileId(resolvedProfileId);
      setState({ phase: 'ready', account, grants, context, refreshing: false });
    } catch (error) {
      setState((current) => ({
        phase: current.account ? 'ready' : 'loading',
        account: current.account,
        grants: current.grants,
        context: current.context,
        ...(current.account ? { refreshing: false } : {}),
        error: coreMessage(error, 'Care-circle access could not be loaded. No access changed.'),
      }) as CareCircleState);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const account = state.account;
  const selectedProfileArchived = isArchivedProfileSelection(account?.profiles ?? [], profileId);
  const activeGrants = state.grants.filter((grant) => grant.status === 'active');
  const selfAccess = state.context;

  return <AppShell><section className="care-circle-page"><header className="evidence-hero"><div className="evidence-hero-copy"><p className="eyebrow">Care-circle access</p><h1>Make shared care visible without making it a gate.</h1><p>Authorized access is profile-scoped. Caregivers can inspect care context, provenance, and drafts when granted permission, while automatic extraction continues independently.</p></div><div className="evidence-hero-actions"><span className={state.phase === 'ready' && !state.refreshing ? 'live-status ready' : 'live-status'}><ShieldCheck size={15} /> {state.phase === 'ready' && !state.refreshing ? 'Access record loaded' : 'Checking access'}</span><button className="button button-secondary" disabled={state.phase === 'loading'} onClick={() => void load(profileId)} type="button"><RefreshCw className={state.phase === 'loading' || (state.phase === 'ready' && state.refreshing) ? 'spin' : undefined} size={16} /> Refresh</button></div></header>
    {state.error && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>Care-circle data needs attention.</strong><p>{state.error}</p></div><button className="button button-secondary" onClick={() => void load(profileId)} type="button">Try again</button></section>}
    <section className="care-circle-selector"><label>Profile<select value={profileId} onChange={(event) => void load(event.target.value)} disabled={state.phase === 'loading'}><option value="">Select a profile</option>{account?.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profileOptionLabel(profile)}</option>)}</select></label><p><ShieldCheck size={16} /> Access is granted by Core and evaluated per profile.</p></section>
    <section className="care-circle-layout"><article className="care-circle-principle"><span className="principle-number">01</span><h2>Extraction is automatic</h2><p>Once a prescription is received, the asynchronous workflow prepares editable medication drafts. A caregiver does not need to approve or unblock this work.</p></article><article className="care-circle-principle"><span className="principle-number">02</span><h2>Visibility is permissioned</h2><p>Access grants define which profile context a person can inspect. The Web companion shows only safe relationship status and permission counts supplied by Core.</p></article><article className="care-circle-principle"><span className="principle-number">03</span><h2>Regimens stay explicit</h2><p>Submitting a medication regimen remains a separate patient or authorized-caregiver action. Nothing on this screen creates a regimen.</p></article></section>
    <section className="grant-stage"><div className="draft-stage-heading"><div><p className="eyebrow">Authorized relationship record</p><h2>Your profile access</h2><p>Core returns the caller’s own role and permission snapshot. The complete roster is available only to people with share-management authority, and this view intentionally contains no joined account identity data.</p></div><span>{selectedProfileArchived ? 'Archived profile' : selfAccess?.accessKind === 'owner' ? 'Profile owner' : selfAccess?.roleCode ? roleLabel(selfAccess.roleCode) : 'Checking'}</span></div>{state.phase === 'loading' ? <p className="state-line"><LoaderCircle className="spin" size={17} /> Loading profile access…</p> : selectedProfileArchived ? <p className="state-line state-line-empty"><CircleDashed size={17} /> This profile is archived. Select an active profile to inspect current care-circle access.</p> : !selfAccess ? <p className="state-line state-line-empty"><CircleDashed size={17} /> Your profile-access context could not be read yet.</p> : <div className="self-access-card"><span className="grant-icon"><UsersRound size={18} /></span><div><strong>{selfAccess.accessKind === 'owner' ? 'Direct profile owner access' : `${roleLabel(selfAccess.roleCode ?? 'viewer')} access`}</strong><p>{selfAccess.accessKind === 'owner' ? 'This account owns the selected profile.' : `${selfAccess.permissions.length} delegated permission${selfAccess.permissions.length === 1 ? '' : 's'} are active for this profile.`}</p></div><span className="status-chip">Active</span></div>}{!selectedProfileArchived && activeGrants.length > 0 && <><p className="eyebrow roster-label">Manager-visible grants</p><ul className="grant-grid">{activeGrants.map((grant) => <li key={grant.id}><span className="grant-icon"><UsersRound size={18} /></span><div><strong>{roleLabel(grant.roleCode)} access</strong><p>{grant.permissions.length} delegated permission{grant.permissions.length === 1 ? '' : 's'} · {grant.expiresAt ? 'expires on a scheduled date' : 'no expiry recorded'}</p></div><span className="status-chip">Active</span></li>)}</ul></>}<Link className="button button-secondary" href="/evidence">Open prescription workspace <ArrowRight size={16} /></Link></section>
  </section></AppShell>;
}
