import { describe, expect, it } from 'vitest';
import { prepareProfileCreation, resolveProfileCreationTimezone } from './profile-creation';

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

  it('keeps an invalid timezone from reaching Core', () => {
    expect(prepareProfileCreation('Alex Morgan', 'Mars/Olympus')).toEqual({
      ok: false,
      message: 'Use an IANA timezone, such as Asia/Dhaka, before continuing.',
    });
  });

  it('keeps a valid account timezone as the default profile timezone', () => {
    expect(resolveProfileCreationTimezone(' Asia/Dhaka ', 'Europe/London')).toBe('Asia/Dhaka');
  });

  it('uses the browser timezone when the account preference is blank or invalid', () => {
    expect(resolveProfileCreationTimezone(' ', 'Europe/London')).toBe('Europe/London');
    expect(resolveProfileCreationTimezone('Mars/Olympus', 'Europe/London')).toBe('Europe/London');
  });

  it('falls back to UTC when neither supplied timezone is usable', () => {
    expect(resolveProfileCreationTimezone('Mars/Olympus', 'Moon/Base')).toBe('UTC');
  });
});
