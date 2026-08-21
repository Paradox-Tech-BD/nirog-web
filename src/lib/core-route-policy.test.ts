import { describe, expect, it } from 'vitest';
import { isAllowedCoreEvidencePath } from './core-route-policy';

const profileId = '00000000-0000-4000-8000-000000000101';
const prescriptionId = '00000000-0000-4000-8000-000000000701';
const evidenceId = '00000000-0000-4000-8000-000000000801';

describe('Core evidence proxy route policy', () => {
  it('allows only Core user evidence and OCR-read paths', () => {
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/prescriptions`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/uploads`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/ocr-extractions`)).toBe(true);
  });

  it('blocks worker, Lab, and arbitrary Core paths', () => {
    expect(isAllowedCoreEvidencePath('internal/ocr/jobs/00000000-0000-4000-8000-000000000801/lease')).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/evidence/${evidenceId}/ocr-jobs/00000000-0000-4000-8000-000000000901/lab-correlation`)).toBe(false);
    expect(isAllowedCoreEvidencePath('me')).toBe(false);
  });
});
