export type ProfileCreationPayload = {
  preferredName: string;
  timezone: string;
};

export type ProfileCreationPreparation =
  | { ok: true; payload: ProfileCreationPayload }
  | { ok: false; message: string };

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

  return {
    ok: true,
    payload: {
      preferredName: normalizedName,
      timezone: normalizedTimezone,
    },
  };
}
