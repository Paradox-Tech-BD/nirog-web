import { describe, expect, it } from 'vitest';
import { isCrossOriginMutation } from './browser-mutation';

describe('browser mutation origin guard', () => {
  it('rejects only explicit cross-origin mutation requests', () => {
    expect(isCrossOriginMutation(new Request('https://www.nirog.me/api/core/profiles', { method: 'GET', headers: { origin: 'https://elsewhere.example' } }))).toBe(false);
    expect(isCrossOriginMutation(new Request('https://www.nirog.me/api/core/profiles', { method: 'POST' }))).toBe(false);
    expect(isCrossOriginMutation(new Request('https://www.nirog.me/api/core/profiles', { method: 'POST', headers: { origin: 'https://www.nirog.me' } }))).toBe(false);
    expect(isCrossOriginMutation(new Request('https://www.nirog.me/api/core/profiles', { method: 'POST', headers: { origin: 'https://elsewhere.example' } }))).toBe(true);
  });
});
