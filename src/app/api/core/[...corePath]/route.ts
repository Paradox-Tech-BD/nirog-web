import { NextResponse } from 'next/server';
import { proxyAuthorizedCoreRequest } from '@/lib/core-proxy';
import { isAllowedCoreEvidencePath } from '@/lib/core-route-policy';

async function handle(request: Request, context: { params: Promise<{ corePath: string[] }> }) {
  const { corePath } = await context.params;
  const path = corePath.join('/');
  if (!isAllowedCoreEvidencePath(path)) {
    return NextResponse.json({ type: 'https://nirog.app/problems/core-route-not-allowed', title: 'Core route is not available', status: 404, code: 'CORE_ROUTE_NOT_ALLOWED' }, { status: 404, headers: { 'content-type': 'application/problem+json' } });
  }
  return proxyAuthorizedCoreRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
