import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isRelayEventStreamResponse, isRelayJsonResponse } from './relay-response-media-type';

describe('relay response media-type policy', () => {
  it('allows documented JSON and problem response types with optional parameters', () => {
    expect(isRelayJsonResponse(new Response('{}', { headers: { 'content-type': 'application/json; charset=utf-8' } }))).toBe(true);
    expect(isRelayJsonResponse(new Response('{}', { headers: { 'content-type': 'application/problem+json' } }))).toBe(true);
  });

  it('allows notification event streams only through their dedicated media type', () => {
    expect(isRelayEventStreamResponse(new Response('', { headers: { 'content-type': 'text/event-stream; charset=utf-8' } }))).toBe(true);
    expect(isRelayEventStreamResponse(new Response('', { headers: { 'content-type': 'application/json' } }))).toBe(false);
  });

  it('rejects missing, HTML, and vendor media types that are outside the relay contract', () => {
    expect(isRelayJsonResponse(new Response('{}'))).toBe(false);
    expect(isRelayJsonResponse(new Response('<html>unexpected</html>', { headers: { 'content-type': 'text/html' } }))).toBe(false);
    expect(isRelayJsonResponse(new Response('{}', { headers: { 'content-type': 'application/vnd.core+json' } }))).toBe(false);
  });
});
