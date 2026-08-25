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

import { MAX_CORE_RELAY_REQUEST_BODY_BYTES, proxyAuthorizedCoreRequest } from './core-proxy';

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
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://core.example/api/v1/profiles/profile/regimens/regimen/reminder-occurrences?from=2026-08-23T00%3A00%3A00.000Z&to=2026-08-24T00%3A00%3A00.000Z',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('forwards an authorized notification stream without buffering the event body', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response('event: notification.ready\ndata: {}\n\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
    }));
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/core/profiles/profile/notifications/stream', {
      headers: { accept: 'text/event-stream' },
    });

    const response = await proxyAuthorizedCoreRequest(request, 'profiles/profile/notifications/stream');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('cache-control')).toBe('private, no-store, no-cache, no-transform');
    expect(await response.text()).toContain('notification.ready');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://core.example/api/v1/profiles/profile/notifications/stream',
      expect.objectContaining({ method: 'GET' }),
    );
    const init = fetchMock.mock.calls.at(0)?.at(1) as RequestInit | undefined;
    expect((init?.headers as Headers).get('accept')).toBe('text/event-stream');
  });

  it('relays the aggregate operations status read with the caller token and no request body', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { generatedAt: '2026-08-25T00:00:00.000Z' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/core/platform/operations/status');

    const response = await proxyAuthorizedCoreRequest(request, 'platform/operations/status');

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://core.example/api/v1/platform/operations/status',
      expect.objectContaining({ method: 'GET', body: undefined }),
    );
    const init = fetchMock.mock.calls.at(0)?.at(1) as RequestInit | undefined;
    expect((init?.headers as Headers).get('authorization')).toBe('Bearer test-token');
  });

  it('forwards a bounded mutation body without changing its bytes', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;
    const body = JSON.stringify({ timezone: 'Asia/Dhaka' });
    const request = new Request('https://www.nirog.me/api/core/profiles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

    const response = await proxyAuthorizedCoreRequest(request, 'profiles');

    expect(response.status).toBe(204);
    const init = fetchMock.mock.calls.at(0)?.at(1) as RequestInit | undefined;
    expect(await (init?.body as Blob).text()).toBe(body);
  });

  it('rejects an oversized mutation body before any Core fetch', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn();
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/core/profiles', {
      method: 'POST',
      body: 'x'.repeat(MAX_CORE_RELAY_REQUEST_BODY_BYTES + 1),
    });

    const response = await proxyAuthorizedCoreRequest(request, 'profiles');

    expect(response.status).toBe(413);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ code: 'CORE_REQUEST_TOO_LARGE' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
