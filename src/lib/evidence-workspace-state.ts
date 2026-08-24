export type NoProfileOnboardingInput = {
  phase: 'loading' | 'ready' | 'error';
  hasAccount: boolean;
  profileCount: number;
  profileId: string;
};

/**
 * The only safe empty state for an authenticated account with no care context.
 * The form creates a Core profile; it does not create a prescription, evidence,
 * medication, regimen, or other clinical record.
 */
export function shouldShowNoProfileOnboarding(input: NoProfileOnboardingInput): boolean {
  return input.phase === 'ready'
    && input.hasAccount
    && input.profileCount === 0
    && !input.profileId;
}

export type EvidenceControlInput = {
  phase: 'loading' | 'ready' | 'error';
  profileId: string;
  prescriptionId: string;
  canCreateDocuments: boolean;
  uploadBusy: boolean;
};

/** Keep file selection unavailable until a Core-authorized care context exists. */
export function isEvidenceFileControlDisabled(input: EvidenceControlInput): boolean {
  return !input.profileId
    || !input.prescriptionId
    || !input.canCreateDocuments
    || input.uploadBusy
    || input.phase === 'loading';
}
