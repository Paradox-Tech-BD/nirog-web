// Clinical Ledger design: the browser calls only same-origin routes; server code owns Core bearer propagation.
export type CoreProblem = {
  type: string;
  title: string;
  status: number;
  code: string;
  correlationId: string;
  detail?: string;
};

export type AccountProjection = {
  account: {
    id: string;
    displayName?: string;
    primaryEmail?: string;
    avatarUrl?: string;
  } | null;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    snoozeDurationMinutes: number;
    digestEnabled: boolean;
    notificationsEnabled: boolean;
  };
  profiles: Array<{
    id: string;
    preferredName: string;
    timezone: string;
    status: 'active' | 'archived';
    dateOfBirth?: string;
  }>;
};

export type ProfileGrantProjection = {
  id: string;
  profileId: string;
  granteeAccountId: string;
  roleCode: 'caregiver' | 'curator' | 'viewer';
  permissions: string[];
  status: 'active' | 'revoked' | 'expired';
  expiresAt?: string;
};

export type CoreSuccess<T> = {
  data: T;
  meta: { correlationId: string };
};

export function isCoreSuccess(value: unknown): value is CoreSuccess<unknown> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'data' in value &&
      'meta' in value &&
      value.meta &&
      typeof value.meta === 'object' &&
      'correlationId' in value.meta &&
      typeof value.meta.correlationId === 'string',
  );
}

export function isCoreProblem(value: unknown): value is CoreProblem {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'status' in value &&
      'code' in value &&
      'title' in value,
  );
}
