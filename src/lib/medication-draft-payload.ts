/**
 * Medication-draft command boundary: Core accepts only correction fields here.
 * Regimen timing is intentionally submitted in the separate regimen command.
 */
export type MedicationDraftCorrectionInput = {
  medicationName: string;
  doseQuantity: string;
  doseUnitCode: string;
  routeCode: string;
  frequencyText: string;
  scheduleTimes: string[];
  intervalDays: number;
};

export type MedicationDraftConfirmationInput = MedicationDraftCorrectionInput & {
  startedOn: string;
  timezone: string;
};

const localTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const doseQuantityPattern = /^[0-9]+(?:\.[0-9]{1,3})?$/;
const supportedDoseUnits = new Set(['mg', 'mcg', 'ml', 'tablet', 'capsule', 'drop', 'puff', 'unit']);
const supportedRoutes = new Set(['oral', 'topical', 'inhaled', 'injection', 'other']);

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateMedicationDraftConfirmation(input: MedicationDraftConfirmationInput): string | null {
  if (!input.medicationName.trim() || input.medicationName.trim().length > 240) {
    return 'Enter a medication name of up to 240 characters before confirmation.';
  }

  if (!doseQuantityPattern.test(input.doseQuantity.trim()) || input.doseQuantity.trim().length > 16) {
    return 'Enter a dose quantity using up to three decimal places before confirmation.';
  }

  if (!supportedDoseUnits.has(input.doseUnitCode) || !supportedRoutes.has(input.routeCode)) {
    return 'Choose a supported dose unit and route before confirmation.';
  }

  if (!input.frequencyText.trim()) {
    return 'Enter the frequency text before confirmation.';
  }

  if (!isCalendarDate(input.startedOn)) {
    return 'Choose a valid start date before confirmation.';
  }

  if (!input.timezone.trim() || input.timezone.trim().length > 64) {
    return 'A valid profile timezone is required before confirmation.';
  }

  if (input.scheduleTimes.length === 0 || input.scheduleTimes.length > 12 || input.scheduleTimes.some((time) => !localTimePattern.test(time))) {
    return 'Enter between 1 and 12 schedule times in HH:MM format before confirmation.';
  }

  if (!Number.isInteger(input.intervalDays) || input.intervalDays < 1 || input.intervalDays > 365) {
    return 'Choose a whole-day interval from 1 to 365 days before confirmation.';
  }

  return null;
}

export function buildMedicationDraftCorrection(input: MedicationDraftCorrectionInput) {
  return {
    medicationName: input.medicationName,
    doseQuantity: input.doseQuantity,
    doseUnitCode: input.doseUnitCode,
    routeCode: input.routeCode,
    frequencyText: input.frequencyText,
    scheduleTimes: input.scheduleTimes,
    intervalDays: input.intervalDays,
  };
}
