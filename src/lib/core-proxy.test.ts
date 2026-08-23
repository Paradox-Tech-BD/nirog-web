import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(async () => ({
    isAuthenticated: true,
    sessionId: 'session-test',
    getToken: async () => 'test-token',
  })),
}));

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }));
vi.mock('server-only', () => ({}));

import { proxyAuthorizedCoreRequest } from './core-proxy';

describe('proxyAuthorizedCoreRequest', () => {
  const originalCoreUrl = process.env.NIROG_CORE_API_URL;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.NIROG_CORE_API_URL = originalCoreUrl;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('preserves required occurrence-window query parameters when forwarding to Core', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    global.fetch = fetchMock as typeof fetch;
    const request = new Request(
      'https://www.nirog.me/api/core/profiles/profile/regimens/regimen/reminder-occurrences?from=2026-08-23T00%3A00%3A00.000Z&to=2026-08-24T00%3A00%3A00.000Z',
    );

    const response = await proxyAuthorizedCoreRequest(
      request,
      'profiles/profile/regimens/regimen/reminder-occurrences',
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://core.example/api/v1/profiles/profile/regimens/regimen/reminder-occurrences?from=2026-08-23T00%3A00%3A00.000Z&to=2026-08-24T00%3A00%3A00.000Z',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
