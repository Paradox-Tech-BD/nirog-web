/** Care-pathway regression: optional numeric query values stay omitted and dates follow profile time. */
import { describe, expect, it } from 'vitest';
import { carePlanReadPaths, localDateInTimezone } from './care-plan-read-paths';

describe('carePlanReadPaths', () => {
  it('uses the profile timezone and leaves optional limit queries to Core defaults', () => {
    const paths = carePlanReadPaths({
      profileId: 'profile',
      regimenId: 'regimen',
      timezone: 'Asia/Dhaka',
      occurrenceFrom: '2026-08-23T00:00:00.000Z',
      occurrenceTo: '2026-08-24T00:00:00.000Z',
      now: new Date('2026-08-23T18:30:00.000Z'),
    });

    expect(localDateInTimezone('Asia/Dhaka', new Date('2026-08-23T18:30:00.000Z'))).toBe('2026-08-24');
    expect(paths.occurrences).toContain('from=2026-08-23T00%3A00%3A00.000Z');
    expect(paths.occurrences).not.toContain('limit=');
    expect(paths.movements).toBe('profiles/profile/regimens/regimen/inventory/movements');
    expect(paths.dailyAdherence).toContain('fromDate=2026-08-24');
  });
});
