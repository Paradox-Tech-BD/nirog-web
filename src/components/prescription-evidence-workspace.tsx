/**
 * Design system: "Care pathway" — a calm, state-forward clinical workspace.
 * Every card answers one question: where is the prescription, what happened,
 * and which deliberate user action is allowed next. No decorative medical
 * imagery, no caregiver approval gate, and no implied clinical commitment.
 */
'use client';

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FileCheck2,
  FileUp,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UsersRound,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import { ProfileCreationForm } from '@/components/profile-creation-form';
import type { AccountProjection } from '@/lib/core-api';
import {
  coreMessage,
  newestEvidence,
  readCore,
  type EvidenceSummary,
  type ExtractionSummary,
  type MedicationDraftSummary,
  type ProfileAccessContext,
  type PrescriptionSummary,
  type ProfileGrantSummary,
} from '@/lib/core-read-model';
import { formatEvidenceBytes, validateEvidenceFile } from '@/lib/evidence-upload';
import { isEvidenceFileControlDisabled, shouldShowNoProfileOnboarding } from '@/lib/evidence-workspace-state';
import { buildMedicationDraftCorrection } from '@/lib/medication-draft-payload';

type DraftForm = {
  medicationName: string;
  doseQuantity: string;
  doseUnitCode: string;
  routeCode: string;
  frequencyText: string;
  scheduleTimes: string;
  intervalDays: string;
  startedOn: string;
};

type WorkspaceData = {
  account: AccountProjection | null;
  profileId: string;
  accessContext: ProfileAccessContext | null;
  prescriptionId: string;
  prescriptions: PrescriptionSummary[];
  evidence: EvidenceSummary[];
  extractions: ExtractionSummary[];
  drafts: MedicationDraftSummary[];
  grants: ProfileGrantSummary[];
  notices: string[];
};

type ViewState =
  | { phase: 'loading'; data: WorkspaceData | null }
  | { phase: 'ready'; data: WorkspaceData; refreshing: boolean }
  | { phase: 'error'; data: WorkspaceData | null; message: string };

type UploadState = {
  status: 'idle' | 'ready' | 'authorizing' | 'transferring' | 'queueing' | 'complete' | 'error';
  file?: File;
  message?: string;
};

type DraftAction = { draftId: string; status: 'saving' | 'submitted' | 'error'; message?: string } | null;

const confidenceThreshold = 0.7;
const idempotencyKey = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

function emptyData(): WorkspaceData {
  return {
    account: null,
    profileId: '',
    accessContext: null,
    prescriptionId: '',
    prescriptions: [],
    evidence: [],
    extractions: [],
    drafts: [],
    grants: [],
    notices: [],
  };
}

function formFromDraft(draft: MedicationDraftSummary): DraftForm {
  return {
    medicationName: draft.medicationName ?? '',
    doseQuantity: draft.doseQuantity ?? '',
    doseUnitCode: draft.doseUnitCode ?? 'mg',
    routeCode: draft.routeCode ?? 'oral',
    frequencyText: draft.frequencyText ?? '',
    scheduleTimes: draft.scheduleTimes.join(', '),
    intervalDays: String(draft.intervalDays || 1),
    startedOn: today(),
  };
}

function requiresCorrection(draft: MedicationDraftSummary): boolean {
  return !draft.medicationName || !draft.doseQuantity || !draft.doseUnitCode || !draft.routeCode || !draft.frequencyText || draft.scheduleTimes.length === 0 ||
    [draft.medicationNameConfidence, draft.doseConfidence, draft.routeConfidence, draft.frequencyConfidence].some((value) => value === undefined || value < confidenceThreshold);
}

function formatConfidence(value: number | undefined): string {
  return value === undefined ? 'Not read' : `${Math.round(value * 100)}%`;
}

function labelForStatus(value: string): string {
  return value.replaceAll('_', ' ');
}

function accessLabel(grant: ProfileGrantSummary): string {
  if (grant.roleCode === 'caregiver') return 'Caregiver access';
  if (grant.roleCode === 'curator') return 'Curator access';
  return 'Viewer access';
}

function hasOwnerOrPermission(accessContext: ProfileAccessContext | null, permission: string): boolean {
  return accessContext?.accessKind === 'owner' || accessContext?.permissions.includes(permission) === true;
}

