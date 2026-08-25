export type SelectableProfile = {
  id: string;
  status: 'active' | 'archived';
};

export function firstActiveProfile<T extends SelectableProfile>(profiles: readonly T[]): T | undefined {
  return profiles.find((profile) => profile.status === 'active');
}

export function defaultActiveProfileId(profiles: readonly SelectableProfile[]): string {
  return firstActiveProfile(profiles)?.id ?? '';
}

export function profileOptionLabel(profile: Pick<SelectableProfile, 'id' | 'status'> & { preferredName: string }): string {
  return profile.status === 'archived' ? `${profile.preferredName} (archived)` : profile.preferredName;
}
