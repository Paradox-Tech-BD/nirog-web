import 'server-only';

export type BoundedRequestBytesResult =
  | { kind: 'bytes'; bytes: Uint8Array }
  | { kind: 'too-large' }
  | { kind: 'unreadable' };

export async function readBoundedRequestBytes(request: Request, maxBytes: number): Promise<BoundedRequestBytesResult> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return { kind: 'too-large' };
  if (!request.body) return { kind: 'bytes', bytes: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { kind: 'too-large' };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: 'unreadable' };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { kind: 'bytes', bytes };
}
