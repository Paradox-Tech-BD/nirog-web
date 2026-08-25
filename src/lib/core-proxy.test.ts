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
import { MAX_BUFFERED_DOWNSTREAM_RESPONSE_BYTES } from './downstream-fetch';

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

  it('preserves allowlisted Core rate-limit metadata without relaying arbitrary downstream headers', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ code: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429,
      headers: {
        'content-type': 'application/problem+json',
        'retry-after': '30',
        'ratelimit-limit': '100',
        'ratelimit-remaining': '0',
        'ratelimit-reset': '30',
        'x-untrusted-core-header': 'must-not-be-relayed',
      },
    }));
    global.fetch = fetchMock as typeof fetch;

    const response = await proxyAuthorizedCoreRequest(
      new Request('https://www.nirog.me/api/core/profiles'),
      'profiles',
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('ratelimit-limit')).toBe('100');
    expect(response.headers.get('ratelimit-remaining')).toBe('0');
    expect(response.headers.get('ratelimit-reset')).toBe('30');
    expect(response.headers.get('x-untrusted-core-header')).toBeNull();
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

  it('rejects an oversized buffered Core response before relaying it to the browser', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('x'.repeat(MAX_BUFFERED_DOWNSTREAM_RESPONSE_BYTES + 1)));
        controller.close();
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/core/profiles');

    const response = await proxyAuthorizedCoreRequest(request, 'profiles');

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toMatchObject({ code: 'CORE_RESPONSE_TOO_LARGE' });
  });

  it('rejects an unsupported Core response media type before relaying it under the Web origin', async () => {
    process.env.NIROG_CORE_API_URL = 'https://core.example';
    const fetchMock = vi.fn(async () => new Response('<html>unexpected</html>', {
      status: 502,
      headers: { 'content-type': 'text/html' },
    }));
    global.fetch = fetchMock as typeof fetch;
    const request = new Request('https://www.nirog.me/api/core/profiles');

    const response = await proxyAuthorizedCoreRequest(request, 'profiles');

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({ code: 'CORE_RESPONSE_MEDIA_TYPE_UNSUPPORTED' });
  });
});
