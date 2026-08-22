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
              <div className="hero-copy"><p className="eyebrow">Profile-aware medication care</p><h1>Care records that stay <span>clear, scoped, and human.</span></h1><p>One calm workspace for your profile-scoped record, prescription evidence, and access context. Nirog shows what is verified and leaves clinical decisions to people.</p><div className="hero-actions"><SignUpButton><button className="button button-primary" type="button">Create your account <ArrowRight size={17} /></button></SignUpButton><a className="button button-secondary" href="#principles">See how it works</a></div><div className="hero-assurance"><span><CheckCircle2 size={16} /> Profile-scoped access</span><span><CheckCircle2 size={16} /> Human review required</span></div></div>
              <div className="hero-record" aria-label="Nirog care record preview"><div className="hero-record-top"><span>CARE RECORD</span><span><ShieldCheck size={14} /> Verified</span></div><div className="hero-record-person"><div className="hero-record-avatar">N</div><div><small>ACTIVE PROFILE</small><strong>Your care context</strong><p>Only verified profile data is shown here.</p></div></div><div className="hero-record-row"><FileText size={18} /><div><small>PRESCRIPTION EVIDENCE</small><strong>Review stays human-led</strong></div><span className="status-pill">Protected</span></div><div className="hero-record-footer">Core-authoritative · No automatic clinical changes</div></div>
            </section>
            <section className="principles" id="principles"><article><span>01</span><h2>Every record has a profile.</h2><p>Care data is always read within the patient profile it belongs to.</p></article><article><span>02</span><h2>Access is deliberate.</h2><p>Delegated access is visible, reviewable, and tied to the right profile.</p></article><article><span>03</span><h2>Evidence is advisory.</h2><p>OCR can assist a review but it never creates clinical care on its own.</p></article></section>
          </main>
          <footer className="public-footer"><span>NIROG CARE WORKSPACE</span><span>Profile-scoped · Secure session · Core-connected</span></footer>
        </PublicShell>
      </Show>
    </>
  );
}
