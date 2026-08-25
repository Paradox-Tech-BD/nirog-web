import { describe, expect, it } from 'vitest';
import { isEvidenceFileControlDisabled, shouldShowNoProfileOnboarding } from './evidence-workspace-state';

describe('no-profile evidence workspace state', () => {
  it('shows Core-authoritative profile onboarding only for a ready account with zero profiles', () => {
    expect(shouldShowNoProfileOnboarding({
      phase: 'ready', hasAccount: true, profileCount: 0, profileId: '',
    })).toBe(true);
  });

  it('does not show profile onboarding while data is incomplete or a profile already exists', () => {
    expect(shouldShowNoProfileOnboarding({
      phase: 'loading', hasAccount: true, profileCount: 0, profileId: '',
    })).toBe(false);
    expect(shouldShowNoProfileOnboarding({
      phase: 'ready', hasAccount: true, profileCount: 1, profileId: '',
    })).toBe(false);
    expect(shouldShowNoProfileOnboarding({
      phase: 'ready', hasAccount: true, profileCount: 1, profileId: 'profile-1',
    })).toBe(false);
  });

  it('keeps evidence selection unavailable before a profile and prescription context exist', () => {
    expect(isEvidenceFileControlDisabled({
      phase: 'ready', profileId: '', prescriptionId: '', canCreateDocuments: false, profileArchived: false, uploadBusy: false,
    })).toBe(true);
    expect(isEvidenceFileControlDisabled({
      phase: 'ready', profileId: 'profile-1', prescriptionId: 'prescription-1', canCreateDocuments: true, profileArchived: false, uploadBusy: false,
    })).toBe(false);
  });

  it('keeps evidence selection unavailable for an explicitly selected archived profile', () => {
    expect(isEvidenceFileControlDisabled({
      phase: 'ready', profileId: 'archived-profile', prescriptionId: 'prescription-1', canCreateDocuments: true, profileArchived: true, uploadBusy: false,
    })).toBe(true);
  });
});
