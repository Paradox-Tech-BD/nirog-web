// Clinical Ledger design: a signed-in person moves directly into a profile-scoped workspace; signed-out visitors see a precise introduction.
import { Show, SignInButton, SignUpButton } from '@clerk/nextjs';
import { ArrowRight, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { CareWorkspace } from '@/components/care-workspace';

export default function Home() {
  return (
    <>
      <Show when="signed-in">
        <CareWorkspace />
      </Show>
      <Show when="signed-out">
        <main className="landing-shell">
          <header className="landing-nav">
            <a className="brand-lockup" href="#home"><span className="brand-mark" aria-hidden="true"><i /><b /></span><span>Nirog</span></a>
            <div className="landing-actions">
              <SignInButton><button className="text-action" type="button">Sign in</button></SignInButton>
              <SignUpButton><button className="primary-action" type="button">Create care account <ArrowRight size={16} /></button></SignUpButton>
            </div>
          </header>
          <section className="landing-hero" id="home">
            <div className="hero-copy">
              <p className="eyebrow">Medication care, clearly held</p>
              <h1>Your care day, in one <em>clear</em> record.</h1>
              <p className="hero-lede">Nirog brings profile-scoped identity, care preferences, and access decisions into one steady workspace—built to accompany the phone app when the day needs a wider view.</p>
              <div className="landing-actions hero-actions">
                <SignUpButton><button className="primary-action" type="button">Create care account <ArrowRight size={16} /></button></SignUpButton>
                <a className="secondary-action" href="#principles"><BookOpenCheck size={16} /> How care stays scoped</a>
              </div>
            </div>
            <div className="hero-ledger" aria-label="Nirog interface preview">
              <div className="ledger-topline"><span>CARE LEDGER / TODAY</span><span className="verification-chip"><ShieldCheck size={13} /> Verified</span></div>
              <div className="ledger-preview-line"><span className="preview-dot" /><div><small>PROFILE CONTEXT</small><strong>Personal account</strong></div></div>
              <div className="ledger-preview-line is-soft"><span className="preview-dot amber" /><div><small>NEXT STEP</small><strong>Review your profile access</strong></div></div>
              <div className="ledger-preview-footer">Nirog does not infer clinical records. It shows what the signed-in care context can verify.</div>
            </div>
          </section>
          <section className="principles" id="principles">
            <article><span>01</span><h2>One profile at a time.</h2><p>Care is always read in the context of the patient profile it belongs to.</p></article>
            <article><span>02</span><h2>Access is explicit.</h2><p>Delegated profile access is a persisted permission decision, not a loose team membership.</p></article>
            <article><span>03</span><h2>Evidence stays visible.</h2><p>Identity and API state are named clearly so a care action is never silently assumed.</p></article>
          </section>
          <footer className="landing-footer"><span>NIROG CARE LEDGER</span><span>Profile-scoped · Clerk verified · Core-connected</span></footer>
        </main>
      </Show>
    </>
  );
}
