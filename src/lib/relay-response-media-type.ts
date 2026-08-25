import 'server-only';

const jsonMediaTypes = new Set(['application/json', 'application/problem+json']);

function mediaType(response: Response): string {
  return response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

export function isRelayJsonResponse(response: Response): boolean {
  return jsonMediaTypes.has(mediaType(response));
}

export function isRelayEventStreamResponse(response: Response): boolean {
  return mediaType(response) === 'text/event-stream';
}
