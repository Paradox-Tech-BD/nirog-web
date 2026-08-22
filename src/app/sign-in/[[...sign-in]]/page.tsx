// Clinical Ledger design: sign-in stays focused, with Clerk handling account security rather than custom credential forms.
import { SignIn } from '@clerk/nextjs';
import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return (
    <PublicShell><main className="auth-page"><section className="auth-intro"><p className="eyebrow">Welcome back</p><h1>Your care record, clearly held.</h1><p>Continue to a profile-scoped workspace designed for clear, verified care context.</p></section><section className="auth-card"><SignIn /></section></main></PublicShell>
  );
}
