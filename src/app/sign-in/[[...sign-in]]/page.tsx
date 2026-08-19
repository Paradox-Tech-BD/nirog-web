// Clinical Ledger design: sign-in stays focused, with Clerk handling account security rather than custom credential forms.
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <p className="eyebrow">Nirog care ledger</p>
        <h1>Your care record, clearly held.</h1>
        <p>Sign in to continue to the profile-scoped Nirog workspace.</p>
      </section>
      <SignIn />
    </main>
  );
}
