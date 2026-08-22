import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ocrOpsReceiptEndpoint, parseConfirmedReceiptRelayInput } from '@/lib/ocr-receipt-relay';

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    { type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`, title, status, code, detail },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const { isAuthenticated, sessionId } = await auth();
  if (!isAuthenticated || !sessionId) {
    return problem(401, 'UNAUTHENTICATED', 'Sign in required', 'Sign in before delivering a confirmed OCR review receipt.');
  }

  let input: ReturnType<typeof parseConfirmedReceiptRelayInput>;
  try {
    input = parseConfirmedReceiptRelayInput(await request.json());
  } catch {
    input = null;
  }
  if (!input) {
    return problem(400, 'INVALID_RECEIPT_REQUEST', 'Receipt request is invalid', 'Actor attribution, a non-empty reason, and a short-lived assertion are required.');
  }

  const { jobId } = await context.params;
  try {
    const response = await fetch(ocrOpsReceiptEndpoint(jobId), {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(input),
      cache: 'no-store',
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
    });
  } catch {
    return problem(502, 'OCR_OPS_UNREACHABLE', 'OCR operations service is unreachable', 'The confirmed receipt could not be delivered.');
  }
}
