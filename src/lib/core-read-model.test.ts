import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCore } from './core-read-model';

describe('readCore response boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a successful no-content response for idempotent mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(readCore<void>('profiles/example/notification-policies/recipient', { method: 'DELETE' })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/core/profiles/example/notification-policies/recipient', expect.objectContaining({ method: 'DELETE', cache: 'no-store' }));
  });

  it('continues to unwrap Core success envelopes for JSON reads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { status: 'active' } })));

    await expect(readCore<{ status: string }>('example')).resolves.toEqual({ status: 'active' });
  });
});
