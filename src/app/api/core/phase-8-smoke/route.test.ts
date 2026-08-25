import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => ({
    isAuthenticated: true,
    sessionId: 'session-test',
    getToken: async () => 'test-token',
  })),
  isCrossOriginMutation: vi.fn(() => false),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('@/lib/browser-mutation', () => ({ isCrossOriginMutation: mocks.isCrossOriginMutation }));

import { GET } from './route';

describe('Phase 8 smoke route cache policy', () => {
  const originalCoreUrl = process.env.NIROG_CORE_API_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.NIROG_CORE_API_URL = originalCoreUrl;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('relays the bounded synthetic extraction status with a private no-store response policy', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    global.fetch = fetchMock as typeof fetch;
    const request = new NextRequest(
      'https://www.nirog.me/api/core/phase-8-smoke?evidenceId=00000000-0000-4000-8000-000000000001',
    );

    const response = await GET(request);

    if (!response) throw new Error('The smoke route did not return a response.');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ocr-extractions'),
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
