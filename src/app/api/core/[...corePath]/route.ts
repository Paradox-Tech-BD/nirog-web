import { NextResponse } from 'next/server';
import { isCrossOriginMutation } from '@/lib/browser-mutation';
import { proxyAuthorizedCoreRequest } from '@/lib/core-proxy';
import { isAllowedCoreEvidencePath, isReadOnlyCoreOperationsPath } from '@/lib/core-route-policy';

const privateNoStore = 'private, no-store';

function problem(status: number, code: string, title: string) {
  return NextResponse.json(
    { type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`, title, status, code },
    { status, headers: { 'content-type': 'application/problem+json', 'cache-control': privateNoStore } },
  );
}

async function handle(request: Request, context: { params: Promise<{ corePath: string[] }> }) {
  if (isCrossOriginMutation(request)) {
    return problem(403, 'CROSS_ORIGIN_REQUEST_REJECTED', 'Cross-origin mutation request rejected');
  }
  const { corePath } = await context.params;
  const path = corePath.join('/');
  if (!isAllowedCoreEvidencePath(path) || (isReadOnlyCoreOperationsPath(path) && request.method !== 'GET')) {
    return problem(404, 'CORE_ROUTE_NOT_ALLOWED', 'Core route is not available');
  }
  return proxyAuthorizedCoreRequest(request, path);
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
