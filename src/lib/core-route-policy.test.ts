import { describe, expect, it } from 'vitest';
import { isAllowedCoreEvidencePath } from './core-route-policy';

const profileId = '00000000-0000-4000-8000-000000000101';
const prescriptionId = '00000000-0000-4000-8000-000000000701';
const evidenceId = '00000000-0000-4000-8000-000000000801';
const ocrJobId = '00000000-0000-4000-8000-000000000901';

describe('Core evidence proxy route policy', () => {
  it('allows profile onboarding plus Core user evidence and OCR-read paths', () => {
    expect(isAllowedCoreEvidencePath('profiles')).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/access-context`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/access-grants`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/prescriptions`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/uploads`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/ocr-extractions`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/medication-drafts`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/medication-drafts/${evidenceId}`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/medication-drafts/${evidenceId}/submitted`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/ocr-jobs/${ocrJobId}/lab-correlation`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/ocr-jobs/${ocrJobId}/lab-receipt-audit`)).toBe(true);
  });

  it('blocks worker, Lab, and arbitrary Core paths', () => {
    expect(isAllowedCoreEvidencePath('internal/ocr/jobs/00000000-0000-4000-8000-000000000801/lease')).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/ocr-jobs/${ocrJobId}/lab-correlation/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/ocr-jobs/${ocrJobId}/lab-receipt-audit/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/access-grants/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/access-context/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/medication-drafts/${evidenceId}/submitted/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath('me')).toBe(false);
  });
});
