/** Care pathway route: owner-managed notification intent without provider activation. */
import { Show, SignInButton } from '@clerk/nextjs';
import { NotificationPolicyWorkspace } from '@/components/notification-policy-workspace';
import { PublicShell } from '@/components/public-shell';

export default function NotificationPoliciesPage() {
  return <><Show when="signed-in"><NotificationPolicyWorkspace /></Show><Show when="signed-out"><PublicShell><main className="locked-route"><p className="eyebrow">Notification policy</p><h1>Sign in to manage profile notification intent.</h1><p>Notification-policy controls are available only to the owner of an authorized care profile.</p><SignInButton><button className="button button-primary" type="button">Sign in</button></SignInButton></main></PublicShell></Show></>;
}
