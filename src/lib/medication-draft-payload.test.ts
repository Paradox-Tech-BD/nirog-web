import { describe, expect, it } from 'vitest';
import { buildMedicationDraftCorrection } from './medication-draft-payload';

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
});
