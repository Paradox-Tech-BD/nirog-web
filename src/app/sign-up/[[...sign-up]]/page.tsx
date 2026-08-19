// Clinical Ledger design: sign-up uses Clerk's maintained flow and returns people to their own protected care context.
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <p className="eyebrow">Nirog care ledger</p>
        <h1>Begin with a clear care record.</h1>
        <p>Create a secure account before adding or sharing a patient profile.</p>
      </section>
      <SignUp />
    </main>
  );
}
