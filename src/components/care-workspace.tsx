'use client';

import { useUser } from '@clerk/nextjs';
import { ArrowRight, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { ProfileCreationForm } from '@/components/profile-creation-form';
import type { AccountProjection, CoreProblem, CoreSuccess } from '@/lib/core-api';
import { isCoreProblem } from '@/lib/core-api';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; projection: AccountProjection; correlationId: string }
  | { status: 'error'; problem: CoreProblem };

function readableProblem(value: unknown): CoreProblem {
  if (isCoreProblem(value)) return value;
  return {
    type: 'https://nirog.app/problems/core-response-unreadable',
    title: 'Care record unavailable',
    status: 502,
    code: 'CORE_RESPONSE_UNREADABLE',
    correlationId: 'not-provided',
    detail: 'Nirog Core returned a response the companion could not read.',
  };
}

export function CareWorkspace() {
  const { user } = useUser();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  const loadProjection = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const response = await fetch('/api/core/me', { cache: 'no-store' });
      const body: unknown = await response.json();
      if (!response.ok) {
        setState({ status: 'error', problem: readableProblem(body) });
        return;
      }
      const result = body as CoreSuccess<AccountProjection>;
      setState({ status: 'ready', projection: result.data, correlationId: result.meta.correlationId });
    } catch {
      setState({
        status: 'error',
        problem: {
          type: 'https://nirog.app/problems/web-network-unavailable',
          title: 'Care record unavailable',
          status: 502,
          code: 'WEB_NETWORK_UNAVAILABLE',
          correlationId: 'not-provided',
          detail: 'The Nirog Core connection could not be reached from this browser session.',
        },
      });
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      void loadProjection();
    }, 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadProjection]);

  const accountName = state.status === 'ready' ? state.projection.account?.displayName : user?.fullName;

  return (
    <AppShell>
      <div className="workspace-page">
        <header className="page-heading">
          <div>
            <p className="eyebrow">Care workspace</p>
            <h1>{accountName ? `Welcome back, ${accountName.split(' ')[0]}.` : 'Your care day, clearly held.'}</h1>
            <p>Start with your verified profile context, then move into prescription evidence when you are ready.</p>
          </div>
          <button className="button button-secondary" onClick={() => void loadProjection()} type="button"><RefreshCw size={16} /> Refresh</button>
        </header>

        {state.status === 'loading' && <LoadingRecord />}
        {state.status === 'error' && <ConnectionRecord problem={state.problem} onRetry={loadProjection} />}
        {state.status === 'ready' && <VerifiedRecord projection={state.projection} correlationId={state.correlationId} onProfileCreated={loadProjection} />}
      </div>
    </AppShell>
  );
}

function LoadingRecord() {
  return <section className="state-card" aria-live="polite"><LoaderCircle className="spin" size={21} /><div><p className="eyebrow">Secure connection</p><h2>Loading your profile-scoped record</h2><p>Nirog is requesting only the account context verified for this session.</p></div></section>;
}

function ConnectionRecord({ problem, onRetry }: { problem: CoreProblem; onRetry: () => void }) {
  return <section className="state-card state-card-warning" aria-live="polite"><CircleAlert size={22} /><div><p className="eyebrow">Connection needs attention</p><h2>{problem.title}</h2><p>{problem.detail ?? 'The Nirog Core connection needs attention before the record can load.'}</p><button className="button button-primary" onClick={onRetry} type="button"><RefreshCw size={16} /> Try again</button></div></section>;
}

function VerifiedRecord({ projection, correlationId, onProfileCreated }: { projection: AccountProjection; correlationId: string; onProfileCreated: () => void }) {
  const firstProfile = projection.profiles[0];
  const profileCount = projection.profiles.length;

  return <div className="workspace-grid"><section className="overview-card overview-primary" id="profiles"><div className="overview-card-top"><span className="icon-circle"><UsersRound size={20} /></span><span className="status-chip"><ShieldCheck size={14} /> Core verified</span></div><p className="eyebrow">Profile context</p><h2>{profileCount === 0 ? 'No patient profile is available yet.' : firstProfile?.preferredName ?? `${profileCount} profile${profileCount === 1 ? '' : 's'} available`}</h2><p>{profileCount === 0 ? 'Create or obtain access to a profile before adding prescription evidence.' : `${profileCount} profile${profileCount === 1 ? '' : 's'} are available to your signed-in account. Evidence and access stay within the selected profile.`}</p>{profileCount === 0 ? <ProfileCreationForm defaultTimezone={projection.preferences.timezone} onCreated={onProfileCreated} /> : <Link className="inline-link" href="/evidence">Open prescription workspace <ArrowRight size={16} /></Link>}</section><section className="overview-card"><p className="eyebrow">Care preferences</p><h2>{projection.preferences.timezone}</h2><p>{projection.preferences.notificationsEnabled ? 'Notifications are enabled for this account.' : 'Notifications are currently paused for this account.'}</p></section><section className="overview-card"><p className="eyebrow">Automatic intake</p><h2>Draft-ready</h2><p>Prescription evidence is processed automatically into editable medication drafts. A regimen exists only after an explicit authorized submission.</p><Link className="inline-link" href="/evidence">Follow prescription status <ArrowRight size={16} /></Link></section><section className="overview-card overview-wide"><div><p className="eyebrow">Connection details</p><h2>Your care record is ready when you are.</h2><p>Core identity, profile access, prescription processing, and caregiver visibility each stay within their own controlled boundary.</p></div><div className="connection-code"><span>SESSION</span><strong>{correlationId.slice(0, 8)}</strong></div></section></div>;
}
