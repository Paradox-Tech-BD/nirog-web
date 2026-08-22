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

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new CoreReadError(unreadableProblem(response.status));
  }

  if (!response.ok) {
    throw new CoreReadError(isCoreProblem(body) ? body : unreadableProblem(response.status));
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
