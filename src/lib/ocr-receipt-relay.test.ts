import { describe, expect, it } from 'vitest';
import { ocrOpsReceiptEndpoint, parseConfirmedReceiptRelayInput } from './ocr-receipt-relay';

describe('confirmed OCR receipt relay contract', () => {
  it('accepts only the required, bounded receipt fields', () => {
    expect(
      parseConfirmedReceiptRelayInput({
        actorId: 'ops-verify-1',
        actorName: 'Controlled verification operator',
        reason: 'Controlled confirmation completed.',
        correlationAssertion: 'a'.repeat(32),
      }),
    ).toEqual({
      actorId: 'ops-verify-1',
      actorName: 'Controlled verification operator',
      reason: 'Controlled confirmation completed.',
      correlationAssertion: 'a'.repeat(32),
    });
  });

  it('rejects incomplete or undersized assertions and keeps the receipt target job-scoped', () => {
    expect(parseConfirmedReceiptRelayInput({ actorId: 'ops-verify-1', reason: 'ok' })).toBeNull();
    expect(
      parseConfirmedReceiptRelayInput({
        actorId: 'ops-verify-1',
        reason: 'Controlled confirmation completed.',
        correlationAssertion: 'short',
      }),
    ).toBeNull();
    expect(ocrOpsReceiptEndpoint('job/with unsafe path')).toContain('job_id=job%2Fwith%20unsafe%20path');
  });
});
