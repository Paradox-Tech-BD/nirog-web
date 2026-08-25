const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Browser fetch requests include Origin for normal cross-origin mutations. Keep
 * legacy clients that omit Origin compatible, while rejecting an explicit
 * mismatched origin before an authenticated mutation reaches a downstream API.
 */
export function isCrossOriginMutation(request: Request): boolean {
  if (!mutationMethods.has(request.method.toUpperCase())) return false;

  const origin = request.headers.get('origin');
  return origin !== null && origin !== new URL(request.url).origin;
}
