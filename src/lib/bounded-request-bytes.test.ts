import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { readBoundedRequestBytes } from './bounded-request-bytes';

describe('readBoundedRequestBytes', () => {
  it('preserves bounded request bytes', async () => {
    const request = new Request('https://www.nirog.me/api/test', { method: 'POST', body: 'bounded' });

    const result = await readBoundedRequestBytes(request, 8);

    expect(result.kind).toBe('bytes');
    if (result.kind === 'bytes') expect(new TextDecoder().decode(result.bytes)).toBe('bounded');
  });

  it('rejects an oversized declared request without reading its stream', async () => {
    const request = new Request('https://www.nirog.me/api/test', {
      method: 'POST',
      body: 'ignored',
      headers: { 'content-length': '9' },
    });

    expect(await readBoundedRequestBytes(request, 8)).toEqual({ kind: 'too-large' });
  });

  it('rejects a streamed request that crosses the byte cap', async () => {
    const request = new Request('https://www.nirog.me/api/test', {
      method: 'POST',
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('12345'));
          controller.enqueue(new TextEncoder().encode('67890'));
          controller.close();
        },
      }),
      // Node's Request implementation requires this for a streaming request body.
      duplex: 'half',
    } as RequestInit);

    expect(await readBoundedRequestBytes(request, 8)).toEqual({ kind: 'too-large' });
  });

  it('reports an unreadable request stream separately from an oversized request', async () => {
    const request = new Request('https://www.nirog.me/api/test', {
      method: 'POST',
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.error(new Error('stream read failed'));
        },
      }),
      duplex: 'half',
    } as RequestInit);

    expect(await readBoundedRequestBytes(request, 8)).toEqual({ kind: 'unreadable' });
  });
});
