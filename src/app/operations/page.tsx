import { Show, SignInButton } from '@clerk/nextjs';
import { OperationsStatusWorkspace } from '@/components/operations-status-workspace';
import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-dynamic';

export default function OperationsPage() {
  return <><Show when="signed-in"><OperationsStatusWorkspace /></Show><Show when="signed-out"><PublicShell><main className="locked-route"><p className="eyebrow">Restricted operations view</p><h1>Operational status is restricted to designated platform operators.</h1><p>Sign in to let Core evaluate whether this account is permitted to view an aggregate-only status snapshot.</p><SignInButton><button className="button button-primary" type="button">Sign in to continue</button></SignInButton></main></PublicShell></Show></>;
}
