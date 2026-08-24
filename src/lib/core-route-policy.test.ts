import { describe, expect, it } from 'vitest';
import { isAllowedCoreEvidencePath } from './core-route-policy';

const profileId = '00000000-0000-4000-8000-000000000101';
const grantId = '00000000-0000-4000-8000-000000000201';
const prescriptionId = '00000000-0000-4000-8000-000000000701';
const evidenceId = '00000000-0000-4000-8000-000000000801';
const ocrJobId = '00000000-0000-4000-8000-000000000901';
const regimenId = '00000000-0000-4000-8000-000000000301';
const occurrenceId = '00000000-0000-4000-8000-000000000401';

describe('Core evidence proxy route policy', () => {
  it('allows profile onboarding plus Core user evidence and OCR-read paths', () => {
    expect(isAllowedCoreEvidencePath('profiles')).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/access-context`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/access-grants`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/access-grants/${grantId}`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/prescriptions`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/prescriptions/${prescriptionId}/evidence/uploads`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/medications`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notifications`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notifications/stream`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notifications/delivery-status`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notifications/delivery-attempts`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notification-policies`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notification-policies/${grantId}`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/reminder-schedules`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/reminder-occurrences`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/reminder-occurrences/${occurrenceId}/snooze`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/reminder-occurrences/${occurrenceId}/acknowledge`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/dose-logs`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/adherence/daily`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/adherence/weekly`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/adherence/monthly`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/adherence/streak`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/inventory`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/inventory/movements`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/inventory/refills`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/inventory/refill-alerts`)).toBe(true);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/regimens/${regimenId}/inventory/refill-alerts/${occurrenceId}/acknowledge`)).toBe(true);
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
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notifications/stream/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notifications/delivery-status/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notifications/delivery-registrations`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/notification-policies/${grantId}/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath(`profiles/${profileId}/medication-drafts/${evidenceId}/submitted/extra`)).toBe(false);
    expect(isAllowedCoreEvidencePath('me')).toBe(false);
  });
});
