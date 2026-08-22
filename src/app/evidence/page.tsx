import { Show, SignInButton } from '@clerk/nextjs';
import { PrescriptionEvidenceWorkspace } from '@/components/prescription-evidence-workspace';
import { PublicShell } from '@/components/public-shell';

export const dynamic = 'force-dynamic';

export default function EvidencePage() {
  return <><Show when="signed-in"><PrescriptionEvidenceWorkspace /></Show><Show when="signed-out"><PublicShell><main className="locked-route"><p className="eyebrow">Secure care workspace</p><h1>Prescription evidence stays profile-scoped.</h1><p>Sign in to upload evidence and view its Core-authoritative review status.</p><SignInButton><button className="button button-primary" type="button">Sign in to continue</button></SignInButton></main></PublicShell></Show></>;
}
