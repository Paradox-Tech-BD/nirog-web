const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Browser fetch requests include Origin for normal cross-origin mutations and
 * Fetch Metadata for browser-declared cross-site requests. Keep legacy clients
 * that omit either header compatible, while rejecting explicit cross-site
 * signals before an authenticated mutation reaches a downstream API.
 */
export function isCrossOriginMutation(request: Request): boolean {
  if (!mutationMethods.has(request.method.toUpperCase())) return false;

  if (request.headers.get('sec-fetch-site') === 'cross-site') return true;

  const origin = request.headers.get('origin');
  return origin !== null && origin !== new URL(request.url).origin;
}
