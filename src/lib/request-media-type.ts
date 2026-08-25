const mutationMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function hasSupportedJsonMutationMediaType(request: Request): boolean {
  if (!mutationMethods.has(request.method) || !request.body) return true;
  return request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() === 'application/json';
}
