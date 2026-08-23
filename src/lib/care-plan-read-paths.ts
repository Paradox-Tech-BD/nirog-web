/**
 * Design system: Care pathway. These paths keep the care-plan’s bounded, profile-
 * scoped reads explicit and omit optional numeric query values that Core can safely default.
 */

export type CarePlanReadPathInput = {
  profileId: string;
  regimenId: string;
  timezone: string;
  occurrenceFrom: string;
  occurrenceTo: string;
  now?: Date;
};

export function localDateInTimezone(timezone: string, now = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function carePlanReadPaths(input: CarePlanReadPathInput) {
  const base = `profiles/${input.profileId}/regimens/${input.regimenId}`;
  const localDate = localDateInTimezone(input.timezone, input.now);

  return {
    reminderSchedules: `${base}/reminder-schedules`,
    occurrences: `${base}/reminder-occurrences?from=${encodeURIComponent(input.occurrenceFrom)}&to=${encodeURIComponent(input.occurrenceTo)}`,
    inventory: `${base}/inventory`,
    movements: `${base}/inventory/movements`,
    refillAlerts: `${base}/inventory/refill-alerts`,
    dailyAdherence: `${base}/adherence/daily?fromDate=${localDate}&toDate=${localDate}&timezone=${encodeURIComponent(input.timezone)}`,
    streak: `${base}/adherence/streak`,
    notifications: `profiles/${input.profileId}/notifications`,
  } as const;
}
