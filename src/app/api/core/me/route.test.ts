import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => ({
    isAuthenticated: true,
    sessionId: 'session-test',
    getToken: async () => 'test-token',
  })),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('@/lib/downstream-fetch', () => ({
  fetchWithBoundedTimeout: (...args: Parameters<typeof fetch>) => fetch(...args),
  readBoundedDownstreamText: (response: Response) => response.text(),
}));

import { GET } from './route';

describe('account projection relay', () => {
  const originalCoreUrl = process.env.NIROG_CORE_API_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.NIROG_CORE_API_URL = originalCoreUrl;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('relays the account projection with a private no-store response policy', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { profiles: [] } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    global.fetch = fetchMock as typeof fetch;

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://core.example/api/v1/me',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
