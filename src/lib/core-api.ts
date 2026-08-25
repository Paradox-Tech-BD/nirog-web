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
      typeof value.meta.correlationId === 'string' &&
      value.meta.correlationId.trim().length > 0,
  );
}

export function isCoreProblem(value: unknown): value is CoreProblem {
  if (!value || typeof value !== 'object') return false;

  const problem = value as Record<string, unknown>;
  return (
    typeof problem.type === 'string' &&
    problem.type.length > 0 &&
    typeof problem.title === 'string' &&
    problem.title.length > 0 &&
    typeof problem.status === 'number' &&
    Number.isInteger(problem.status) &&
    problem.status >= 400 &&
    problem.status <= 599 &&
    typeof problem.code === 'string' &&
    problem.code.length > 0 &&
    typeof problem.correlationId === 'string' &&
    problem.correlationId.length > 0 &&
    (problem.detail === undefined || (typeof problem.detail === 'string' && problem.detail.length > 0))
  );
}