export function PrescriptionEvidenceWorkspace() {
  const [view, setView] = useState<ViewState>({ phase: 'loading', data: null });
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [draftForms, setDraftForms] = useState<Record<string, DraftForm>>({});
  const [draftAction, setDraftAction] = useState<DraftAction>(null);

  const refresh = useCallback(async (requestedProfileId = '', requestedPrescriptionId = '') => {
    setView((current) => current.data ? { phase: 'ready', data: current.data, refreshing: true } : { phase: 'loading', data: null });

    try {
      const account = await readCore<AccountProjection>('me');
      const profileId = requestedProfileId || account.profiles[0]?.id || '';
      if (!profileId) {
        setView({ phase: 'ready', refreshing: false, data: { ...emptyData(), account } });
        return;
      }

      const accessContext = await readCore<ProfileAccessContext>(`profiles/${profileId}/access-context`);
      const canManageShares = accessContext.permissions.includes('share.manage');
      const prescriptions = await readCore<PrescriptionSummary[]>(`profiles/${profileId}/prescriptions`);
      const prescriptionId = requestedPrescriptionId || prescriptions[0]?.id || '';
      if (!prescriptionId) {
        const grantResult = canManageShares
          ? await Promise.allSettled([readCore<ProfileGrantSummary[]>(`profiles/${profileId}/access-grants`)])
          : [];
        const grants = grantResult[0]?.status === 'fulfilled' ? grantResult[0].value : [];
        const notices = grantResult[0]?.status === 'rejected'
          ? ['Care-circle access information is temporarily unavailable. Prescription access is unaffected.']
          : [];
        setView({ phase: 'ready', refreshing: false, data: { ...emptyData(), account, profileId, accessContext, prescriptions, grants, notices } });
        return;
      }

      const evidence = await readCore<EvidenceSummary[]>(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence`);
      const latestEvidence = newestEvidence(evidence);
      const grantPromise: Promise<ProfileGrantSummary[]> = canManageShares
        ? readCore<ProfileGrantSummary[]>(`profiles/${profileId}/access-grants`)
        : Promise.resolve([]);
      const [grantResult, extractionResult, draftResult] = await Promise.allSettled([
        grantPromise,
        latestEvidence ? readCore<ExtractionSummary[]>(`profiles/${profileId}/evidence/${latestEvidence.id}/ocr-extractions`) : Promise.resolve([]),
        latestEvidence ? readCore<MedicationDraftSummary[]>(`profiles/${profileId}/evidence/${latestEvidence.id}/medication-drafts`) : Promise.resolve([]),
      ] as const);

      const notices: string[] = [];
      const grants = grantResult.status === 'fulfilled' ? grantResult.value : [];
      const extractions = extractionResult.status === 'fulfilled' ? extractionResult.value : [];
      const drafts = draftResult.status === 'fulfilled' ? draftResult.value : [];
      if (canManageShares && grantResult.status === 'rejected') notices.push('Care-circle access information could not be refreshed. Evidence processing remains available.');
      if (extractionResult.status === 'rejected') notices.push('Extraction status could not be refreshed yet. Try again shortly.');
      if (draftResult.status === 'rejected') notices.push('Medication drafts could not be refreshed yet. Your evidence record remains unchanged.');

      setDraftForms((current) => Object.fromEntries(drafts.map((draft) => [draft.id, current[draft.id] ?? formFromDraft(draft)])));
      setView({
        phase: 'ready',
        refreshing: false,
        data: { account, profileId, accessContext, prescriptionId, prescriptions, evidence, extractions, drafts, grants, notices },
      });
    } catch (error) {
      setView((current) => ({
        phase: 'error',
        data: current.data,
        message: coreMessage(error, 'Nirog could not load this care record. No data was changed.'),
      }));
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const data = view.data ?? emptyData();
  const hasProcessingEvidence = data.evidence.some((item) => item.status === 'processing');
  useEffect(() => {
    if (!hasProcessingEvidence || !data.profileId || !data.prescriptionId) return;
    const timer = window.setTimeout(() => void refresh(data.profileId, data.prescriptionId), 5_000);
    return () => window.clearTimeout(timer);
  }, [data.prescriptionId, data.profileId, hasProcessingEvidence, refresh]);

  const selectProfile = (nextProfileId: string) => {
    setUpload({ status: 'idle' });
    void refresh(nextProfileId, '');
  };

  const selectPrescription = (nextPrescriptionId: string) => {
    setUpload({ status: 'idle' });
    void refresh(data.profileId, nextPrescriptionId);
  };

  const createPrescription = async () => {
    if (!data.profileId || !hasOwnerOrPermission(data.accessContext, 'document.create')) return;
    try {
      const created = await readCore<{ id: string }>(`profiles/${data.profileId}/prescriptions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() },
        body: '{}',
      });
      setUpload({ status: 'idle' });
      await refresh(data.profileId, created.id);
    } catch (error) {
      setUpload({ status: 'error', message: coreMessage(error, 'A prescription container could not be created.') });
    }
  };

  const selectFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateEvidenceFile(file);
    setUpload(validationError ? { status: 'error', file, message: validationError } : { status: 'ready', file, message: 'File checked. You can begin automatic extraction.' });
  };

  const uploadEvidence = async () => {
    const file = upload.file;
    if (!file || !data.profileId || !data.prescriptionId || !hasOwnerOrPermission(data.accessContext, 'document.create')) return;
    const validationError = validateEvidenceFile(file);
    if (validationError) {
      setUpload({ status: 'error', file, message: validationError });
      return;
    }
    try {
      setUpload({ status: 'authorizing', file, message: 'Preparing a secure, time-limited upload…' });
      const authorization = await readCore<{ evidence: EvidenceSummary; uploadUrl: string }>(`profiles/${data.profileId}/prescriptions/${data.prescriptionId}/evidence/uploads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() },
        body: JSON.stringify({ contentType: file.type, declaredSizeBytes: file.size }),
      });
      setUpload({ status: 'transferring', file, message: 'Uploading the selected prescription…' });
      const uploadResponse = await fetch(authorization.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!uploadResponse.ok) throw new Error('The secure file upload was not accepted. The care record was not changed.');
      setUpload({ status: 'queueing', file, message: 'Queueing automatic extraction and editable draft preparation…' });
      await readCore<{ ocrJobId: string }>(`profiles/${data.profileId}/prescriptions/${data.prescriptionId}/evidence/${authorization.evidence.id}/complete`, {
        method: 'POST',
        headers: { 'idempotency-key': idempotencyKey() },
      });
      setUpload({ status: 'complete', file, message: 'Prescription received. Nirog is preparing editable medication drafts automatically.' });
      await refresh(data.profileId, data.prescriptionId);
    } catch (error) {
      setUpload({ status: 'error', file, message: coreMessage(error, 'The prescription could not be uploaded. Your existing care record was not changed.') });
    }
  };

  const updateDraft = (draftId: string, key: keyof DraftForm, value: string) => {
    if (!hasOwnerOrPermission(data.accessContext, 'regimen.write')) return;
    setDraftForms((current) => ({ ...current, [draftId]: { ...current[draftId], [key]: value } }));
  };

  const submitDraft = async (draft: MedicationDraftSummary) => {
    const form = draftForms[draft.id];
    if (!form || !data.profileId || !hasOwnerOrPermission(data.accessContext, 'regimen.write')) return;
    const scheduleTimes = form.scheduleTimes.split(',').map((time) => time.trim()).filter(Boolean);
    const intervalDays = Number(form.intervalDays);
    if (!form.medicationName || !form.doseQuantity || !form.doseUnitCode || !form.routeCode || !form.frequencyText || !scheduleTimes.length || !Number.isInteger(intervalDays)) {
      setDraftAction({ draftId: draft.id, status: 'error', message: 'Complete the medication, dose, route, frequency, and at least one HH:MM schedule time.' });
      return;
    }
    try {
      setDraftAction({ draftId: draft.id, status: 'saving' });
      await readCore<MedicationDraftSummary>(`profiles/${data.profileId}/medication-drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() },
        body: JSON.stringify(buildMedicationDraftCorrection({
          medicationName: form.medicationName,
          doseQuantity: form.doseQuantity,
          doseUnitCode: form.doseUnitCode,
          routeCode: form.routeCode,
          frequencyText: form.frequencyText,
          scheduleTimes,
          intervalDays,
        })),
      });
      const timezone = data.account?.profiles.find((profile) => profile.id === data.profileId)?.timezone ?? 'UTC';
      const regimen = await readCore<{ id: string }>(`profiles/${data.profileId}/regimens`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() },
        body: JSON.stringify({
          prescriptionId: draft.prescriptionId,
          medicationName: form.medicationName,
          doseQuantity: form.doseQuantity,
          doseUnitCode: form.doseUnitCode,
          routeCode: form.routeCode,
          startedOn: form.startedOn,
          schedules: scheduleTimes.map((localTime) => ({ timezone, localTime, intervalDays })),
        }),
      });
      await readCore<MedicationDraftSummary>(`profiles/${data.profileId}/medication-drafts/${draft.id}/submitted`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() },
        body: JSON.stringify({ regimenId: regimen.id }),
      });
      setDraftAction({ draftId: draft.id, status: 'submitted', message: 'Medication regimen saved from your confirmed draft.' });
      await refresh(data.profileId, data.prescriptionId);
    } catch (error) {
      setDraftAction({ draftId: draft.id, status: 'error', message: coreMessage(error, 'The draft could not be submitted. No new regimen was created by this attempt.') });
    }
  };

  const uploadBusy = ['authorizing', 'transferring', 'queueing'].includes(upload.status);
  const canCreateDocuments = hasOwnerOrPermission(data.accessContext, 'document.create');
  const canWriteRegimen = hasOwnerOrPermission(data.accessContext, 'regimen.write');
  const canManageShares = data.accessContext?.permissions.includes('share.manage') ?? false;
  const fileControlDisabled = isEvidenceFileControlDisabled({
    phase: view.phase,
    profileId: data.profileId,
    prescriptionId: data.prescriptionId,
    canCreateDocuments,
    uploadBusy,
  });
  const showNoProfileOnboarding = shouldShowNoProfileOnboarding({
    phase: view.phase,
    hasAccount: Boolean(data.account),
    profileCount: data.account?.profiles.length ?? 0,
    profileId: data.profileId,
  });
  const activeGrants = data.grants.filter((grant) => grant.status === 'active');
  const latestEvidence = newestEvidence(data.evidence);

  return (
    <AppShell>
      <section className="evidence-page care-pathway">
        <header className="evidence-hero">
          <div className="evidence-hero-copy">
            <p className="eyebrow">Prescription workspace</p>
            <h1>See the prescription journey, not a blank screen.</h1>
            <p>Upload securely, follow automatic extraction, and review confidence-scored medication drafts before any regimen is created by an explicit authorized action.</p>
          </div>
          <div className="evidence-hero-actions">
            <span className={view.phase === 'ready' && !view.refreshing ? 'live-status ready' : 'live-status'}><CircleDashed size={15} /> {view.phase === 'ready' && !view.refreshing ? 'Live care record' : 'Refreshing record'}</span>
            <button className="button button-secondary" disabled={view.phase === 'loading'} onClick={() => void refresh(data.profileId, data.prescriptionId)} type="button"><RefreshCw className={view.phase === 'loading' || (view.phase === 'ready' && view.refreshing) ? 'spin' : undefined} size={16} /> Refresh</button>
          </div>
        </header>

        {view.phase === 'error' && <section className="workflow-banner workflow-banner-error" role="alert"><AlertTriangle size={19} /><div><strong>We could not refresh every part of this workspace.</strong><p>{view.message}</p></div><button className="button button-secondary" onClick={() => void refresh(data.profileId, data.prescriptionId)} type="button">Try again</button></section>}
        {data.notices.map((notice) => <section className="workflow-banner" key={notice}><AlertTriangle size={18} /><p>{notice}</p></section>)}

        <section className="pathway-selector" aria-label="Prescription context">
          <div className="pathway-step"><span>01</span><div><p className="eyebrow">Care context</p><h2>Choose the profile and prescription</h2></div></div>
          <div className="pathway-controls">
            <label>Profile<select value={data.profileId} onChange={(event) => selectProfile(event.target.value)} disabled={view.phase === 'loading'}><option value="">Select a profile</option>{data.account?.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.preferredName}</option>)}</select></label>
            <label>Prescription<select value={data.prescriptionId} onChange={(event) => selectPrescription(event.target.value)} disabled={!data.profileId || view.phase === 'loading'}><option value="">Select a prescription</option>{data.prescriptions.map((prescription, index) => <option value={prescription.id} key={prescription.id}>{prescription.prescriberLabel ?? `Prescription ${index + 1}`}</option>)}</select></label>
            <button className="button button-secondary" disabled={!data.profileId || !canCreateDocuments || view.phase === 'loading' || uploadBusy} onClick={() => void createPrescription()} type="button">New prescription</button>
          </div>
        </section>

        {showNoProfileOnboarding && data.account && (
          <section className="profile-onboarding-panel" aria-labelledby="create-profile-heading">
            <div>
              <p className="eyebrow">Start here</p>
              <h2 id="create-profile-heading">Create your patient profile before adding a prescription.</h2>
              <p>A profile establishes the Core-authorized care context for prescription containers, evidence, and any later review. Creating one does not add medication or make a clinical decision.</p>
            </div>
            <ProfileCreationForm defaultTimezone={data.account.preferences.timezone} onCreated={() => void refresh()} />
          </section>
        )}

        <section className="journey-grid">
          <article className="journey-card journey-upload">
            <div className="card-kicker"><span>02</span><p className="eyebrow">Secure intake</p></div>
            <h2>Add a prescription file</h2>
            <p>{canCreateDocuments ? 'JPEG, PNG, WebP, or PDF, up to 10 MB. Extraction begins automatically after the protected upload completes.' : 'This delegated session can inspect the authorized record, but cannot add files or create prescription containers.'}</p>
            <div className="upload-tray">
              <span className="upload-icon">{upload.status === 'complete' ? <FileCheck2 size={22} /> : <FileUp size={22} />}</span>
              <div><strong>{upload.file ? upload.file.name : 'No file selected'}</strong><p>{upload.file ? `${formatEvidenceBytes(upload.file.size)} · ${upload.file.type}` : fileControlDisabled ? 'Choose a profile and prescription first.' : 'Choose a file to begin.'}</p></div>
              {canCreateDocuments ? <label className="file-picker"><span>{upload.file ? 'Replace file' : 'Choose file'}</span><input aria-label="Choose prescription evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={fileControlDisabled} onChange={(event) => selectFile(event.target.files?.[0])} /></label> : <span className="read-only-chip"><ShieldCheck size={15} /> Read-only access</span>}
            </div>
            {canCreateDocuments && <button className="button button-primary upload-cta" disabled={upload.status !== 'ready' || uploadBusy} onClick={() => void uploadEvidence()} type="button">{uploadBusy ? <><LoaderCircle className="spin" size={16} /> Working securely</> : <><UploadCloud size={16} /> Start automatic extraction</>}</button>}
            {upload.status !== 'idle' && <p className={upload.status === 'error' ? 'upload-feedback is-error' : 'upload-feedback'} role={upload.status === 'error' ? 'alert' : 'status'}>{uploadBusy ? <LoaderCircle className="spin" size={16} /> : upload.status === 'complete' ? <CheckCircle2 size={16} /> : null}{upload.message ?? 'File ready for automatic extraction.'}</p>}
          </article>

          <article className="journey-card journey-status">
            <div className="card-kicker"><span>03</span><p className="eyebrow">Automatic processing</p></div>
            <h2>Prescription status</h2>
            {view.phase === 'loading' ? <LoadingLine label="Loading the profile-scoped record…" /> : !latestEvidence ? <EmptyLine label="No file has been attached to this prescription." /> : <div className="status-timeline"><div><span className="timeline-dot complete" /><div><strong>File received</strong><p>{latestEvidence.contentType} · {formatEvidenceBytes(latestEvidence.declaredSizeBytes)}</p></div></div><div><span className={latestEvidence.status === 'processing' ? 'timeline-dot working' : 'timeline-dot complete'} /><div><strong>{labelForStatus(latestEvidence.status)}</strong><p>{latestEvidence.status === 'processing' ? 'Nirog refreshes this status automatically.' : 'The evidence record is available to the authorized profile.'}</p></div></div><div><span className={data.extractions.length ? 'timeline-dot complete' : 'timeline-dot waiting'} /><div><strong>{data.extractions.length ? 'Extraction reported' : 'Draft preparation'}</strong><p>{data.extractions.length ? `${data.extractions[0]?.candidateCount ?? 0} candidate${data.extractions[0]?.candidateCount === 1 ? '' : 's'} recorded.` : 'Waiting for the next extraction update.'}</p></div></div></div>}
          </article>
        </section>

        <section className="journey-grid journey-grid-secondary">
          <article className="journey-card provenance-card">
            <div className="card-kicker"><span>04</span><p className="eyebrow">Processing record</p></div>
            <h2>Extraction provenance</h2>
            {view.phase === 'loading' ? <LoadingLine label="Loading processing status…" /> : data.extractions.length === 0 ? <EmptyLine label="No extraction result is ready yet. This card will update automatically." /> : <ul className="evidence-list compact-list">{data.extractions.map((item) => <li key={item.id}><strong>{labelForStatus(item.status)}</strong><span>{item.resultSource === 'ml' ? `${item.candidateCount} medication candidate${item.candidateCount === 1 ? '' : 's'} · automated processor` : 'Controlled fixture provenance'}</span></li>)}</ul>}
          </article>

          <article className="journey-card care-circle-card">
            <div className="card-kicker"><span>05</span><p className="eyebrow">Care-circle access</p></div>
            <h2>Authorized people, visible boundaries</h2>
            {view.phase === 'loading' ? <LoadingLine label="Loading authorized access…" /> : data.accessContext?.accessKind === 'owner' ? <p className="state-line state-line-empty"><ShieldCheck size={17} /> You are viewing your own profile. Care-circle permissions remain scoped to the active care context.</p> : !canManageShares && data.accessContext ? <p className="state-line state-line-empty"><ShieldCheck size={17} /> Your delegated relationship is active. Full grant-roster management is limited to authorized managers.</p> : activeGrants.length === 0 ? <EmptyLine label="No additional active profile grants are recorded for this care context." /> : <ul className="grant-list">{activeGrants.map((grant) => <li key={grant.id}><span className="grant-icon"><UsersRound size={16} /></span><div><strong>{accessLabel(grant)}</strong><p>{grant.permissions.length} permission{grant.permissions.length === 1 ? '' : 's'} · {grant.expiresAt ? 'time-limited access' : 'active access'}</p></div><span className="status-chip">Active</span></li>)}</ul>}
            <p className="care-boundary"><ShieldCheck size={15} /> Caregivers can inspect access, provenance, and draft status. They do not block extraction and do not receive regimen-write by default.</p>
          </article>
        </section>

        <section className="draft-stage">
          <div className="draft-stage-heading"><div><p className="eyebrow">06 · {canWriteRegimen ? 'Editable draft' : 'Draft status'}</p><h2>{canWriteRegimen ? 'Confirm the auto-populated medication draft' : 'Inspect the automatic draft status'}</h2><p>{canWriteRegimen ? 'Fields meeting the 70% confidence threshold can populate automatically. Missing or uncertain values remain visibly editable for the patient or an authorized caregiver.' : 'This delegated session can inspect authorized extraction provenance, confidence, and draft state. Clinical fields and regimen confirmation remain unavailable without explicit regimen-write authority.'}</p></div><span>{data.drafts.length} draft{data.drafts.length === 1 ? '' : 's'}</span></div>
          {view.phase === 'loading' ? <LoadingLine label="Loading medication drafts…" /> : data.drafts.length === 0 ? <EmptyLine label="An editable draft will appear here when automatic extraction is complete." /> : <div className="draft-list">{data.drafts.map((draft) => {
            if (!canWriteRegimen) return <ReadOnlyMedicationDraftSummary draft={draft} key={draft.id} />;
            const form = draftForms[draft.id] ?? formFromDraft(draft);
            const correctionNeeded = requiresCorrection(draft);
            const action = draftAction?.draftId === draft.id ? draftAction : null;
            return <article className="medication-draft-card" key={draft.id}><header><div><span className={correctionNeeded ? 'draft-status needs-correction' : 'draft-status ready'}>{correctionNeeded ? <AlertTriangle size={15} /> : <Sparkles size={15} />}{correctionNeeded ? 'Needs your confirmation' : 'High-confidence fields populated'}</span><h3>Medication candidate {draft.candidateIndex + 1}</h3></div><span className="draft-provenance">Automatic extraction · 70% threshold</span></header><div className="confidence-grid"><span>Name {formatConfidence(draft.medicationNameConfidence)}</span><span>Dose {formatConfidence(draft.doseConfidence)}</span><span>Route {formatConfidence(draft.routeConfidence)}</span><span>Frequency {formatConfidence(draft.frequencyConfidence)}</span></div><div className="draft-form-grid"><label>Medication name<input value={form.medicationName} onChange={(event) => updateDraft(draft.id, 'medicationName', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Dose quantity<input value={form.doseQuantity} onChange={(event) => updateDraft(draft.id, 'doseQuantity', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Dose unit<select value={form.doseUnitCode} onChange={(event) => updateDraft(draft.id, 'doseUnitCode', event.target.value)} disabled={draft.status === 'submitted'}>{['mg', 'mcg', 'ml', 'tablet', 'capsule', 'drop', 'puff', 'unit'].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label><label>Route<select value={form.routeCode} onChange={(event) => updateDraft(draft.id, 'routeCode', event.target.value)} disabled={draft.status === 'submitted'}>{['oral', 'topical', 'inhaled', 'injection', 'other'].map((route) => <option key={route} value={route}>{route}</option>)}</select></label><label className="draft-wide">Frequency text<input value={form.frequencyText} onChange={(event) => updateDraft(draft.id, 'frequencyText', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Times (HH:MM, comma-separated)<input value={form.scheduleTimes} onChange={(event) => updateDraft(draft.id, 'scheduleTimes', event.target.value)} placeholder="08:00, 20:00" disabled={draft.status === 'submitted'} /></label><label>Every how many days<input type="number" min="1" max="365" value={form.intervalDays} onChange={(event) => updateDraft(draft.id, 'intervalDays', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Start date<input type="date" value={form.startedOn} onChange={(event) => updateDraft(draft.id, 'startedOn', event.target.value)} disabled={draft.status === 'submitted'} /></label></div>{action?.message && <p className={action.status === 'error' ? 'upload-feedback is-error' : 'upload-feedback'} role={action.status === 'error' ? 'alert' : 'status'}>{action.status === 'saving' ? <LoaderCircle className="spin" size={16} /> : action.status === 'submitted' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{action.message}</p>}{draft.status === 'submitted' ? <p className="care-boundary"><CheckCircle2 size={16} /> Submitted through an explicit authorized regimen action.</p> : <button className="button button-primary" disabled={action?.status === 'saving'} onClick={() => void submitDraft(draft)} type="button"><PencilLine size={16} /> Confirm and save medication regimen <ArrowRight size={16} /></button>}</article>;
          })}</div>}
        </section>
      </section>
    </AppShell>
  );
}

function LoadingLine({ label }: { label: string }) {
  return <p className="state-line"><LoaderCircle className="spin" size={17} /> {label}</p>;
}

function EmptyLine({ label }: { label: string }) {
  return <p className="state-line state-line-empty"><CircleDashed size={17} /> {label}</p>;
}

function ReadOnlyMedicationDraftSummary({ draft }: { draft: MedicationDraftSummary }) {
  const correctionNeeded = requiresCorrection(draft);
  return <article className="medication-draft-card read-only-draft-card"><header><div><span className={correctionNeeded ? 'draft-status needs-correction' : 'draft-status ready'}>{correctionNeeded ? <AlertTriangle size={15} /> : <Sparkles size={15} />}{correctionNeeded ? 'Correction may be needed' : 'High-confidence fields recorded'}</span><h3>Medication candidate {draft.candidateIndex + 1}</h3></div><span className="draft-provenance">Automatic extraction · read-only view</span></header><div className="confidence-grid"><span>Name {formatConfidence(draft.medicationNameConfidence)}</span><span>Dose {formatConfidence(draft.doseConfidence)}</span><span>Route {formatConfidence(draft.routeConfidence)}</span><span>Frequency {formatConfidence(draft.frequencyConfidence)}</span></div><p className="care-boundary"><ShieldCheck size={16} /> This caregiver session can inspect draft status but cannot edit clinical fields or confirm a medication regimen.</p></article>;
}
