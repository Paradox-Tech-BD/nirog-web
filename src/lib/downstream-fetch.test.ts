import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { fetchWithBoundedTimeout } from './downstream-fetch';

describe('fetchWithBoundedTimeout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('aborts a downstream fetch when the bounded timeout expires', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    global.fetch = fetchMock as typeof fetch;

    const pending = fetchWithBoundedTimeout('https://core.example/slow', {}, 25);
    const result = pending.then(
      () => 'resolved',
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(25);

    expect(await result).not.toBe('resolved');
    const init = fetchMock.mock.calls.at(0)?.at(1) as RequestInit | undefined;
    expect(init?.signal?.aborted).toBe(true);
  });

  it('preserves caller fetch options while adding an abort signal', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    global.fetch = fetchMock as typeof fetch;

    const response = await fetchWithBoundedTimeout('https://core.example/me', { cache: 'no-store', method: 'GET' });

    expect(response.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://core.example/me',
      expect.objectContaining({ cache: 'no-store', method: 'GET', signal: expect.any(AbortSignal) }),
    );
  });
});
