const defaultOcrOpsBase = 'https://nirogocr-2vq43ahc.manus.space';

export type ConfirmedReceiptRelayInput = {
  readonly actorId: string;
  readonly actorName?: string;
  readonly reason: string;
  readonly correlationAssertion: string;
};

function nonEmptyString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
}

export function parseConfirmedReceiptRelayInput(value: unknown): ConfirmedReceiptRelayInput | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    !nonEmptyString(candidate.actorId, 128) ||
    !nonEmptyString(candidate.reason, 1000) ||
    !nonEmptyString(candidate.correlationAssertion, 4096) ||
    candidate.correlationAssertion.length < 32
  ) {
    return null;
  }
  if (candidate.actorName !== undefined && !nonEmptyString(candidate.actorName, 256)) return null;
  return {
    actorId: candidate.actorId,
    ...(candidate.actorName ? { actorName: candidate.actorName } : {}),
    reason: candidate.reason,
    correlationAssertion: candidate.correlationAssertion,
  };
}

export function ocrOpsReceiptEndpoint(jobId: string): string {
  const base = (process.env.NIROG_OCR_OPS_URL ?? defaultOcrOpsBase).replace(/\/+$/, '');
  return `${base}/api/v1/core/receipts?job_id=${encodeURIComponent(jobId)}`;
}
