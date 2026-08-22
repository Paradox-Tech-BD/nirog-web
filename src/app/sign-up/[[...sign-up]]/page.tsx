// Clinical Ledger design: sign-up uses Clerk's maintained flow and returns people to their own protected care context.
import { SignUp } from '@clerk/nextjs';
import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return (
    <PublicShell><main className="auth-page"><section className="auth-intro"><p className="eyebrow">Create your account</p><h1>Begin with a clear care record.</h1><p>Create a secure account before adding or sharing a patient profile.</p></section><section className="auth-card"><SignUp /></section></main></PublicShell>
  );
}
