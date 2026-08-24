import { describe, expect, it } from 'vitest';
import { prepareProfileCreation } from './profile-creation';

describe('prepareProfileCreation', () => {
  it('trims the Core profile payload without changing valid fields', () => {
    expect(prepareProfileCreation('  Alex Morgan  ', '  Asia/Dhaka  ')).toEqual({
      ok: true,
      payload: { preferredName: 'Alex Morgan', timezone: 'Asia/Dhaka' },
    });
  });

  it('keeps a blank profile name from reaching Core', () => {
    expect(prepareProfileCreation('  ', 'Asia/Dhaka')).toEqual({
      ok: false,
      message: 'Enter a profile name before continuing.',
    });
  });

  it('keeps a blank timezone from reaching Core', () => {
    expect(prepareProfileCreation('Alex Morgan', '  ')).toEqual({
      ok: false,
      message: 'Enter a timezone before continuing.',
    });
  });
});
