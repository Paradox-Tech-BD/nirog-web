// Clinical Ledger design: this route forwards Clerk's session-bound token; Core relies on its sid, aud, and azp claims.
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { fetchWithBoundedTimeout, readBoundedDownstreamText } from '@/lib/downstream-fetch';
import { isRelayJsonResponse } from '@/lib/relay-response-media-type';

const privateNoStore = 'private, no-store';

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    {
      type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`,
      title,
      status,
      code,
      detail,
    },
    { status, headers: { 'content-type': 'application/problem+json', 'cache-control': privateNoStore } },
  );
}

export function coreApiRoot(apiBase: string): string {
  const normalized = apiBase.replace(/\/+$/, '');
  return normalized.endsWith('/api/v1') ? normalized : `${normalized}/api/v1`;
}

export async function GET() {
  const { isAuthenticated, sessionId, getToken } = await auth();
  if (!isAuthenticated || !sessionId) {
    return problem(401, 'UNAUTHENTICATED', 'Sign in required', 'Sign in before loading your Nirog care record.');
  }

  const configuredApiBase = process.env.NIROG_CORE_API_URL;
  if (!configuredApiBase) {
    return problem(503, 'CORE_API_UNCONFIGURED', 'Nirog Core is not configured', 'Set NIROG_CORE_API_URL on the web server.');
  }
  const apiBase = coreApiRoot(configuredApiBase);

  // Do not request a Clerk JWT template here. Custom JWT templates are not session-bound
  // and therefore omit sid; Core intentionally requires sid to bind its local actor context.
  // Configure the Nirog audience in Clerk's session-token customization instead.
  const token = await getToken();
  if (!token) {
    return problem(401, 'CORE_TOKEN_UNAVAILABLE', 'Nirog Core token unavailable', 'Refresh the Clerk session and try again.');
  }

  try {
    const response = await fetchWithBoundedTimeout(`${apiBase}/me`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store',
    });
    if (![204, 205, 304].includes(response.status) && !isRelayJsonResponse(response)) {
      return problem(502, 'CORE_RESPONSE_MEDIA_TYPE_UNSUPPORTED', 'Core response media type is unsupported', 'The Core response did not use a browser relay media type.');
    }
    const body = await readBoundedDownstreamText(response);
    if (body === null) {
      return problem(502, 'CORE_RESPONSE_TOO_LARGE', 'Core response is too large', 'The Core response exceeded the browser relay safety limit.');
    }
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': privateNoStore,
        ...(response.headers.get('x-correlation-id')
          ? { 'x-correlation-id': response.headers.get('x-correlation-id')! }
          : {}),
      },
    });
  } catch {
    return problem(502, 'CORE_API_UNREACHABLE', 'Nirog Core is unreachable', 'The web companion could not contact the configured Core API.');
  }
}
