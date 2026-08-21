import { Show, SignInButton } from '@clerk/nextjs';
import { PrescriptionEvidenceWorkspace } from '@/components/prescription-evidence-workspace';

export default function EvidencePage() {
  return <><Show when="signed-in"><PrescriptionEvidenceWorkspace /></Show><Show when="signed-out"><main className="landing-shell"><h1>Prescription evidence is profile-scoped.</h1><p>Sign in to upload and review evidence through Nirog Core.</p><SignInButton><button className="primary-action" type="button">Sign in</button></SignInButton></main></Show></>;
}
