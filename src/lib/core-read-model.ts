/**
 * Nirog Web data-boundary reminder: this module mediates browser reads through
 * the same-origin Web proxy. It never assumes a Core response is a clinical
 * commit, and it never exposes raw worker or storage payloads to the UI.
 */
import type { CoreProblem, CoreSuccess, ProfileGrantProjection } from './core-api';
import { isCoreProblem } from './core-api';

export type PrescriptionSummary = {
  id: string;
  status: 'active' | 'archived';
  prescriberLabel?: string;
  issuedOn?: string;
  createdAt: string;
};

export type EvidenceSummary = {
  id: string;
  contentType: string;
  declaredSizeBytes: number;
  status: string;
  uploadAuthorizedAt?: string;
  uploadedAt?: string;
  processedAt?: string;
};

export type ExtractionSummary = {
  id: string;
  status: string;
  resultSource: 'demo' | 'ml';
  demoFixtureId?: string;
  modelName?: string;
  pipelineVersion?: string;
  candidateCount: number;
};

export type MedicationDraftSummary = {
  id: string;
  profileId: string;
  prescriptionId: string;
  evidenceId: string;
  extractionId: string;
  candidateIndex: number;
  status: 'ready' | 'needs_correction' | 'submitted' | 'superseded';
  medicationName?: string;
  medicationNameConfidence?: number;
  doseQuantity?: string;
  doseUnitCode?: string;
  doseConfidence?: number;
  routeCode?: string;
  routeConfidence?: number;
  frequencyText?: string;
  frequencyConfidence?: number;
  scheduleTimes: string[];
  intervalDays: number;
  submittedRegimenId?: string;
};

export type ProfileGrantSummary = ProfileGrantProjection;

export type ProfileAccessContext = {
  profileId: string;
  accessKind: 'owner' | 'grant';
  roleCode?: 'caregiver' | 'curator' | 'viewer';
  permissions: string[];
};

export type RegimenScheduleSummary = {
  id: string;
  timezone: string;
  localTime: string;
  intervalDays: number;
};

export type RegimenSummary = {
  id: string;
  medicationName: string;
  doseQuantity: string;
  doseUnitCode: string;
  routeCode: string;
  status: 'active' | 'archived';
  startedOn: string;
  schedules: RegimenScheduleSummary[];
};

export type ReminderScheduleSummary = {
  id: string;
  regimenScheduleId: string;
  channel: 'push' | 'in_app';
  status: 'active' | 'paused' | 'archived';
  defaultSnoozeMinutes: number;
  windowBeforeMinutes: number;
  windowAfterMinutes: number;
};

export type ReminderOccurrenceSummary = {
  id: string;
  scheduledFor: string;
  state: 'scheduled' | 'delivered' | 'snoozed' | 'acknowledged' | 'expired' | 'cancelled';
  deliveredAt?: string;
  acknowledgedAt?: string;
};

export type InAppNotificationSummary = {
  id: string;
  regimenId: string;
  reminderOccurrenceId: string;
  kind: 'reminder_due';
  status: 'unread' | 'read';
  createdAt: string;
};

/** Safe external-delivery projection: configuration health is not send evidence. */
export type ExternalDeliveryStatusSummary = {
  provider: 'disabled' | 'resend_email';
  state: 'disabled' | 'ready';
  channel?: 'email';
};

/** Safe provider-lifecycle metadata: never recipient, message, token, or credential data. */
export type ExternalDeliveryAttemptSummary = {
  id: string;
  profileId: string;
  regimenId: string;
  reminderOccurrenceId: string;
  channel: 'email';
  provider: 'resend';
  status: 'accepted' | 'failed' | 'delivered' | 'bounced';
  attemptCount: number;
  lastAttemptAt?: string;
  createdAt: string;
};

/** Safe owner-managed notification intent; contact channels and delivery targets stay in Core. */
export type NotificationPolicySummary = {
  id: string;
  profileId: string;
  recipientAccountId: string;
  recipientKind: 'owner' | 'delegated';
  eventClass: 'reminder_due' | 'refill_alert';
  channel: 'in_app' | 'email' | 'push' | 'sms';
  timezone: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  status: 'active' | 'withdrawn';
  effectiveAt: string;
  withdrawnAt?: string;
};

export type InventorySummary = {
  id: string;
  trackingStatus: 'active' | 'paused';
  quantityOnHand: string;
  refillThreshold?: string;
};

export type InventoryMovementSummary = {
  id: string;
  kind: 'refill' | 'adjustment' | 'dose_consumption' | 'reversal';
  quantityDelta: string;
  occurredAt: string;
};

export type RefillAlertSummary = {
  id: string;
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledgedAt?: string;
};

export type DailyAdherenceSummary = {
  localDate: string;
  scheduledCount: number;
  takenCount: number;
  lateCount: number;
  missedCount: number;
  skippedCount: number;
};

export type AdherenceStreakSummary = {
  currentStreakDays: number;
  longestStreakDays: number;
  lastQualifyingDate?: string;
};

/** Aggregate-only Core operator snapshot. It intentionally contains no work-item or patient data. */
export type OperationsStatusSnapshot = {
  generatedAt: string;
  outbox: { claimable: number; deadLettered: number };
  ocr: { retryScheduled: number; deadLettered: number };
  inAppInbox: { oldestUnacknowledgedAgeSeconds: number | null };
  migration: { state: 'external_monitor_required' };
};

export class CoreReadError extends Error {
  readonly problem: CoreProblem;

  constructor(problem: CoreProblem) {
    super(problem.detail ?? problem.title);
    this.name = 'CoreReadError';
    this.problem = problem;
  }
}

function unreadableProblem(status = 502): CoreProblem {
  return {
    type: 'https://nirog.app/problems/core-response-unreadable',
    title: 'Care data could not be read',
    status,
    code: 'CORE_RESPONSE_UNREADABLE',
    correlationId: 'not-provided',
    detail: 'Nirog Core returned a response the companion could not safely interpret.',
  };
}

export async function readCore<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/core/${path}`, { cache: 'no-store', ...init });
  } catch {
    throw new CoreReadError({
      type: 'https://nirog.app/problems/web-network-unavailable',
      title: 'Care data is temporarily unavailable',
      status: 502,
      code: 'WEB_NETWORK_UNAVAILABLE',
      correlationId: 'not-provided',
      detail: 'The Web companion could not reach Nirog Core. Your care record was not changed.',
    });
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new CoreReadError(unreadableProblem(response.status));
    }
    throw new CoreReadError(isCoreProblem(body) ? body : unreadableProblem(response.status));
  }

  if (response.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CoreReadError(unreadableProblem(response.status));
  }

  return (body as CoreSuccess<T>).data;
}

export function coreMessage(error: unknown, fallback: string): string {
  if (error instanceof CoreReadError) return error.problem.detail ?? error.problem.title;
  return fallback;
}

export function newestEvidence(evidence: readonly EvidenceSummary[]): EvidenceSummary | undefined {
  return [...evidence].sort((left, right) => {
    const leftTime = Date.parse(left.uploadedAt ?? left.processedAt ?? left.uploadAuthorizedAt ?? '');
    const rightTime = Date.parse(right.uploadedAt ?? right.processedAt ?? right.uploadAuthorizedAt ?? '');
    return Number.isFinite(rightTime) && Number.isFinite(leftTime) ? rightTime - leftTime : 0;
  })[0];
}
