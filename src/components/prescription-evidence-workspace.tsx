'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { FileUp, RefreshCw, ShieldCheck } from 'lucide-react';
import type { AccountProjection, CoreSuccess } from '@/lib/core-api';

type Prescription = { id: string; status: 'active' | 'archived'; prescriberLabel?: string; issuedOn?: string; createdAt: string };
type Evidence = { id: string; contentType: string; declaredSizeBytes: number; status: string; uploadedAt?: string; processedAt?: string };
type Extraction = { id: string; status: string; resultSource: 'demo' | 'ml'; demoFixtureId?: string; candidateMedicationName?: string; candidateDoseText?: string; candidateFrequencyText?: string };
type State = { profiles: AccountProjection['profiles']; prescriptions: Prescription[]; evidence: Evidence[]; extractions: Extraction[]; loading: boolean; error?: string };

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
  const load = useCallback(async (nextProfileId = profileId, nextPrescriptionId = prescriptionId) => {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    try {
      const me = await core<AccountProjection>('me');
      const resolvedProfileId = nextProfileId || me.profiles[0]?.id || '';
      const prescriptions = resolvedProfileId ? await core<Prescription[]>(`profiles/${resolvedProfileId}/prescriptions`) : [];
      const resolvedPrescriptionId = nextPrescriptionId || prescriptions[0]?.id || '';
      const evidence = resolvedProfileId && resolvedPrescriptionId ? await core<Evidence[]>(`profiles/${resolvedProfileId}/prescriptions/${resolvedPrescriptionId}/evidence`) : [];
      const extractions = resolvedProfileId && evidence[0] ? await core<Extraction[]>(`profiles/${resolvedProfileId}/evidence/${evidence[0].id}/ocr-extractions`) : [];
      setProfileId(resolvedProfileId); setPrescriptionId(resolvedPrescriptionId);
      setState({ profiles: me.profiles, prescriptions, evidence, extractions, loading: false });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'Nirog Core request failed.' }));
    }
  }, [profileId, prescriptionId]);

  useEffect(() => { void load(); }, [load]);

  const createPrescription = async () => {
    if (!profileId) return;
    const created = await core<{ id: string }>(`profiles/${profileId}/prescriptions`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: '{}' });
    await load(profileId, created.id);
  };

  const uploadEvidence = async (file: File) => {
    if (!profileId || !prescriptionId) return;
    try {
      setState((current) => ({ ...current, loading: true, error: undefined }));
      const authorization = await core<{ evidence: Evidence; uploadUrl: string }>(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/uploads`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey() }, body: JSON.stringify({ contentType: file.type, declaredSizeBytes: file.size }) });
      const upload = await fetch(authorization.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
      if (!upload.ok) throw new Error('The evidence upload could not be completed.');
      await core(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/${authorization.evidence.id}/complete`, { method: 'POST', headers: { 'idempotency-key': idempotencyKey() } });
      await load(profileId, prescriptionId);
    } catch (error) { setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error.message : 'Evidence upload failed.' })); }
  };

  return <main className="evidence-shell">
    <header className="evidence-header"><div><p className="eyebrow">Prescription evidence / Core-owned workflow</p><h1>Review evidence before it can inform care.</h1><p>OCR output is advisory. It never creates a medication, regimen, reminder, or diagnosis automatically.</p></div><Link className="secondary-action" href="/"><RefreshCw size={16} /> Care record</Link></header>
    {state.error && <p className="evidence-error" role="alert">{state.error}</p>}
    <section className="evidence-card"><div className="evidence-controls"><label>Profile<select value={profileId} onChange={(event) => void load(event.target.value, '')}><option value="">Select a profile</option>{state.profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.preferredName}</option>)}</select></label><label>Prescription<select value={prescriptionId} onChange={(event) => void load(profileId, event.target.value)} disabled={!profileId}><option value="">Select a prescription</option>{state.prescriptions.map((prescription) => <option value={prescription.id} key={prescription.id}>{prescription.prescriberLabel ?? `Prescription ${prescription.id.slice(0, 8)}`}</option>)}</select></label><button className="secondary-action" disabled={!profileId || state.loading} onClick={() => void createPrescription()} type="button">New prescription</button></div>
      <div className="evidence-upload"><FileUp size={24}/><div><h2>Upload prescription evidence</h2><p>JPEG, PNG, WebP, or PDF up to 10 MB. Evidence remains profile-scoped in Core.</p></div><label className="primary-action">Choose file<input aria-label="Choose prescription evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={!prescriptionId || state.loading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadEvidence(file); }} /></label></div></section>
    <section className="evidence-grid"><article className="evidence-card"><p className="eyebrow">Evidence status</p>{state.loading ? <p>Loading Core-authoritative evidence…</p> : state.evidence.length === 0 ? <p>No evidence is attached to this prescription yet.</p> : <ul className="evidence-list">{state.evidence.map((item) => <li key={item.id}><strong>{item.status.replaceAll('_', ' ')}</strong><span>{item.contentType} · {(item.declaredSizeBytes / 1024).toFixed(0)} KB</span></li>)}</ul>}</article><article className="evidence-card"><p className="eyebrow">OCR review status</p>{state.extractions.length === 0 ? <p>No extraction candidate is ready for human review.</p> : <ul className="evidence-list">{state.extractions.map((item) => <li key={item.id}><strong>{item.status.replaceAll('_', ' ')}</strong><span>{item.resultSource === 'demo' ? `Demo provenance: ${item.demoFixtureId ?? 'marked fixture'}` : 'ML provenance pending operator policy'}</span></li>)}</ul>}<p className="evidence-note"><ShieldCheck size={15}/> Human decision capture remains mandatory; clinical changes stay outside this OCR screen.</p></article></section>
  </main>;
}
