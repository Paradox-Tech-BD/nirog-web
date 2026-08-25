import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { fetchWithBoundedTimeout, readBoundedDownstreamText } from './downstream-fetch';

const privateNoStore = 'private, no-store';
export const MAX_CORE_RELAY_REQUEST_BODY_BYTES = 64 * 1024;

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    { type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`, title, status, code, detail },
    { status, headers: { 'content-type': 'application/problem+json', 'cache-control': privateNoStore } },
  );
}

function coreApiRoot(apiBase: string): string {
  const normalized = apiBase.replace(/\/+$/, '');
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
}

async function readBoundedRequestBody(request: Request): Promise<Blob | null | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD' || !request.body) return undefined;

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CORE_RELAY_REQUEST_BODY_BYTES) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalLength += value.byteLength;
      if (totalLength > MAX_CORE_RELAY_REQUEST_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Blob([body]);
}

export async function proxyAuthorizedCoreRequest(request: Request, path: string): Promise<NextResponse> {
  const { isAuthenticated, sessionId, getToken } = await auth();
  if (!isAuthenticated || !sessionId) return problem(401, 'UNAUTHENTICATED', 'Sign in required', 'Sign in before accessing profile-scoped evidence.');
  const configuredApiBase = process.env.NIROG_CORE_API_URL;
  if (!configuredApiBase) return problem(503, 'CORE_API_UNCONFIGURED', 'Nirog Core is not configured', 'Set NIROG_CORE_API_URL on the web server.');
  const token = await getToken();
  if (!token) return problem(401, 'CORE_TOKEN_UNAVAILABLE', 'Nirog Core token unavailable', 'Refresh the Clerk session and try again.');

  const acceptsEventStream = request.headers.get('accept')?.includes('text/event-stream') === true;
  const headers = new Headers({ Authorization: `Bearer ${token}`, accept: acceptsEventStream ? 'text/event-stream' : 'application/json' });
  const contentType = request.headers.get('content-type');
  const idempotencyKey = request.headers.get('idempotency-key');
  if (contentType) headers.set('content-type', contentType);
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);

  try {
    const query = new URL(request.url).search;
    const apiRoot = coreApiRoot(configuredApiBase);
    const body = await readBoundedRequestBody(request);
    if (body === null) {
      return problem(
        413,
        'CORE_REQUEST_TOO_LARGE',
        'Core request is too large',
        `Keep browser-to-Core request bodies at or below ${MAX_CORE_RELAY_REQUEST_BODY_BYTES} bytes.`,
      );
    }
    const response = await fetchWithBoundedTimeout(`${apiRoot}/${path}${query}`, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });
    const responseHeaders = {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      ...(response.headers.get('x-correlation-id') ? { 'x-correlation-id': response.headers.get('x-correlation-id')! } : {}),
      'cache-control': acceptsEventStream ? `${privateNoStore}, no-cache, no-transform` : privateNoStore,
      ...(acceptsEventStream ? { 'x-accel-buffering': 'no' } : {}),
    };
    if (acceptsEventStream && response.body) {
      return new NextResponse(response.body, { status: response.status, headers: responseHeaders });
    }
    const noContentResponse = [204, 205, 304].includes(response.status);
    const responseBody = noContentResponse ? null : await readBoundedDownstreamText(response);
    if (!noContentResponse && responseBody === null) {
      return problem(502, 'CORE_RESPONSE_TOO_LARGE', 'Core response is too large', 'The Core response exceeded the browser relay safety limit.');
    }
    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return problem(502, 'CORE_API_UNREACHABLE', 'Nirog Core is unreachable', 'The web companion could not contact the configured Core API.');
  }
}
