// Clinical Ledger design: this route is the narrow server-only bridge from Clerk session state to Nirog Core.
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    {
      type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`,
      title,
      status,
      code,
      detail,
    },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

export async function GET() {
  const { isAuthenticated, getToken } = await auth();
  if (!isAuthenticated) {
    return problem(401, 'UNAUTHENTICATED', 'Sign in required', 'Sign in before loading your Nirog care record.');
  }

  const apiBase = process.env.NIROG_CORE_API_URL?.replace(/\/$/, '');
  if (!apiBase) {
    return problem(503, 'CORE_API_UNCONFIGURED', 'Nirog Core is not configured', 'Set NIROG_CORE_API_URL on the web server.');
  }

  const template = process.env.NIROG_CORE_JWT_TEMPLATE;
  const token = template ? await getToken({ template }) : await getToken();
  if (!token) {
    return problem(401, 'CORE_TOKEN_UNAVAILABLE', 'Nirog Core token unavailable', 'Create or select the Clerk JWT template configured for Nirog Core.');
  }

  try {
    const response = await fetch(`${apiBase}/me`, {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store',
    });
    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        ...(response.headers.get('x-correlation-id')
          ? { 'x-correlation-id': response.headers.get('x-correlation-id')! }
          : {}),
      },
    });
  } catch {
    return problem(502, 'CORE_API_UNREACHABLE', 'Nirog Core is unreachable', 'The web companion could not contact the configured Core API.');
  }
}
