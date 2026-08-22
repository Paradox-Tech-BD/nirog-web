/** Care pathway route: authorized profile-access information only. */
import { Show, SignInButton } from '@clerk/nextjs';
import { CareCircleWorkspace } from '@/components/care-circle-workspace';
import { PublicShell } from '@/components/public-shell';

export default function CareCirclePage() {
  return <><Show when="signed-in"><CareCircleWorkspace /></Show><Show when="signed-out"><PublicShell><main className="locked-route"><p className="eyebrow">Care-circle access</p><h1>Sign in to view profile-scoped access.</h1><p>Care-circle information is available only through an authenticated, authorized care profile.</p><SignInButton><button className="button button-primary" type="button">Sign in</button></SignInButton></main></PublicShell></Show></>;
}
