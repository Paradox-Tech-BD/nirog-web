import { describe, expect, it } from 'vitest';
import { formatEvidenceBytes, maximumEvidenceBytes, newestEvidenceId, validateEvidenceFile } from './evidence-upload';

describe('prescription evidence file validation', () => {
  it('accepts the Core-supported bounded evidence formats', () => {
    expect(validateEvidenceFile({ name: 'prescription.jpg', type: 'image/jpeg', size: 420_000 })).toBeUndefined();
    expect(validateEvidenceFile({ name: 'prescription.png', type: 'image/png', size: 420_000 })).toBeUndefined();
    expect(validateEvidenceFile({ name: 'prescription.pdf', type: 'application/pdf', size: 420_000 })).toBeUndefined();
  });

  it('rejects unsupported, empty, and oversized browser files before Core authorization', () => {
    expect(validateEvidenceFile({ name: 'note.txt', type: 'text/plain', size: 20 })).toMatch(/JPEG/);
    expect(validateEvidenceFile({ name: 'empty.jpg', type: 'image/jpeg', size: 0 })).toMatch(/empty/);
    expect(validateEvidenceFile({ name: 'large.jpg', type: 'image/jpeg', size: maximumEvidenceBytes + 1 })).toMatch(/10 MB/);
    expect(formatEvidenceBytes(1_048_576)).toBe('1.0 MB');
  });

  it('selects the newest Core evidence item for review-status lookup', () => {
    expect(newestEvidenceId([
      { id: 'older', uploadAuthorizedAt: '2026-08-22T08:00:00.000Z' },
      { id: 'newest', uploadAuthorizedAt: '2026-08-22T08:30:00.000Z' },
      { id: 'undated' },
    ])).toBe('newest');
  });
});
