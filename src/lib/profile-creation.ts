export type ProfileCreationPayload = {
  preferredName: string;
  timezone: string;
};

export type ProfileCreationPreparation =
  | { ok: true; payload: ProfileCreationPayload }
  | { ok: false; message: string };

function isUsableTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveProfileCreationTimezone(
  accountTimezone: string,
  browserTimezone: string,
): string {
  const normalizedAccountTimezone = accountTimezone.trim();
  if (normalizedAccountTimezone && isUsableTimezone(normalizedAccountTimezone)) {
    return normalizedAccountTimezone;
  }

  const normalizedBrowserTimezone = browserTimezone.trim();
  if (normalizedBrowserTimezone && isUsableTimezone(normalizedBrowserTimezone)) {
    return normalizedBrowserTimezone;
  }

  return 'UTC';
}

export function prepareProfileCreation(
  preferredName: string,
  timezone: string,
): ProfileCreationPreparation {
  const normalizedName = preferredName.trim();
  const normalizedTimezone = timezone.trim();

  if (!normalizedName) {
    return { ok: false, message: 'Enter a profile name before continuing.' };
  }

  if (!normalizedTimezone) {
    return { ok: false, message: 'Enter a timezone before continuing.' };
  }

  if (!isUsableTimezone(normalizedTimezone)) {
    return { ok: false, message: 'Use an IANA timezone, such as Asia/Dhaka, before continuing.' };
  }

  return {
    ok: true,
    payload: {
      preferredName: normalizedName,
      timezone: normalizedTimezone,
    },
  };
}
