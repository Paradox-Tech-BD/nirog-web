/* Nirog Care Ledger style: calm clinical evidence workflow with explicit provenance and user-controlled draft submission. */
'use client';

import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileUp,
  LoaderCircle,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import type { AccountProjection, CoreSuccess } from '@/lib/core-api';
import { formatEvidenceBytes, newestEvidenceId, validateEvidenceFile } from '@/lib/evidence-upload';

type Prescription = { id: string; status: 'active' | 'archived'; prescriberLabel?: string; issuedOn?: string; createdAt: string };
type Evidence = { id: string; contentType: string; declaredSizeBytes: number; status: string; uploadAuthorizedAt?: string; uploadedAt?: string; processedAt?: string };
type Extraction = { id: string; status: string; resultSource: 'demo' | 'ml'; demoFixtureId?: string; modelName?: string; pipelineVersion?: string; candidateCount: number };
type MedicationDraft = {
  id: string; profileId: string; prescriptionId: string; evidenceId: string; extractionId: string; candidateIndex: number;
  status: 'ready' | 'needs_correction' | 'submitted' | 'superseded'; medicationName?: string; medicationNameConfidence?: number;
  doseQuantity?: string; doseUnitCode?: string; doseConfidence?: number; routeCode?: string; routeConfidence?: number;
  frequencyText?: string; frequencyConfidence?: number; scheduleTimes: string[]; intervalDays: number; submittedRegimenId?: string;
};
type DraftForm = { medicationName: string; doseQuantity: string; doseUnitCode: string; routeCode: string; frequencyText: string; scheduleTimes: string; intervalDays: string; startedOn: string };
type State = { profiles: AccountProjection['profiles']; prescriptions: Prescription[]; evidence: Evidence[]; extractions: Extraction[]; drafts: MedicationDraft[]; loading: boolean; error?: string };
type UploadState = { status: 'idle' | 'ready' | 'authorizing' | 'transferring' | 'queueing' | 'complete' | 'error'; file?: File; message?: string; jobId?: string };
type DraftAction = { draftId: string; status: 'saving' | 'submitted' | 'error'; message?: string } | null;

const confidenceThreshold = 0.7;
const idempotencyKey = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);

