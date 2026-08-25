import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isCrossOriginMutation } from '@/lib/browser-mutation';
import { fetchWithBoundedTimeout } from '@/lib/downstream-fetch';
import { ocrOpsReceiptEndpoint, parseConfirmedReceiptRelayInput } from '@/lib/ocr-receipt-relay';

const privateNoStore = 'private, no-store';
const maximumReceiptRequestBytes = 8 * 1024;
type ReceiptInput = NonNullable<ReturnType<typeof parseConfirmedReceiptRelayInput>>;
type ReceiptRequest = { kind: 'input'; input: ReceiptInput } | { kind: 'invalid' } | { kind: 'too-large' };

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    { type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`, title, status, code, detail },
    { status, headers: { 'content-type': 'application/problem+json', 'cache-control': privateNoStore } },
  );
}

async function readReceiptRequest(request: Request): Promise<ReceiptRequest> {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumReceiptRequestBytes) return { kind: 'too-large' };
  if (!request.body) return { kind: 'invalid' };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumReceiptRequestBytes) {
        await reader.cancel();
        return { kind: 'too-large' };
      }
      chunks.push(value);
    }
  } catch {
    return { kind: 'invalid' };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const input = parseConfirmedReceiptRelayInput(JSON.parse(new TextDecoder().decode(bytes)));
    return input ? { kind: 'input', input } : { kind: 'invalid' };
  } catch {
    return { kind: 'invalid' };
  }
}

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  if (isCrossOriginMutation(request)) {
    return problem(403, 'CROSS_ORIGIN_REQUEST_REJECTED', 'Cross-origin mutation request rejected', 'Use the Nirog web companion to deliver a confirmed OCR review receipt.');
  }
  const { isAuthenticated, sessionId } = await auth();
  if (!isAuthenticated || !sessionId) {
    return problem(401, 'UNAUTHENTICATED', 'Sign in required', 'Sign in before delivering a confirmed OCR review receipt.');
  }

  const receiptRequest = await readReceiptRequest(request);
  if (receiptRequest.kind === 'too-large') {
    return problem(413, 'RECEIPT_REQUEST_TOO_LARGE', 'Receipt request is too large', 'Send only the bounded attributed confirmation fields required for receipt delivery.');
  }
  if (receiptRequest.kind === 'invalid') {
    return problem(400, 'INVALID_RECEIPT_REQUEST', 'Receipt request is invalid', 'Actor attribution, a non-empty reason, and a short-lived assertion are required.');
  }
  const { input } = receiptRequest;

  const { jobId } = await context.params;
  try {
    const response = await fetchWithBoundedTimeout(ocrOpsReceiptEndpoint(jobId), {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/json',
        'cache-control': privateNoStore,
      },
    });
  } catch {
    return problem(502, 'OCR_OPS_UNREACHABLE', 'OCR operations service is unreachable', 'The confirmed receipt could not be delivered.');
  }
}
