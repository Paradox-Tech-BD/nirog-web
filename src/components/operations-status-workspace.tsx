'use client';

import { AlertTriangle, CheckCircle2, CircleDashed, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { CoreReadError, coreMessage, readCore, type OperationsStatusSnapshot } from '@/lib/core-read-model';

type OperationsState =
  | { phase: 'loading'; snapshot: null; refreshing: false; error?: string; accessDenied?: boolean }
  | { phase: 'ready'; snapshot: OperationsStatusSnapshot; refreshing: boolean; error?: string; accessDenied?: boolean };

function durationLabel(seconds: number | null): string {
  if (seconds === null) return 'No unacknowledged in-app notices';
  if (seconds < 60) return 'Less than one minute';
  if (seconds < 3_600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)} hours`;
  return `${Math.floor(seconds / 86_400)} days`;
}

function accessMessage(error: unknown): { message: string; accessDenied: boolean } {
  if (error instanceof CoreReadError && [401, 403].includes(error.problem.status)) {
    return { message: 'This operational view is available only to designated platform operators. No operational data was loaded.', accessDenied: true };
  }
  return { message: coreMessage(error, 'Operational status could not be read. No work item or care record was changed.'), accessDenied: false };
}

export function OperationsStatusWorkspace() {
  const [state, setState] = useState<OperationsState>({ phase: 'loading', snapshot: null, refreshing: false });

  const load = useCallback(async () => {
    setState((current) => current.snapshot
      ? { phase: 'ready', snapshot: current.snapshot, refreshing: true }
      : { phase: 'loading', snapshot: null, refreshing: false });
    try {
      const snapshot = await readCore<OperationsStatusSnapshot>('platform/operations/status');
      setState({ phase: 'ready', snapshot, refreshing: false });
    } catch (error) {
      const { message, accessDenied } = accessMessage(error);
      setState((current) => current.snapshot
        ? { phase: 'ready', snapshot: current.snapshot, refreshing: false, error: message, accessDenied }
        : { phase: 'loading', snapshot: null, refreshing: false, error: message, accessDenied });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const snapshot = state.snapshot;
  return <AppShell><section className="care-circle-page"><header className="evidence-hero"><div className="evidence-hero-copy"><p className="eyebrow">Platform operations</p><h1>Aggregate delivery and review workflow signals.</h1><p>This view is read-only and Core-authoritative. It never exposes patients, evidence, extracted text, medication data, job identifiers, payloads, or remediation controls.</p></div><div className="evidence-hero-actions"><span className={snapshot && !state.refreshing ? 'live-status ready' : 'live-status'}><ShieldCheck size={15} /> {snapshot && !state.refreshing ? 'Aggregate snapshot loaded' : 'Checking operator access'}</span><button className="button button-secondary" disabled={state.phase === 'loading' && !state.error} onClick={() => void load()} type="button"><RefreshCw className={state.refreshing || (state.phase === 'loading' && !state.error) ? 'spin' : undefined} size={16} /> Refresh</button></div></header>
    {state.error && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>{state.accessDenied ? 'Operator authorization required.' : 'Operational data needs attention.'}</strong><p>{state.error}</p></div>{!state.accessDenied && <button className="button button-secondary" onClick={() => void load()} type="button">Try again</button>}</section>}
    {state.phase === 'loading' && !state.error && <p className="state-line"><LoaderCircle className="spin" size={17} /> Loading aggregate operations status…</p>}
    {snapshot && <section className="grant-stage"><div className="draft-stage-heading"><div><p className="eyebrow">PostgreSQL-backed status</p><h2>Operational attention signals</h2><p>Counts are aggregates from Core’s outbox and OCR lifecycle. They do not reveal individual work items and they cannot be changed from this page.</p></div><span><CheckCircle2 size={16} /> Read only</span></div><ul className="grant-grid" aria-label="Aggregate operations status"><li><span className="grant-icon"><CircleDashed size={18} /></span><div><strong>{snapshot.outbox.claimable} claimable deliveries</strong><p>{snapshot.outbox.deadLettered} delivery items require private operational follow-up.</p></div><span className="status-chip">Outbox</span></li><li><span className="grant-icon"><CircleDashed size={18} /></span><div><strong>{snapshot.ocr.retryScheduled} OCR retries scheduled</strong><p>{snapshot.ocr.deadLettered} OCR items require private operational follow-up.</p></div><span className="status-chip">OCR</span></li><li><span className="grant-icon"><ShieldCheck size={18} /></span><div><strong>In-app notice age</strong><p>{durationLabel(snapshot.inAppInbox.oldestUnacknowledgedAgeSeconds)}</p></div><span className="status-chip">Inbox</span></li></ul><p className="state-line"><ShieldCheck size={17} /> Snapshot generated {new Date(snapshot.generatedAt).toLocaleString()} · database migration state is monitored through private infrastructure.</p></section>}
  </section></AppShell>;
}
