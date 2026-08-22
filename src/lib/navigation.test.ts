import { describe, expect, it } from 'vitest';
import { appNavigation, isNavigationActive, signOutRedirectUrl } from './navigation';

describe('patient-facing navigation policy', () => {
  it('keeps the signed-in navigation limited to implemented patient-facing routes', () => {
    expect(appNavigation).toEqual([
      { href: '/', label: 'Overview' },
      { href: '/evidence', label: 'Prescription evidence' },
    ]);
    expect(isNavigationActive('/', '/')).toBe(true);
    expect(isNavigationActive('/evidence', '/evidence')).toBe(true);
    expect(isNavigationActive('/evidence/review', '/evidence')).toBe(true);
    expect(isNavigationActive('/evidence', '/')).toBe(false);
  });

  it('returns people to the public home after a deliberate sign-out', () => {
    expect(signOutRedirectUrl).toBe('/');
  });
});
