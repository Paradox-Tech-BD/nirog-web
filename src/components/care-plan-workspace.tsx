/* Design system: Care pathway. This page makes medication execution state explicit,
   keeps profile authorization at the Core boundary, and distinguishes in-app records
   from external push, email, or SMS delivery that has not been configured. */
'use client';

import { AlertTriangle, BellRing, CheckCircle2, CircleDashed, ClipboardCheck, PackageCheck, RefreshCw, Send, TimerReset } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import type { AccountProjection } from '@/lib/core-api';
import { carePlanReadPaths } from '@/lib/care-plan-read-paths';
import {
  coreMessage,
  readCore,
  type AdherenceStreakSummary,
  type DailyAdherenceSummary,
  type InAppNotificationSummary,
  type InventoryMovementSummary,
  type InventorySummary,
  type RefillAlertSummary,
  type RegimenSummary,
  type ReminderOccurrenceSummary,
  type ReminderScheduleSummary,
} from '@/lib/core-read-model';

type ReadState = {
  phase: 'loading' | 'ready';
  account: AccountProjection | null;
  regimens: RegimenSummary[];
  reminderSchedules: ReminderScheduleSummary[];
  occurrences: ReminderOccurrenceSummary[];
  notifications: InAppNotificationSummary[];
  inventory: InventorySummary | null;
  movements: InventoryMovementSummary[];
  refillAlerts: RefillAlertSummary[];
  adherence: DailyAdherenceSummary | null;
  streak: AdherenceStreakSummary | null;
  error?: string;
  refreshing: boolean;
};

const initialState: ReadState = {
  phase: 'loading', account: null, regimens: [], reminderSchedules: [], occurrences: [], notifications: [], inventory: null, movements: [], refillAlerts: [], adherence: null, streak: null, refreshing: false,
};

