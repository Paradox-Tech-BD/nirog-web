import { describe, expect, it } from 'vitest';
import {
  defaultActiveProfileId,
  firstActiveProfile,
  isArchivedProfileSelection,
  profileOptionLabel,
} from './profile-selection';

describe('active profile selection', () => {
  it('selects the first active profile even when an archived profile appears first', () => {
    const profiles = [
      { id: 'archived-profile', status: 'archived' as const },
      { id: 'active-profile', status: 'active' as const },
    ];

    expect(firstActiveProfile(profiles)?.id).toBe('active-profile');
    expect(defaultActiveProfileId(profiles)).toBe('active-profile');
  });

  it('does not automatically select an archived profile when no active profile exists', () => {
    expect(defaultActiveProfileId([{ id: 'archived-profile', status: 'archived' }])).toBe('');
    expect(defaultActiveProfileId([])).toBe('');
  });

  it('labels an archived profile without changing its selectable identity', () => {
    expect(profileOptionLabel({ id: 'active-profile', preferredName: 'Amina', status: 'active' })).toBe('Amina');
    expect(profileOptionLabel({ id: 'archived-profile', preferredName: 'Amina', status: 'archived' })).toBe('Amina (archived)');
  });

  it('recognizes only an explicitly selected archived profile as inactive', () => {
    const profiles = [
      { id: 'active-profile', status: 'active' as const },
      { id: 'archived-profile', status: 'archived' as const },
    ];

    expect(isArchivedProfileSelection(profiles, 'archived-profile')).toBe(true);
    expect(isArchivedProfileSelection(profiles, 'active-profile')).toBe(false);
    expect(isArchivedProfileSelection(profiles, 'unknown-profile')).toBe(false);
  });
});
