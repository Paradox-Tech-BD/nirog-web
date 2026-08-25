import { afterEach, describe, expect, it, vi } from 'vitest';
import { CoreReadError, coreMessage, readCore } from './core-read-model';

describe('readCore response boundary', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts a successful no-content response for idempotent mutations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(readCore<void>('profiles/example/notification-policies/recipient', { method: 'DELETE' })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/core/profiles/example/notification-policies/recipient', expect.objectContaining({ method: 'DELETE', cache: 'no-store' }));
  });

  it('continues to unwrap Core success envelopes for JSON reads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { status: 'active' }, meta: { correlationId: 'not-provided' } })));

    await expect(readCore<{ status: string }>('example')).resolves.toEqual({ status: 'active' });
  });

  it('rejects a successful response without the required Core envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ meta: { correlationId: 'not-provided' } })));

    await expect(readCore<{ status: string }>('example')).rejects.toMatchObject({
      name: 'CoreReadError',
      problem: {
        status: 502,
        code: 'CORE_RESPONSE_UNREADABLE',
      },
    });
  });

  it('rejects a successful response with blank correlation metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      data: { status: 'active' },
      meta: { correlationId: '   ' },
    })));

    await expect(readCore<{ status: string }>('example')).rejects.toMatchObject({
      problem: {
        status: 502,
        code: 'CORE_RESPONSE_UNREADABLE',
      },
    });
  });

  it('preserves a valid Core problem response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'https://nirog.app/problems/validation-failed',
      title: 'Request validation failed',
      status: 400,
      code: 'VALIDATION_FAILED',
      correlationId: 'not-provided',
      detail: 'The request does not satisfy the declared API contract.',
    }, { status: 400 })));

    await expect(readCore<{ status: string }>('example')).rejects.toMatchObject({
      problem: {
        status: 400,
        code: 'VALIDATION_FAILED',
      },
    });
  });

  it('rejects a malformed Core problem response rather than surfacing its detail', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      type: 'https://nirog.app/problems/access-denied',
      title: 'Access denied',
      status: 403,
      code: 'ACCESS_DENIED',
      correlationId: 'not-provided',
      detail: { message: 'This value must not reach a UI error surface.' },
    }, { status: 403 })));

    await expect(readCore<{ status: string }>('example')).rejects.toMatchObject({
      problem: {
        status: 403,
        code: 'CORE_RESPONSE_UNREADABLE',
      },
    });
  });
});

describe('coreMessage', () => {
  it('uses the caller context for Core’s generic non-disclosing access denial', () => {
    const fallback = 'Care-plan data could not be loaded. No care record was changed.';
    const error = new CoreReadError({
      type: 'https://nirog.app/problems/access-denied',
      title: 'Access denied',
      status: 403,
      code: 'ACCESS_DENIED',
      correlationId: 'not-provided',
      detail: 'This detail must not be shown in a generic denial surface.',
    });

    expect(coreMessage(error, fallback)).toBe(fallback);
  });

  it('preserves Core’s safe message for non-denial problems', () => {
    const error = new CoreReadError({
      type: 'https://nirog.app/problems/validation-failed',
      title: 'Request validation failed',
      status: 400,
      code: 'VALIDATION_FAILED',
      correlationId: 'not-provided',
      detail: 'The request does not satisfy the declared API contract.',
    });

    expect(coreMessage(error, 'Fallback')).toBe('The request does not satisfy the declared API contract.');
  });
});
