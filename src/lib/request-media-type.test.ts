import { describe, expect, it } from 'vitest';
import { hasSupportedJsonMutationMediaType } from './request-media-type';

describe('browser relay request media-type policy', () => {
  it('allows read requests and bodyless mutation requests', () => {
    expect(hasSupportedJsonMutationMediaType(new Request('https://www.nirog.me/api/core/profiles'))).toBe(true);
    expect(hasSupportedJsonMutationMediaType(new Request('https://www.nirog.me/api/core/profiles', { method: 'DELETE' }))).toBe(true);
  });

  it('allows JSON mutation requests with optional parameters', () => {
    expect(hasSupportedJsonMutationMediaType(new Request('https://www.nirog.me/api/core/profiles', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: '{}',
    }))).toBe(true);
  });

  it('rejects non-JSON and missing media types when a mutation carries a body', () => {
    expect(hasSupportedJsonMutationMediaType(new Request('https://www.nirog.me/api/core/profiles', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'unexpected',
    }))).toBe(false);
    expect(hasSupportedJsonMutationMediaType(new Request('https://www.nirog.me/api/core/profiles', {
      method: 'POST',
      body: 'unexpected',
    }))).toBe(false);
  });
});
