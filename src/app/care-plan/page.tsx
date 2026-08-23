import { Show, SignInButton } from '@clerk/nextjs';
import { CarePlanWorkspace } from '@/components/care-plan-workspace';
import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-dynamic';

export default function CarePlanPage() {
  return <><Show when="signed-in"><CarePlanWorkspace /></Show><Show when="signed-out"><PublicShell><main className="locked-route"><p className="eyebrow">Care-plan access</p><h1>Sign in to view reminders and medication tracking.</h1><p>Regimen schedules, reminder occurrences, adherence, inventory, and in-app reminder delivery are available only through an authenticated, authorized care profile.</p><SignInButton><button className="button button-primary" type="button">Sign in</button></SignInButton></main></PublicShell></Show></>;
}
