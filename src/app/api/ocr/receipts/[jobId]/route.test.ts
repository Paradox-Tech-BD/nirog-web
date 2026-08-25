import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => ({ isAuthenticated: true, sessionId: 'session-test' })),
  isCrossOriginMutation: vi.fn(() => false),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('@/lib/downstream-fetch', () => ({ fetchWithBoundedTimeout: (...args: Parameters<typeof fetch>) => fetch(...args) }));
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
});
