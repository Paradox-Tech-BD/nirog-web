'use client';

import { useUser } from '@clerk/nextjs';
import { ArrowRight, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
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
        {state.status === 'ready' && <VerifiedRecord projection={state.projection} correlationId={state.correlationId} />}
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

function VerifiedRecord({ projection, correlationId }: { projection: AccountProjection; correlationId: string }) {
  const firstProfile = projection.profiles[0];
  const profileCount = projection.profiles.length;

  return <div className="workspace-grid"><section className="overview-card overview-primary" id="profiles"><div className="overview-card-top"><span className="icon-circle"><UsersRound size={20} /></span><span className="status-chip"><ShieldCheck size={14} /> Core verified</span></div><p className="eyebrow">Profile context</p><h2>{profileCount === 0 ? 'No patient profile is available yet.' : firstProfile?.preferredName ?? `${profileCount} profile${profileCount === 1 ? '' : 's'} available`}</h2><p>{profileCount === 0 ? 'Create or obtain access to a profile before adding prescription evidence.' : `${profileCount} profile${profileCount === 1 ? '' : 's'} are available to your signed-in account. Evidence and access stay within the selected profile.`}</p>{profileCount === 0 ? <ProfileOnboarding defaultTimezone={projection.preferences.timezone} onCreated={() => window.location.reload()} /> : <Link className="inline-link" href="/evidence">Open prescription evidence <ArrowRight size={16} /></Link>}</section><section className="overview-card"><p className="eyebrow">Care preferences</p><h2>{projection.preferences.timezone}</h2><p>{projection.preferences.notificationsEnabled ? 'Notifications are enabled for this account.' : 'Notifications are currently paused for this account.'}</p></section><section className="overview-card"><p className="eyebrow">Evidence review</p><h2>Human-led</h2><p>Prescription OCR is advisory. A review must be confirmed before Core can receive provenance.</p><Link className="inline-link" href="/evidence">Review evidence <ArrowRight size={16} /></Link></section><section className="overview-card overview-wide"><div><p className="eyebrow">Connection details</p><h2>Your care record is ready when you are.</h2><p>Core identity, profile access, and evidence workflows remain separate from operational OCR processing.</p></div><div className="connection-code"><span>SESSION</span><strong>{correlationId.slice(0, 8)}</strong></div></section></div>;
}

function ProfileOnboarding({ defaultTimezone, onCreated }: { defaultTimezone: string; onCreated: () => void }) {
  const [preferredName, setPreferredName] = useState('');
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<CoreProblem | null>(null);

  async function createProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setProblem(null);
    try {
      const response = await fetch('/api/core/profiles', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': `profile-create-${crypto.randomUUID()}` },
        body: JSON.stringify({ preferredName: preferredName.trim(), timezone: timezone.trim() }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setProblem(readableProblem(body));
        return;
      }
      onCreated();
    } catch {
      setProblem({ type: 'https://nirog.app/problems/web-network-unavailable', title: 'Profile could not be created', status: 502, code: 'WEB_NETWORK_UNAVAILABLE', correlationId: 'not-provided', detail: 'The Nirog Core connection could not be reached from this browser session.' });
    } finally {
      setSubmitting(false);
    }
  }

  return <form className="profile-onboarding" onSubmit={createProfile}><label>Profile name<input aria-label="Profile name" disabled={submitting} maxLength={160} onChange={(event) => setPreferredName(event.target.value)} required value={preferredName} /></label><label>Timezone<input aria-label="Timezone" disabled={submitting} maxLength={64} onChange={(event) => setTimezone(event.target.value)} required value={timezone} /></label>{problem && <p className="form-problem" role="alert">{problem.detail ?? problem.title}</p>}<button className="button button-primary" disabled={submitting} type="submit">{submitting ? 'Creating profile…' : 'Create profile'}</button></form>;
}
