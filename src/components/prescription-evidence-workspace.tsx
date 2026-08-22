'use client';

import { CheckCircle2, FileCheck2, FileUp, LoaderCircle, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import type { AccountProjection, CoreSuccess } from '@/lib/core-api';
import { formatEvidenceBytes, newestEvidenceId, validateEvidenceFile } from '@/lib/evidence-upload';

type Prescription = { id: string; status: 'active' | 'archived'; prescriberLabel?: string; issuedOn?: string; createdAt: string };
type Evidence = { id: string; contentType: string; declaredSizeBytes: number; status: string; uploadAuthorizedAt?: string; uploadedAt?: string; processedAt?: string };
type Extraction = { id: string; status: string; resultSource: 'demo' | 'ml'; demoFixtureId?: string; candidateMedicationName?: string; candidateDoseText?: string; candidateFrequencyText?: string };
type State = { profiles: AccountProjection['profiles']; prescriptions: Prescription[]; evidence: Evidence[]; extractions: Extraction[]; loading: boolean; error?: string };
type UploadState = { status: 'idle' | 'ready' | 'authorizing' | 'transferring' | 'queueing' | 'complete' | 'error'; file?: File; message?: string; jobId?: string };

const idempotencyKey = () => crypto.randomUUID();

async function core<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/core/${path}`, { cache: 'no-store', ...init });
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(typeof payload === 'object' && payload && 'title' in payload ? String(payload.title) : 'Nirog Core request failed.');
  return (payload as CoreSuccess<T>).data;
}

export function PrescriptionEvidenceWorkspace() {
  const [state, setState] = useState<State>({ profiles: [], prescriptions: [], evidence: [], extractions: [], loading: true });
  const [profileId, setProfileId] = useState('');
  const [prescriptionId, setPrescriptionId] = useState('');
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const load = useCallback(async (nextProfileId = profileId, nextPrescriptionId = prescriptionId) => {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const me = await core<AccountProjection>('me');
      const resolvedProfileId = nextProfileId || me.profiles[0]?.id || '';
      const prescriptions = resolvedProfileId ? await core<Prescription[]>(`profiles/${resolvedProfileId}/prescriptions`) : [];
      const resolvedPrescriptionId = nextPrescriptionId || prescriptions[0]?.id || '';
      const evidence = resolvedProfileId && resolvedPrescriptionId ? await core<Evidence[]>(`profiles/${resolvedProfileId}/prescriptions/${resolvedPrescriptionId}/evidence`) : [];
      const newestEvidence = newestEvidenceId(evidence);
      const extractions = resolvedProfileId && newestEvidence ? await core<Extraction[]>(`profiles/${resolvedProfileId}/evidence/${newestEvidence}/ocr-extractions`) : [];
      setProfileId(resolvedProfileId); setPrescriptionId(resolvedPrescriptionId);
      setState({ profiles: me.profiles, prescriptions, evidence, extractions, loading: false });
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'Nirog Core request failed.' })); }
  }, [profileId, prescriptionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasProcessingEvidence = state.evidence.some((item) => item.status === 'processing');

  useEffect(() => {
    if (!hasProcessingEvidence || !profileId || !prescriptionId) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = async () => {
      await load(profileId, prescriptionId);
      if (!cancelled) timer = window.setTimeout(() => { void poll(); }, 5_000);
    };
    timer = window.setTimeout(() => { void poll(); }, 5_000);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [hasProcessingEvidence, load, prescriptionId, profileId]);

  const createPrescription = async () => {
    if (!profileId) return;
    const created = await core<{ id: string }>(`profiles/${profileId}/prescriptions`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: '{}' });
    setUpload({ status: 'idle' });
    await load(profileId, created.id);
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
      setUpload({ status: 'queueing', file, message: 'Registering the upload and starting the review workflow…' });
      const queued = await core<{ ocrJobId: string }>(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/${authorization.evidence.id}/complete`, { method: 'POST', headers: { 'idempotency-key': idempotencyKey() } });
      setUpload({ status: 'complete', file, jobId: queued.ocrJobId, message: 'Evidence uploaded. The OCR job is queued for mandatory human review.' });
      await load(profileId, prescriptionId);
    } catch (error) { setUpload({ status: 'error', file, message: error instanceof Error ? error.message : 'Evidence upload failed. You can retry without changing the care record.' }); }
  };

  const uploadBusy = ['authorizing', 'transferring', 'queueing'].includes(upload.status);
  const fileControlDisabled = !prescriptionId || uploadBusy;

  return <AppShell><section className="evidence-page"><header className="page-heading evidence-heading"><div><p className="eyebrow">Prescription evidence</p><h1>Review evidence before it can inform care.</h1><p>OCR output is advisory. It never creates a medication, regimen, reminder, or diagnosis automatically.</p></div><div className="evidence-heading-actions"><button className="button button-secondary" disabled={state.loading} onClick={() => void load()} type="button"><RefreshCw className={state.loading ? 'spin' : undefined} size={16} /> Refresh status</button><Link className="button button-secondary" href="/"><RefreshCw size={16} /> Overview</Link></div></header>{state.error && <p className="evidence-error" role="alert">{state.error}</p>}<section className="evidence-flow"><div className="flow-heading"><div><p className="eyebrow">Step 1</p><h2>Choose a profile and prescription</h2></div><span>Core-authoritative</span></div><div className="evidence-controls"><label>Profile<select value={profileId} onChange={(event) => { setUpload({ status: 'idle' }); void load(event.target.value, ''); }}><option value="">Select a profile</option>{state.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.preferredName}</option>)}</select></label><label>Prescription<select value={prescriptionId} onChange={(event) => { setUpload({ status: 'idle' }); void load(profileId, event.target.value); }} disabled={!profileId}><option value="">Select a prescription</option>{state.prescriptions.map((prescription) => <option value={prescription.id} key={prescription.id}>{prescription.prescriberLabel ?? `Prescription ${prescription.id.slice(0, 8)}`}</option>)}</select></label><button className="button button-secondary" disabled={!profileId || state.loading || uploadBusy} onClick={() => void createPrescription()} type="button">New prescription</button></div></section><section className="evidence-flow upload-flow"><div className="flow-heading"><div><p className="eyebrow">Step 2</p><h2>Add a prescription file</h2><p>Supported files: JPEG, PNG, WebP, or PDF, up to 10 MB. Uploading starts only after you select the file and choose “Upload for review.”</p></div></div><div className="upload-row"><span className="upload-icon">{upload.status === 'complete' ? <FileCheck2 size={22} /> : <FileUp size={22} />}</span><div className="upload-file-summary"><strong>{upload.file ? upload.file.name : 'No prescription file selected'}</strong><p>{upload.file ? `${formatEvidenceBytes(upload.file.size)} · ${upload.file.type}` : fileControlDisabled ? 'Select a profile and prescription first.' : 'Choose a file, validate it, then upload it for human review.'}</p></div><div className="upload-actions"><label className="button button-secondary">{upload.file ? 'Choose another file' : 'Choose file'}<input aria-label="Choose prescription evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={fileControlDisabled} onChange={(event) => selectFile(event.target.files?.[0])} /></label><button className="button button-primary" disabled={upload.status !== 'ready' || uploadBusy} onClick={() => void uploadEvidence()} type="button">{uploadBusy ? <><LoaderCircle className="spin" size={16} /> Uploading</> : <><UploadCloud size={16} /> Upload for review</>}</button></div></div>{upload.status !== 'idle' && <p className={upload.status === 'error' ? 'upload-feedback is-error' : 'upload-feedback'} role={upload.status === 'error' ? 'alert' : 'status'}>{upload.status === 'complete' ? <CheckCircle2 size={16} /> : uploadBusy ? <LoaderCircle className="spin" size={16} /> : null}{upload.message ?? 'File ready for review-gated upload.'}</p>}</section><section className="evidence-results"><article className="result-card"><p className="eyebrow">Evidence status</p>{state.loading ? <p className="result-placeholder">Loading Core-authoritative evidence…</p> : state.evidence.length === 0 ? <p className="result-placeholder">No evidence is attached to this prescription yet.</p> : <ul className="evidence-list">{state.evidence.map((item) => <li key={item.id}><strong>{item.status.replaceAll('_', ' ')}</strong><span>{item.contentType} · {(item.declaredSizeBytes / 1024).toFixed(0)} KB</span></li>)}</ul>}</article><article className="result-card"><p className="eyebrow">OCR review status</p>{state.loading ? <p className="result-placeholder">Waiting for the latest Core review status…</p> : state.extractions.length === 0 ? <p className="result-placeholder">No extraction candidate is ready for human review.</p> : <ul className="evidence-list">{state.extractions.map((item) => <li key={item.id}><strong>{item.status.replaceAll('_', ' ')}</strong><span>{item.resultSource === 'demo' ? `Demo provenance: ${item.demoFixtureId ?? 'marked fixture'}` : 'ML provenance pending operator policy'}</span></li>)}</ul>}<p className="review-note"><ShieldCheck size={16} /> Human confirmation remains mandatory; clinical changes stay outside this screen.</p></article></section></section></AppShell>;
}