async function core<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/${path}`, { cache: 'no-store', ...init });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(typeof payload === 'object' && payload && 'title' in payload ? String(payload.title) : 'Nirog Core request failed.');
  return (payload as CoreSuccess<T>).data;
}

function formFromDraft(draft: MedicationDraft): DraftForm {
  return {
    medicationName: draft.medicationName ?? '', doseQuantity: draft.doseQuantity ?? '', doseUnitCode: draft.doseUnitCode ?? 'mg',
    routeCode: draft.routeCode ?? 'oral', frequencyText: draft.frequencyText ?? '', scheduleTimes: draft.scheduleTimes.join(', '),
    intervalDays: String(draft.intervalDays || 1), startedOn: today(),
  };
}

function requiresCorrection(draft: MedicationDraft): boolean {
  return !draft.medicationName || !draft.doseQuantity || !draft.doseUnitCode || !draft.routeCode || !draft.frequencyText || draft.scheduleTimes.length === 0 ||
    [draft.medicationNameConfidence, draft.doseConfidence, draft.routeConfidence, draft.frequencyConfidence].some((value) => value === undefined || value < confidenceThreshold);
}

function formatConfidence(value: number | undefined): string {
  return value === undefined ? 'Not read' : `${Math.round(value * 100)}%`;
}

export function PrescriptionEvidenceWorkspace() {
  const [state, setState] = useState<State>({ profiles: [], prescriptions: [], evidence: [], extractions: [], drafts: [], loading: true });
  const [profileId, setProfileId] = useState('');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [draftForms, setDraftForms] = useState<Record<string, DraftForm>>({});
  const [draftAction, setDraftAction] = useState<DraftAction>(null);

  const load = useCallback(async (nextProfileId = profileId, nextPrescriptionId = prescriptionId) => {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const me = await core<AccountProjection>('me');
      const resolvedProfileId = nextProfileId || me.profiles[0]?.id || '';
      const prescriptions = resolvedProfileId ? await core<Prescription[]>(`profiles/${resolvedProfileId}/prescriptions`) : [];
      const resolvedPrescriptionId = nextPrescriptionId || prescriptions[0]?.id || '';
      const evidence = resolvedProfileId && resolvedPrescriptionId ? await core<Evidence[]>(`profiles/${resolvedProfileId}/prescriptions/${resolvedPrescriptionId}/evidence`) : [];
      const newestEvidence = newestEvidenceId(evidence);
      const [extractions, drafts] = resolvedProfileId && newestEvidence
        ? await Promise.all([
            core<Extraction[]>(`profiles/${resolvedProfileId}/evidence/${newestEvidence}/ocr-extractions`),
            core<MedicationDraft[]>(`profiles/${resolvedProfileId}/evidence/${newestEvidence}/medication-drafts`),
          ])
        : [[], []];
      setProfileId(resolvedProfileId); setPrescriptionId(resolvedPrescriptionId);
      setDraftForms((current) => Object.fromEntries(drafts.map((draft) => [draft.id, current[draft.id] ?? formFromDraft(draft)])));
      setState({ profiles: me.profiles, prescriptions, evidence, extractions, drafts, loading: false });
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'Nirog Core request failed.' })); }
  }, [profileId, prescriptionId]);

  useEffect(() => { void load(); }, [load]);

  const hasProcessingEvidence = state.evidence.some((item) => item.status === 'processing');
  useEffect(() => {
    if (!hasProcessingEvidence || !profileId || !prescriptionId) return;
    let cancelled = false; let timer: number | undefined;
    const poll = async () => { await load(profileId, prescriptionId); if (!cancelled) timer = window.setTimeout(() => { void poll(); }, 5_000); };
    timer = window.setTimeout(() => { void poll(); }, 5_000);
    return () => { cancelled = true; if (timer !== undefined) window.clearTimeout(timer); };
  }, [hasProcessingEvidence, load, prescriptionId, profileId]);

  const createPrescription = async () => {
    if (!profileId) return;
    const created = await core<{ id: string }>(`profiles/${profileId}/prescriptions`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: '{}' });
    setUpload({ status: 'idle' }); await load(profileId, created.id);
  };
  const selectFile = (file: File | undefined) => {
    if (!file) return;
    const validationError = validateEvidenceFile(file);
    setUpload(validationError ? { status: 'error', file, message: validationError } : { status: 'ready', file });
  };
  const uploadEvidence = async () => {
    const file = upload.file;
    if (!file || !profileId || !prescriptionId) return;
    const validationError = validateEvidenceFile(file);
    if (validationError) { setUpload({ status: 'error', file, message: validationError }); return; }
    try {
      setUpload({ status: 'authorizing', file, message: 'Authorizing a secure, time-limited upload…' });
      const authorization = await core<{ evidence: Evidence; uploadUrl: string }>(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/uploads`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: JSON.stringify({ contentType: file.type, declaredSizeBytes: file.size }) });
      setUpload({ status: 'transferring', file, message: 'Uploading the selected prescription file…' });
      const uploadResponse = await fetch(authorization.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!uploadResponse.ok) throw new Error('The secure evidence upload was not accepted. Your selected file has not been added to the care record.');
      setUpload({ status: 'queueing', file, message: 'Registering the upload and queueing medication extraction…' });
      const queued = await core<{ ocrJobId: string }>(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/${authorization.evidence.id}/complete`, { method: 'POST', headers: { 'idempotency-key': idempotencyKey() } });
      setUpload({ status: 'complete', file, jobId: queued.ocrJobId, message: 'Evidence uploaded. Nirog is preparing an editable medication draft.' });
      await load(profileId, prescriptionId);
    } catch (error) { setUpload({ status: 'error', file, message: error instanceof Error ? error.message : 'Evidence upload failed. You can retry without changing the care record.' }); }
  };

  const updateDraft = (draftId: string, key: keyof DraftForm, value: string) => {
    setDraftForms((current) => ({ ...current, [draftId]: { ...current[draftId], [key]: value } }));
  };
  const submitDraft = async (draft: MedicationDraft) => {
    const form = draftForms[draft.id];
    if (!form || !profileId) return;
    const scheduleTimes = form.scheduleTimes.split(',').map((time) => time.trim()).filter(Boolean);
    const intervalDays = Number(form.intervalDays);
    if (!form.medicationName || !form.doseQuantity || !form.doseUnitCode || !form.routeCode || !form.frequencyText || !scheduleTimes.length || !Number.isInteger(intervalDays)) {
      setDraftAction({ draftId: draft.id, status: 'error', message: 'Complete the medication, dose, route, frequency, and at least one HH:MM schedule time.' }); return;
    }
    try {
      setDraftAction({ draftId: draft.id, status: 'saving' });
      await core<MedicationDraft>(`profiles/${profileId}/medication-drafts/${draft.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: JSON.stringify({ ...form, scheduleTimes, intervalDays }) });
      const profileTimezone = state.profiles.find((profile) => profile.id === profileId)?.timezone ?? 'UTC';
      const regimen = await core<{ id: string }>(`profiles/${profileId}/regimens`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: JSON.stringify({ prescriptionId: draft.prescriptionId, medicationName: form.medicationName, doseQuantity: form.doseQuantity, doseUnitCode: form.doseUnitCode, routeCode: form.routeCode, startedOn: form.startedOn, schedules: scheduleTimes.map((localTime) => ({ timezone: profileTimezone, localTime, intervalDays })) }) });
      await core<MedicationDraft>(`profiles/${profileId}/medication-drafts/${draft.id}/submitted`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: JSON.stringify({ regimenId: regimen.id }) });
      setDraftAction({ draftId: draft.id, status: 'submitted', message: 'Medication regimen saved from the confirmed draft.' });
      await load(profileId, prescriptionId);
    } catch (error) { setDraftAction({ draftId: draft.id, status: 'error', message: error instanceof Error ? error.message : 'The draft could not be submitted. No new regimen was created by this attempt.' }); }
  };

  const uploadBusy = ['authorizing', 'transferring', 'queueing'].includes(upload.status);
  const fileControlDisabled = !prescriptionId || uploadBusy;
  return <AppShell><section className="evidence-page"><header className="page-heading evidence-heading"><div><p className="eyebrow">Prescription ingestion</p><h1>Upload once. Start with an editable medication draft.</h1><p>Nirog queues extraction automatically, pre-populates fields supported by the prescription, and highlights anything uncertain for correction before a regimen is saved.</p></div><div className="evidence-heading-actions"><button className="button button-secondary" disabled={state.loading} onClick={() => void load()} type="button"><RefreshCw className={state.loading ? 'spin' : undefined} size={16} /> Refresh status</button><Link className="button button-secondary" href="/"><RefreshCw size={16} /> Overview</Link></div></header>{state.error && <p className="evidence-error" role="alert">{state.error}</p>}<section className="evidence-flow"><div className="flow-heading"><div><p className="eyebrow">Step 1</p><h2>Choose a profile and prescription</h2></div><span>Core-authoritative</span></div><div className="evidence-controls"><label>Profile<select value={profileId} onChange={(event) => { setUpload({ status: 'idle' }); void load(event.target.value, ''); }}><option value="">Select a profile</option>{state.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.preferredName}</option>)}</select></label><label>Prescription<select value={prescriptionId} onChange={(event) => { setUpload({ status: 'idle' }); void load(profileId, event.target.value); }} disabled={!profileId}><option value="">Select a prescription</option>{state.prescriptions.map((prescription) => <option value={prescription.id} key={prescription.id}>{prescription.prescriberLabel ?? `Prescription ${prescription.id.slice(0, 8)}`}</option>)}</select></label><button className="button button-secondary" disabled={!profileId || state.loading || uploadBusy} onClick={() => void createPrescription()} type="button">New prescription</button></div></section><section className="evidence-flow upload-flow"><div className="flow-heading"><div><p className="eyebrow">Step 2</p><h2>Add a prescription file</h2><p>Supported files: JPEG, PNG, WebP, or PDF, up to 10 MB. Uploading starts only after you select the file and choose “Extract medication draft.”</p></div></div><div className="upload-row"><span className="upload-icon">{upload.status === 'complete' ? <FileCheck2 size={22} /> : <FileUp size={22} />}</span><div className="upload-file-summary"><strong>{upload.file ? upload.file.name : 'No prescription file selected'}</strong><p>{upload.file ? `${formatEvidenceBytes(upload.file.size)} · ${upload.file.type}` : fileControlDisabled ? 'Select a profile and prescription first.' : 'Choose a file, validate it, then queue automatic extraction.'}</p></div><div className="upload-actions"><label className="button button-secondary">{upload.file ? 'Choose another file' : 'Choose file'}<input aria-label="Choose prescription evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={fileControlDisabled} onChange={(event) => selectFile(event.target.files?.[0])} /></label><button className="button button-primary" disabled={upload.status !== 'ready' || uploadBusy} onClick={() => void uploadEvidence()} type="button">{uploadBusy ? <><LoaderCircle className="spin" size={16} /> Uploading</> : <><UploadCloud size={16} /> Extract medication draft</>}</button></div></div>{upload.status !== 'idle' && <p className={upload.status === 'error' ? 'upload-feedback is-error' : 'upload-feedback'} role={upload.status === 'error' ? 'alert' : 'status'}>{upload.status === 'complete' ? <CheckCircle2 size={16} /> : uploadBusy ? <LoaderCircle className="spin" size={16} /> : null}{upload.message ?? 'File ready for automatic draft extraction.'}</p>}</section><section className="evidence-results"><article className="result-card"><p className="eyebrow">Evidence status</p>{state.loading ? <p className="result-placeholder">Loading Core-authoritative evidence…</p> : state.evidence.length === 0 ? <p className="result-placeholder">No evidence is attached to this prescription yet.</p> : <ul className="evidence-list">{state.evidence.map((item) => <li key={item.id}><strong>{item.status.replaceAll('_', ' ')}</strong><span>{item.contentType} · {(item.declaredSizeBytes / 1024).toFixed(0)} KB</span></li>)}</ul>}</article><article className="result-card"><p className="eyebrow">Extraction provenance</p>{state.loading ? <p className="result-placeholder">Waiting for the latest extraction status…</p> : state.extractions.length === 0 ? <p className="result-placeholder">No automatic candidate is ready yet.</p> : <ul className="evidence-list">{state.extractions.map((item) => <li key={item.id}><strong>{item.status.replaceAll('_', ' ')}</strong><span>{item.resultSource === 'ml' ? `${item.candidateCount} medication candidate${item.candidateCount === 1 ? '' : 's'} · ${item.modelName ?? 'ML model'}` : `Demo provenance: ${item.demoFixtureId ?? 'marked fixture'}`}</span></li>)}</ul>}<p className="review-note"><ShieldCheck size={16} /> Caregivers with profile access can inspect this provenance and draft status. They do not block routine processing.</p></article></section><section className="evidence-flow draft-flow"><div className="flow-heading"><div><p className="eyebrow">Step 3</p><h2>Confirm the auto-populated medication draft</h2><p>Fields at or above 70% extraction confidence are pre-populated. Correct any uncertain field, then save the draft as a regimen.</p></div><span>{state.drafts.length} draft{state.drafts.length === 1 ? '' : 's'}</span></div>{state.loading ? <p className="result-placeholder">Loading medication drafts…</p> : state.drafts.length === 0 ? <p className="result-placeholder">A draft will appear here automatically when extraction completes.</p> : <div className="draft-list">{state.drafts.map((draft) => { const form = draftForms[draft.id] ?? formFromDraft(draft); const needsCorrection = requiresCorrection(draft); const action = draftAction?.draftId === draft.id ? draftAction : null; return <article className="medication-draft-card" key={draft.id}><header><div><span className={needsCorrection ? 'draft-status needs-correction' : 'draft-status ready'}>{needsCorrection ? <AlertTriangle size={15} /> : <Sparkles size={15} />}{needsCorrection ? 'Correction needed' : 'Auto-populated'}</span><h3>Medication candidate {draft.candidateIndex + 1}</h3></div><span className="draft-provenance">Candidate confidence threshold: 70%</span></header><div className="confidence-grid"><span>Name {formatConfidence(draft.medicationNameConfidence)}</span><span>Dose {formatConfidence(draft.doseConfidence)}</span><span>Route {formatConfidence(draft.routeConfidence)}</span><span>Frequency {formatConfidence(draft.frequencyConfidence)}</span></div><div className="draft-form-grid"><label>Medication name<input value={form.medicationName} onChange={(event) => updateDraft(draft.id, 'medicationName', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Dose quantity<input value={form.doseQuantity} onChange={(event) => updateDraft(draft.id, 'doseQuantity', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Dose unit<select value={form.doseUnitCode} onChange={(event) => updateDraft(draft.id, 'doseUnitCode', event.target.value)} disabled={draft.status === 'submitted'}>{['mg', 'mcg', 'ml', 'tablet', 'capsule', 'drop', 'puff', 'unit'].map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label><label>Route<select value={form.routeCode} onChange={(event) => updateDraft(draft.id, 'routeCode', event.target.value)} disabled={draft.status === 'submitted'}>{['oral', 'topical', 'inhaled', 'injection', 'other'].map((route) => <option key={route} value={route}>{route}</option>)}</select></label><label className="draft-wide">Frequency text<input value={form.frequencyText} onChange={(event) => updateDraft(draft.id, 'frequencyText', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Times (HH:MM, comma-separated)<input value={form.scheduleTimes} onChange={(event) => updateDraft(draft.id, 'scheduleTimes', event.target.value)} placeholder="08:00, 20:00" disabled={draft.status === 'submitted'} /></label><label>Every how many days<input type="number" min="1" max="365" value={form.intervalDays} onChange={(event) => updateDraft(draft.id, 'intervalDays', event.target.value)} disabled={draft.status === 'submitted'} /></label><label>Start date<input type="date" value={form.startedOn} onChange={(event) => updateDraft(draft.id, 'startedOn', event.target.value)} disabled={draft.status === 'submitted'} /></label></div>{action?.message && <p className={action.status === 'error' ? 'upload-feedback is-error' : 'upload-feedback'} role={action.status === 'error' ? 'alert' : 'status'}>{action.status === 'submitted' ? <CheckCircle2 size={16} /> : action.status === 'saving' ? <LoaderCircle className="spin" size={16} /> : <AlertTriangle size={16} />}{action.message}</p>}{draft.status === 'submitted' ? <p className="review-note"><CheckCircle2 size={16} /> Submitted as regimen {draft.submittedRegimenId?.slice(0, 8) ?? 'recorded'}.</p> : <button className="button button-primary" disabled={action?.status === 'saving'} onClick={() => void submitDraft(draft)} type="button"><PencilLine size={16} /> Save medication regimen</button>}</article>; })}</div>}</section></section></AppShell>;
}
