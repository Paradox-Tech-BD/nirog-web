import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isCrossOriginMutation } from '@/lib/browser-mutation';
import { readBoundedRequestBytes } from '@/lib/bounded-request-bytes';
import { fetchWithBoundedTimeout, readBoundedDownstreamText } from '@/lib/downstream-fetch';
import { ocrOpsReceiptEndpoint, parseConfirmedReceiptRelayInput } from '@/lib/ocr-receipt-relay';
import { isRelayJsonResponse } from '@/lib/relay-response-media-type';

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
  if (!request.body) return { kind: 'invalid' };
  const result = await readBoundedRequestBytes(request, maximumReceiptRequestBytes);
  if (result.kind === 'too-large') return { kind: 'too-large' };
  if (result.kind === 'unreadable') return { kind: 'invalid' };
  try {
    const input = parseConfirmedReceiptRelayInput(JSON.parse(new TextDecoder().decode(result.bytes)));
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
    if (![204, 205, 304].includes(response.status) && !isRelayJsonResponse(response)) {
      return problem(502, 'OCR_OPS_RESPONSE_MEDIA_TYPE_UNSUPPORTED', 'OCR operations response media type is unsupported', 'The OCR operations response did not use a browser relay media type.');
    }
    const responseBody = await readBoundedDownstreamText(response);
    if (responseBody === null) {
      return problem(502, 'OCR_OPS_RESPONSE_TOO_LARGE', 'OCR operations response is too large', 'The OCR operations response exceeded the browser relay safety limit.');
    }
    return new NextResponse(responseBody, {
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