function occurrenceWindow(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function displayTime(value?: string): string {
  if (!value) return 'Not yet available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unavailable' : date.toLocaleString();
}

function actionHeaders(): HeadersInit {
  return { 'content-type': 'application/json', 'idempotency-key': `care-plan-${crypto.randomUUID()}` };
}

async function boundedCareRead<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8_000);
  try {
    return await readCore<T>(path, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

export function CarePlanWorkspace() {
  const [state, setState] = useState<ReadState>(initialState);
  const [profileId, setProfileId] = useState('');
  const [regimenId, setRegimenId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState('0');
  const [inventoryThreshold, setInventoryThreshold] = useState('0');
  const [refillQuantity, setRefillQuantity] = useState('1');
  const [doseAt, setDoseAt] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState('');
  const selectionRef = useRef({ profileId: '', regimenId: '' });
  const loadVersionRef = useRef(0);
  const streamRefreshTimerRef = useRef<number | undefined>(undefined);

  const load = useCallback(async (requestedProfileId = '', requestedRegimenId = '') => {
    const loadVersion = ++loadVersionRef.current;
    const priorSelection = selectionRef.current;
    setState((current) => ({ ...current, phase: current.account ? 'ready' : 'loading', refreshing: Boolean(current.account), error: undefined }));
    try {
      const account = await boundedCareRead<AccountProjection>('me');
      const resolvedProfileId = requestedProfileId || priorSelection.profileId || account.profiles[0]?.id || '';
      if (!resolvedProfileId) {
        if (loadVersion !== loadVersionRef.current) return;
        selectionRef.current = { profileId: '', regimenId: '' };
        setProfileId('');
        setRegimenId('');
        setState({ ...initialState, phase: 'ready', account, error: 'A profile is required before a care plan can be loaded.' });
        return;
      }
      const regimens = await boundedCareRead<RegimenSummary[]>(`profiles/${resolvedProfileId}/medications`);
      const resolvedRegimenId = requestedRegimenId || (resolvedProfileId === priorSelection.profileId ? priorSelection.regimenId : '') || regimens[0]?.id || '';
      const selected = regimens.find((regimen) => regimen.id === resolvedRegimenId);
      const schedule = selected?.schedules[0]?.id || '';
      const window = occurrenceWindow();
      const timezone = account.profiles.find((profile) => profile.id === resolvedProfileId)?.timezone ?? 'UTC';
      const paths = carePlanReadPaths({ profileId: resolvedProfileId, regimenId: resolvedRegimenId, timezone, occurrenceFrom: window.from, occurrenceTo: window.to });
      const results = resolvedRegimenId ? await Promise.allSettled([
        boundedCareRead<ReminderScheduleSummary[]>(paths.reminderSchedules),
        boundedCareRead<ReminderOccurrenceSummary[]>(paths.occurrences),
        boundedCareRead<InventorySummary>(paths.inventory),
        boundedCareRead<InventoryMovementSummary[]>(paths.movements),
        boundedCareRead<RefillAlertSummary[]>(paths.refillAlerts),
        boundedCareRead<DailyAdherenceSummary[]>(paths.dailyAdherence),
        boundedCareRead<AdherenceStreakSummary>(paths.streak),
        boundedCareRead<InAppNotificationSummary[]>(paths.notifications),
      ]) : [];
      if (loadVersion !== loadVersionRef.current) return;
      const value = <T,>(index: number, fallback: T): T => results[index]?.status === 'fulfilled' ? results[index].value as T : fallback;
      selectionRef.current = { profileId: resolvedProfileId, regimenId: resolvedRegimenId };
      setProfileId(resolvedProfileId);
      setRegimenId(resolvedRegimenId);
      setScheduleId((current) => priorSelection.regimenId === resolvedRegimenId ? current || schedule : schedule);
      setState({
        phase: 'ready', account, regimens,
        reminderSchedules: value(0, []), occurrences: value(1, []), inventory: value(2, null), movements: value(3, []), refillAlerts: value(4, []),
        adherence: value<DailyAdherenceSummary[]>(5, [])[0] ?? null, streak: value(6, null), notifications: value(7, []),
        refreshing: false,
      });
    } catch (error) {
      if (loadVersion !== loadVersionRef.current) return;
      setState((current) => ({ ...current, phase: 'ready', refreshing: false, error: coreMessage(error, 'Care-plan data could not be loaded. No care record was changed.') }));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!profileId || typeof EventSource === 'undefined') return;
    const stream = new EventSource(`/api/core/profiles/${profileId}/notifications/stream`);
    const refreshDurableInbox = () => {
      if (streamRefreshTimerRef.current !== undefined) return;
      streamRefreshTimerRef.current = window.setTimeout(() => {
        streamRefreshTimerRef.current = undefined;
        void load(profileId, selectionRef.current.regimenId);
      }, 250);
    };
    stream.addEventListener('notification.refresh', refreshDurableInbox);
    stream.addEventListener('notification.unavailable', refreshDurableInbox);
    return () => {
      stream.removeEventListener('notification.refresh', refreshDurableInbox);
      stream.removeEventListener('notification.unavailable', refreshDurableInbox);
      stream.close();
      if (streamRefreshTimerRef.current !== undefined) {
        window.clearTimeout(streamRefreshTimerRef.current);
        streamRefreshTimerRef.current = undefined;
      }
    };
  }, [load, profileId]);

  const selectedRegimen = useMemo(() => state.regimens.find((regimen) => regimen.id === regimenId) ?? null, [state.regimens, regimenId]);
  const activeOccurrence = state.occurrences.find((occurrence) => occurrence.state === 'delivered' || occurrence.state === 'snoozed');
  const openRefillAlert = state.refillAlerts.find((alert) => alert.status === 'open');
  const profileTimezone = state.account?.profiles.find((profile) => profile.id === profileId)?.timezone ?? 'UTC';

  async function runAction(label: string, path: string, method: 'POST' | 'PUT', body?: Record<string, string | number>) {
    setBusy(label); setActionError(''); setActionMessage('');
    try {
      await readCore(path, { method, headers: actionHeaders(), ...(body ? { body: JSON.stringify(body) } : {}) });
      setActionMessage(`${label} saved. The care-plan read model has been refreshed.`);
      await load(profileId, regimenId);
    } catch (error) {
      setActionError(coreMessage(error, `${label} could not be completed. No additional care record was created.`));
    } finally { setBusy(''); }
  }

  const noProfile = state.phase === 'ready' && state.account && state.account.profiles.length === 0;

  return <AppShell><section className="care-pathway care-plan-page"><header className="evidence-hero"><div className="evidence-hero-copy"><p className="eyebrow">Medication care plan</p><h1>One profile, one current care signal.</h1><p>Review the explicit regimen, schedule, reminder lifecycle, adherence, inventory, refill record, and durable in-app delivery state that Core authorizes for this profile.</p></div><div className="evidence-hero-actions"><span className={state.phase === 'ready' && !state.refreshing ? 'live-status ready' : 'live-status'}><BellRing size={15} /> {state.phase === 'ready' && !state.refreshing ? 'Care plan loaded' : 'Loading care plan'}</span><button className="button button-secondary" disabled={state.phase === 'loading' || Boolean(busy)} onClick={() => void load(profileId, regimenId)} type="button"><RefreshCw className={state.phase === 'loading' || state.refreshing ? 'spin' : undefined} size={16} /> Refresh</button></div></header>
    {state.error && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>Care-plan data needs attention.</strong><p>{state.error}</p></div></section>}
    {actionError && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>Action not completed.</strong><p>{actionError}</p></div></section>}
    {actionMessage && <section className="workflow-banner" aria-live="polite"><CheckCircle2 size={19} /><div><strong>Care-plan command completed.</strong><p>{actionMessage}</p></div></section>}
    {noProfile ? <section className="grant-stage"><div className="draft-stage-heading"><div><p className="eyebrow">Profile required</p><h2>Create or access a profile first.</h2><p>The care plan only shows profile-scoped data. Return to the overview to create a profile or request delegated access.</p></div></div></section> : <>
      <section className="pathway-selector"><div className="pathway-step"><span>01</span><div><p className="eyebrow">Active context</p><h2>Choose a profile and regimen</h2></div></div><div className="pathway-controls"><label>Profile<select value={profileId} onChange={(event) => void load(event.target.value, '')} disabled={state.phase === 'loading'}>{state.account?.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.preferredName}</option>)}</select></label><label>Regimen<select value={regimenId} onChange={(event) => void load(profileId, event.target.value)} disabled={!profileId || state.regimens.length === 0}>{state.regimens.length === 0 && <option value="">No submitted regimen</option>}{state.regimens.map((regimen) => <option key={regimen.id} value={regimen.id}>{regimen.medicationName}</option>)}</select></label><span className="read-only-chip"><ClipboardCheck size={15} /> {profileTimezone}</span></div></section>
      {!selectedRegimen ? <section className="grant-stage"><div className="draft-stage-heading"><div><p className="eyebrow">No regimen available</p><h2>Submit an explicit regimen from a medication draft.</h2><p>Automatic extraction can prepare editable drafts, but reminders, adherence, inventory, and refills begin only after a regimen is created through the prescription workspace.</p></div></div></section> : <>
        <section className="care-plan-grid">
          <article className="plan-panel plan-panel-emphasis"><div className="card-kicker"><span>02</span><p className="eyebrow">Explicit regimen</p></div><h2>{selectedRegimen.medicationName}</h2><p>{selectedRegimen.doseQuantity} {selectedRegimen.doseUnitCode} · {selectedRegimen.routeCode} · active from {selectedRegimen.startedOn}</p><div className="plan-chip-row">{selectedRegimen.schedules.map((schedule) => <span key={schedule.id}>{schedule.localTime} · every {schedule.intervalDays} day{schedule.intervalDays === 1 ? '' : 's'}</span>)}</div></article>
          <article className="plan-panel"><div className="card-kicker"><span>03</span><p className="eyebrow">Today’s adherence</p></div><h2>{state.adherence ? `${state.adherence.takenCount}/${state.adherence.scheduledCount}` : 'No outcome logged'}</h2><p>{state.streak ? `${state.streak.currentStreakDays} current-day streak · ${state.streak.longestStreakDays} longest` : 'Record a dose outcome to begin the adherence read model.'}</p><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => void runAction('Taken dose outcome', `profiles/${profileId}/regimens/${regimenId}/dose-logs`, 'POST', { scheduledFor: doseAt ? new Date(doseAt).toISOString() : new Date().toISOString(), status: 'taken' })} type="button"><CheckCircle2 size={16} /> {busy === 'Taken dose outcome' ? 'Saving…' : 'Record taken dose'}</button></article>
          <article className="plan-panel"><div className="card-kicker"><span>04</span><p className="eyebrow">Inventory & refill</p></div><h2>{state.inventory ? state.inventory.quantityOnHand : 'Not initialized'}</h2><p>{state.inventory?.refillThreshold ? `Refill threshold: ${state.inventory.refillThreshold}` : 'Initialize a threshold if this regimen should track refills.'}</p><div className="plan-form-row"><label>On hand<input inputMode="decimal" onChange={(event) => setInventoryQuantity(event.target.value)} value={inventoryQuantity} /></label><label>Threshold<input inputMode="decimal" onChange={(event) => setInventoryThreshold(event.target.value)} value={inventoryThreshold} /></label></div><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => void runAction('Inventory initialization', `profiles/${profileId}/regimens/${regimenId}/inventory`, 'PUT', { quantityOnHand: inventoryQuantity, ...(inventoryThreshold.trim() ? { refillThreshold: inventoryThreshold } : {}) })} type="button"><PackageCheck size={16} /> {busy === 'Inventory initialization' ? 'Saving…' : 'Initialize inventory'}</button></article>
        </section>
        <section className="care-plan-detail-grid">
          <article className="plan-panel"><div className="plan-panel-heading"><div><p className="eyebrow">Reminder policy</p><h2>Create an in-app reminder</h2></div><TimerReset size={20} /></div><p>Scheduling is explicit. The dispatcher materializes occurrences, delivers them into the in-app inbox, and emits an internal event. It does not send external push, SMS, or email in this environment.</p><div className="plan-form-row"><label>Regimen schedule<select value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}>{selectedRegimen.schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.localTime} · {schedule.timezone}</option>)}</select></label><button className="button button-primary" disabled={!scheduleId || Boolean(busy)} onClick={() => void runAction('In-app reminder', `profiles/${profileId}/regimens/${regimenId}/reminder-schedules`, 'POST', { regimenScheduleId: scheduleId, channel: 'in_app' })} type="button"><BellRing size={16} /> {busy === 'In-app reminder' ? 'Saving…' : 'Create reminder'}</button></div><ul className="plan-list">{state.reminderSchedules.length === 0 ? <li><CircleDashed size={16} /> No reminder policy has been created for this regimen.</li> : state.reminderSchedules.map((schedule) => <li key={schedule.id}><BellRing size={16} /><span>{schedule.channel === 'in_app' ? 'In-app' : 'Push'} policy · {schedule.status}</span><small>{schedule.defaultSnoozeMinutes}-minute default snooze</small></li>)}</ul></article>
          <article className="plan-panel"><div className="plan-panel-heading"><div><p className="eyebrow">Occurrence lifecycle</p><h2>Scheduled care signal</h2></div><Send size={20} /></div><p>Occurrences are bounded to the next seven days and become action-ready only after delivery.</p><ul className="plan-list">{state.occurrences.length === 0 ? <li><CircleDashed size={16} /> No materialized occurrence is available in this window yet.</li> : state.occurrences.map((occurrence) => <li key={occurrence.id}><span><strong>{occurrence.state}</strong><small>{displayTime(occurrence.scheduledFor)}</small></span>{(occurrence.state === 'delivered' || occurrence.state === 'snoozed') && <span className="plan-actions"><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => void runAction('Reminder snooze', `profiles/${profileId}/regimens/${regimenId}/reminder-occurrences/${occurrence.id}/snooze`, 'POST', { minutes: 10 })} type="button">Snooze</button><button className="button button-primary" disabled={Boolean(busy)} onClick={() => void runAction('Reminder acknowledgement', `profiles/${profileId}/regimens/${regimenId}/reminder-occurrences/${occurrence.id}/acknowledge`, 'POST')} type="button">Acknowledge</button></span>}</li>)}</ul>{activeOccurrence && <p className="care-boundary"><CheckCircle2 size={16} /> A delivered or snoozed occurrence can be acknowledged here. No external message is implied.</p>}</article>
        </section>
        <section className="care-plan-detail-grid">
          <article className="plan-panel"><div className="plan-panel-heading"><div><p className="eyebrow">In-app delivery</p><h2>Reminder inbox</h2></div><BellRing size={20} /></div><p>These durable records are observable in the signed-in companion. They contain lifecycle identifiers and timestamps, not a prescription transcription or external provider receipt.</p><ul className="plan-list">{state.notifications.length === 0 ? <li><CircleDashed size={16} /> No delivered in-app reminder record is available yet.</li> : state.notifications.map((notification) => <li key={notification.id}><BellRing size={16} /><span><strong>{notification.kind === 'reminder_due' ? 'Reminder due' : notification.kind}</strong><small>{displayTime(notification.createdAt)}</small></span><small>{notification.status}</small></li>)}</ul></article>
          <article className="plan-panel"><div className="plan-panel-heading"><div><p className="eyebrow">Refill ledger</p><h2>Inventory movements</h2></div><PackageCheck size={20} /></div><p>Inventory is changed only by an explicit initialization, dose outcome, or refill command. The movement log exposes the aggregate ledger state.</p><div className="plan-form-row"><label>Quantity added<input inputMode="decimal" onChange={(event) => setRefillQuantity(event.target.value)} value={refillQuantity} /></label><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => void runAction('Refill record', `profiles/${profileId}/regimens/${regimenId}/inventory/refills`, 'POST', { quantityAdded: refillQuantity })} type="button"><PackageCheck size={16} /> {busy === 'Refill record' ? 'Saving…' : 'Record refill'}</button></div><label className="visually-available">Dose time (optional)<input type="datetime-local" onChange={(event) => setDoseAt(event.target.value)} value={doseAt} /></label>{openRefillAlert && <div className="care-boundary"><AlertTriangle size={16} /><span>Refill threshold alert is open.</span><button className="button button-secondary" disabled={Boolean(busy)} onClick={() => void runAction('Refill alert acknowledgement', `profiles/${profileId}/regimens/${regimenId}/inventory/refill-alerts/${openRefillAlert.id}/acknowledge`, 'POST')} type="button">Acknowledge</button></div>}<ul className="plan-list">{state.movements.length === 0 ? <li><CircleDashed size={16} /> No inventory movement is available yet.</li> : state.movements.map((movement) => <li key={movement.id}><span><strong>{movement.kind.replace('_', ' ')}</strong><small>{displayTime(movement.occurredAt)}</small></span><small>{movement.quantityDelta}</small></li>)}</ul></article>
        </section>
      </>}
    </>}
  </section></AppShell>;
}
