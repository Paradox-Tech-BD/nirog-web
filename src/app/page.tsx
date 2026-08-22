// Clinical Ledger design: a signed-in person moves directly into a profile-scoped workspace; signed-out visitors see a precise introduction.
import { Show, SignUpButton } from '@clerk/nextjs';
import { ArrowRight, CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { PublicShell } from '@/components/public-shell';
import { CareWorkspace } from '@/components/care-workspace';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <Show when="signed-in">
        <CareWorkspace />
      </Show>
      <Show when="signed-out">
        <PublicShell>
          <main className="landing-main" id="home">
            <section className="landing-hero">
              <div className="hero-copy"><p className="eyebrow">Profile-aware medication care</p><h1>Prescription in. <span>Editable care context</span> out.</h1><p>One clear workspace for profile-scoped prescriptions, automatic extraction progress, confidence-scored medication drafts, and the people authorized to help.</p><div className="hero-actions"><SignUpButton><button className="button button-primary" type="button">Create your account <ArrowRight size={17} /></button></SignUpButton><a className="button button-secondary" href="#principles">See how it works</a></div><div className="hero-assurance"><span><CheckCircle2 size={16} /> Automatic draft preparation</span><span><CheckCircle2 size={16} /> Explicit regimen submission</span></div></div>
              <div className="hero-record" aria-label="Nirog care record preview"><div className="hero-record-top"><span>CARE RECORD</span><span><ShieldCheck size={14} /> Profile scoped</span></div><div className="hero-record-person"><div className="hero-record-avatar">N</div><div><small>ACTIVE PROFILE</small><strong>Your care context</strong><p>Only the profile you are authorized to access is shown.</p></div></div><div className="hero-record-row"><FileText size={18} /><div><small>PRESCRIPTION INTAKE</small><strong>Editable draft preparing</strong></div><span className="status-pill">Automatic</span></div><div className="hero-record-footer">Core-authoritative · regimen creation remains explicit</div></div>
            </section>
            <section className="principles" id="principles"><article><span>01</span><h2>Every record has a profile.</h2><p>Care data is always read within the patient profile it belongs to.</p></article><article><span>02</span><h2>Access is deliberate.</h2><p>Delegated access is visible, reviewable, and tied to the right profile.</p></article><article><span>03</span><h2>Evidence becomes a draft.</h2><p>Extraction prepares editable medication context. It never creates a regimen by itself.</p></article></section>
          </main>
          <footer className="public-footer"><span>NIROG CARE WORKSPACE</span><span>Profile-scoped · Secure session · Core-connected</span></footer>
        </PublicShell>
      </Show>
    </>
  );
}
