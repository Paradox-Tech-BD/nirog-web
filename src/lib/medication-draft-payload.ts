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
