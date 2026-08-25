import { describe, expect, it } from 'vitest';
import { buildMedicationDraftCorrection, validateMedicationDraftConfirmation } from './medication-draft-payload';

const confirmationInput = {
  medicationName: 'Example medicine',
  doseQuantity: '1.25',
  doseUnitCode: 'mg',
  routeCode: 'oral',
  frequencyText: 'daily',
  scheduleTimes: ['08:00', '20:00'],
  intervalDays: 1,
  startedOn: '2026-08-25',
  timezone: 'Asia/Dhaka',
};

describe('buildMedicationDraftCorrection', () => {
  it('includes only the Core medication-draft correction contract fields', () => {
    expect(buildMedicationDraftCorrection({
      medicationName: 'example',
      doseQuantity: '1',
      doseUnitCode: 'mg',
      routeCode: 'oral',
      frequencyText: 'daily',
      scheduleTimes: ['08:00'],
      intervalDays: 1,
    })).toEqual({
      medicationName: 'example',
      doseQuantity: '1',
      doseUnitCode: 'mg',
      routeCode: 'oral',
      frequencyText: 'daily',
      scheduleTimes: ['08:00'],
      intervalDays: 1,
    });
  });

  it('accepts a confirmation shape that matches the Core regimen contract', () => {
    expect(validateMedicationDraftConfirmation(confirmationInput)).toBeNull();
  });

  it('blocks malformed schedule times and out-of-range intervals before any request', () => {
    expect(validateMedicationDraftConfirmation({ ...confirmationInput, scheduleTimes: ['8:00'] })).toBe(
      'Enter between 1 and 12 schedule times in HH:MM format before confirmation.',
    );
    expect(validateMedicationDraftConfirmation({ ...confirmationInput, intervalDays: 366 })).toBe(
      'Choose a whole-day interval from 1 to 365 days before confirmation.',
    );
  });

  it('blocks invalid Core-required dose and date fields before any request', () => {
    expect(validateMedicationDraftConfirmation({ ...confirmationInput, doseQuantity: 'one' })).toBe(
      'Enter a dose quantity using up to three decimal places before confirmation.',
    );
    expect(validateMedicationDraftConfirmation({ ...confirmationInput, startedOn: '2026-02-30' })).toBe(
      'Choose a valid start date before confirmation.',
    );
  });
});
