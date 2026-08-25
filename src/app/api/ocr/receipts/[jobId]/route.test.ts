import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ isAuthenticated: true, sessionId: 'session-test' })),
  isCrossOriginMutation: vi.fn(() => false),
  hasSupportedJsonMutationMediaType: vi.fn(() => true),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('@/lib/bounded-request-bytes', () => ({
  readBoundedRequestBytes: async (request: Request, maxBytes: number) => {
    const bytes = new Uint8Array(await request.arrayBuffer());
    return bytes.byteLength > maxBytes ? { kind: 'too-large' as const } : { kind: 'bytes' as const, bytes };
  },
}));
vi.mock('@/lib/downstream-fetch', () => ({
  fetchWithBoundedTimeout: (...args: Parameters<typeof fetch>) => fetch(...args),
  readBoundedDownstreamText: (response: Response) => response.text(),
}));
vi.mock('@/lib/relay-response-media-type', () => ({ isRelayJsonResponse: () => true }));
vi.mock('@/lib/request-media-type', () => ({ hasSupportedJsonMutationMediaType: mocks.hasSupportedJsonMutationMediaType }));
vi.mock('@/lib/browser-mutation', () => ({ isCrossOriginMutation: mocks.isCrossOriginMutation }));
vi.mock('@/lib/ocr-receipt-relay', () => ({
  ocrOpsReceiptEndpoint: (jobId: string) => `https://ocr.example/api/v1/core/receipts?job_id=${encodeURIComponent(jobId)}`,
  parseConfirmedReceiptRelayInput: () => ({
    actorId: 'review-operator',
    reason: 'Controlled confirmation completed.',
    correlationAssertion: 'a'.repeat(32),
  }),
}));

import { POST } from './route';

describe('confirmed OCR receipt relay', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('relays a bounded confirmed receipt with a private no-store response policy', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ receipt: 'accepted' }), {
      status: 202,
      headers: { 'content-type': 'application/json' },
    }));
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/ocr/receipts/job-test', {
      method: 'POST',
      body: JSON.stringify({
        actorId: 'review-operator',
        reason: 'Controlled confirmation completed.',
        correlationAssertion: 'a'.repeat(32),
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: 'job-test' }) });

    expect(response.status).toBe(202);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/core/receipts?job_id=job-test'),
      expect.objectContaining({ method: 'POST', cache: 'no-store' }),
    );
  });

  it('rejects an oversized body before attempting downstream receipt delivery', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/ocr/receipts/job-test', {
      method: 'POST',
      body: 'x'.repeat(8 * 1024 + 1),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: 'job-test' }) });

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: 'RECEIPT_REQUEST_TOO_LARGE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a non-JSON body before attempting downstream receipt delivery', async () => {
    mocks.hasSupportedJsonMutationMediaType.mockReturnValueOnce(false);
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/ocr/receipts/job-test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'unexpected',
    });

    const response = await POST(request, { params: Promise.resolve({ jobId: 'job-test' }) });

    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({ code: 'RECEIPT_REQUEST_MEDIA_TYPE_UNSUPPORTED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
