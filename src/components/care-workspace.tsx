'use client';

// Clinical Ledger design: the UI keeps chronological care context visible and never fabricates clinical records.
import { useUser } from '@clerk/nextjs';
import {
  Activity,
  ArrowRight,
  ChevronDown,
  CircleAlert,
  ClipboardList,
  FileText,
  HeartPulse,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { AccountProjection, CoreProblem, CoreSuccess } from '@/lib/core-api';
import { isCoreProblem } from '@/lib/core-api';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; projection: AccountProjection; correlationId: string }
  | { status: 'error'; problem: CoreProblem };

const navigation = [
  { label: 'Today', icon: Activity, active: true },
  { label: 'Profiles', icon: UsersRound },
  { label: 'Prescription evidence', icon: FileText, href: '/evidence' },
  { label: 'Access', icon: ShieldCheck },
];

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
          detail: 'The companion could not reach its same-origin Core bridge.',
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

  const firstProfile = state.status === 'ready' ? state.projection.profiles[0] : undefined;
  const accountName = state.status === 'ready' ? state.projection.account?.displayName : user?.fullName;

  return (
    <div className="care-shell">
      <aside className="nav-rail" aria-label="Nirog care navigation">
        <a className="brand-lockup" href="#workspace" aria-label="Nirog care workspace">
          <span className="brand-mark" aria-hidden="true"><i /><b /></span>
          <span>Nirog</span>
        </a>
        <nav className="rail-nav">
          {navigation.map(({ label, icon: Icon, active, href }) => (
            <a className={`rail-item ${active ? 'is-active' : ''}`} href={href ?? '#workspace'} key={label}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="rail-footnote">
          <LockKeyhole size={15} />
          <span>Profile-scoped<br />care record</span>
        </div>
      </aside>

      <main className="care-main" id="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Care workspace / personal account</p>
            <h1>{accountName ? `Good to see you, ${accountName.split(' ')[0]}.` : 'Your care day, in one clear record.'}</h1>
          </div>
          <button className="profile-context" type="button">
            <span className="context-avatar">{firstProfile?.preferredName?.slice(0, 1) ?? '—'}</span>
            <span>
              <small>Active profile</small>
              <strong>{firstProfile?.preferredName ?? 'No profile selected'}</strong>
            </span>
            <ChevronDown size={16} />
          </button>
        </header>

        <section className="care-intro" aria-labelledby="today-title">
          <div>
            <p className="eyebrow">Today’s record</p>
            <h2 id="today-title">Start with what is verified.</h2>
          </div>
          <button className="quiet-action" onClick={() => void loadProjection()} type="button">
            <RefreshCw size={16} /> Refresh record
          </button>
        </section>

        {state.status === 'loading' && <LoadingLedger />}
        {state.status === 'error' && <ConnectionLedger problem={state.problem} onRetry={loadProjection} />}
        {state.status === 'ready' && <VerifiedLedger projection={state.projection} correlationId={state.correlationId} />}
      </main>

      <aside className="context-panel" aria-label="Care context">
        <div className="context-heading">
          <p className="eyebrow">Care context</p>
          <span className="verification-chip"><ShieldCheck size={14} /> Clerk verified</span>
        </div>
        <section className="context-card">
          <HeartPulse size={20} />
          <h2>Profile scope</h2>
          <p>Care data remains separate for every patient profile. Delegated access is reviewed at the profile level.</p>
          <a href="#access">Review access <ArrowRight size={15} /></a>
        </section>
        <section className="context-card muted-card">
          <ClipboardList size={20} />
          <h2>What is connected</h2>
          <p>Identity, preferences, profiles, access grants, and team creation are available through Nirog Core.</p>
        </section>
      </aside>
    </div>
  );
}

function LoadingLedger() {
  return (
    <section className="ledger-panel loading-ledger" aria-live="polite">
      <LoaderCircle className="spin" size={20} />
      <div>
        <p className="eyebrow">Secure connection</p>
        <h2>Retrieving your profile-scoped record.</h2>
        <p>The web companion is asking Nirog Core only for the current signed-in account.</p>
      </div>
    </section>
  );
}

function ConnectionLedger({ problem, onRetry }: { problem: CoreProblem; onRetry: () => void }) {
  const needsTemplate = problem.code === 'CORE_TOKEN_UNAVAILABLE';
  return (
    <section className="ledger-panel warning-ledger" aria-live="polite">
      <CircleAlert size={22} />
      <div>
        <p className="eyebrow">Connection requires attention</p>
        <h2>{problem.title}</h2>
        <p>{problem.detail ?? 'The Nirog Core bridge needs configuration before it can load this care record.'}</p>
        {needsTemplate && <p className="microcopy">Configure <code>NIROG_CORE_JWT_TEMPLATE</code> with the audience expected by Nirog Core, then refresh.</p>}
        <button className="primary-action" onClick={onRetry} type="button"><RefreshCw size={16} /> Try again</button>
      </div>
    </section>
  );
}

function VerifiedLedger({ projection, correlationId }: { projection: AccountProjection; correlationId: string }) {
  const profileCount = projection.profiles.length;
  return (
    <section className="ledger-grid">
      <article className="ledger-panel profile-ledger">
        <div className="ledger-line" />
        <div className="ledger-time">NOW</div>
        <div>
          <p className="eyebrow">Verified profile record</p>
          <h2>{profileCount === 0 ? 'No patient profile has been created.' : `${profileCount} profile${profileCount === 1 ? '' : 's'} available to this account.`}</h2>
          <p>{profileCount === 0 ? 'Create an owned profile in the mobile app or upcoming profile workflow; Nirog does not invent clinical data.' : 'Select a profile context to continue with its protected care record.'}</p>
          <button className="primary-action" type="button"><UserRoundPlus size={16} /> Create profile</button>
        </div>
      </article>
      <article className="record-metric">
        <p className="eyebrow">Preferences</p>
        <strong>{projection.preferences.timezone}</strong>
        <span>{projection.preferences.notificationsEnabled ? 'Notifications enabled' : 'Notifications paused'}</span>
      </article>
      <article className="record-metric">
        <p className="eyebrow">Evidence</p>
        <strong>Verified</strong>
        <span>Correlation {correlationId.slice(0, 8)}</span>
      </article>
    </section>
  );
}
