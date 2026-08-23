import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    { type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`, title, status, code, detail },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

function coreApiRoot(apiBase: string): string {
  const normalized = apiBase.replace(/\/+$/, '');
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
}

export async function proxyAuthorizedCoreRequest(request: Request, path: string): Promise<NextResponse> {
  const { isAuthenticated, sessionId, getToken } = await auth();
  if (!isAuthenticated || !sessionId) return problem(401, 'UNAUTHENTICATED', 'Sign in required', 'Sign in before accessing profile-scoped evidence.');
  const configuredApiBase = process.env.NIROG_CORE_API_URL;
  if (!configuredApiBase) return problem(503, 'CORE_API_UNCONFIGURED', 'Nirog Core is not configured', 'Set NIROG_CORE_API_URL on the web server.');
  const token = await getToken();
  if (!token) return problem(401, 'CORE_TOKEN_UNAVAILABLE', 'Nirog Core token unavailable', 'Refresh the Clerk session and try again.');

  const headers = new Headers({ Authorization: `Bearer ${token}`, accept: 'application/json' });
  const contentType = request.headers.get('content-type');
  const idempotencyKey = request.headers.get('idempotency-key');
  if (contentType) headers.set('content-type', contentType);
  if (idempotencyKey) headers.set('idempotency-key', idempotencyKey);

  try {
    const query = new URL(request.url).search;
    const response = await fetch(`${coreApiRoot(configuredApiBase)}/${path}${query}`, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      cache: 'no-store',
    });
    const responseBody = [204, 205, 304].includes(response.status) ? null : await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        ...(response.headers.get('x-correlation-id') ? { 'x-correlation-id': response.headers.get('x-correlation-id')! } : {}),
      },
    });
  } catch {
    return problem(502, 'CORE_API_UNREACHABLE', 'Nirog Core is unreachable', 'The web companion could not contact the configured Core API.');
  }
}
