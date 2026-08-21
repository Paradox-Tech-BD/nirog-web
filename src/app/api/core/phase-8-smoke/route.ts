// Phase 8 smoke route: server-bound Clerk token, fixed isolated profile, readable synthetic PNG only.
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { coreApiRoot } from '../me/route';

const smokeProfileId = '94a36dc8-7502-4aa3-b00b-1138d47abd47';
const smokePrescriptionId = 'e910ce4c-43f4-4c51-b57f-ac5defd3348a';
const syntheticPng = Buffer.from(
  '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',
  'base64',
);

function problem(status: number, code: string, title: string, detail: string) {
  return NextResponse.json(
    {
      type: `https://nirog.app/problems/${code.toLowerCase().replaceAll('_', '-')}`,
      title,
      status,
      code,
      detail,
    },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}

async function sessionContext() {
  const { isAuthenticated, sessionId, getToken } = await auth();
  if (!isAuthenticated || !sessionId) {
    return { error: problem(401, 'UNAUTHENTICATED', 'Sign in required', 'Sign in before running the isolated OCR smoke test.') };
  }

  const configuredApiBase = process.env.NIROG_CORE_API_URL;
  if (!configuredApiBase) {
    return { error: problem(503, 'CORE_API_UNCONFIGURED', 'Nirog Core is not configured', 'Set NIROG_CORE_API_URL on the web server.') };
  }

  const token = await getToken();
  if (!token) {
    return { error: problem(401, 'CORE_TOKEN_UNAVAILABLE', 'Nirog Core token unavailable', 'Refresh the Clerk session and try again.') };
  }

  return { apiBase: coreApiRoot(configuredApiBase), token };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function coreHeaders(token: string, idempotencyKey?: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    accept: 'application/json',
    ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
  };
}

export async function POST() {
  const context = await sessionContext();
  if ('error' in context) return context.error;

  const authorization = await fetch(
    `${context.apiBase}/profiles/${smokeProfileId}/prescriptions/${smokePrescriptionId}/evidence/uploads`,
    {
      method: 'POST',
      headers: { ...coreHeaders(context.token, crypto.randomUUID()), 'content-type': 'application/json' },
      body: JSON.stringify({ contentType: 'image/png', declaredSizeBytes: syntheticPng.byteLength }),
      cache: 'no-store',
    },
  );
  const authorizationBody = await readJson(authorization) as { data?: { evidence?: { id?: string }; uploadUrl?: string }; code?: string } | null;
  const evidenceId = authorizationBody?.data?.evidence?.id;
  const uploadUrl = authorizationBody?.data?.uploadUrl;
  if (!authorization.ok || !evidenceId || !uploadUrl) {
    return problem(authorization.status || 502, authorizationBody?.code ?? 'EVIDENCE_UPLOAD_AUTHORIZATION_FAILED', 'Synthetic evidence upload was not authorized', 'The authenticated Core request did not return a usable evidence upload authorization.');
  }

  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': 'image/png' },
    body: syntheticPng,
    cache: 'no-store',
  });
  if (!upload.ok) {
    const uploadBody = await upload.text();
    const providerCode = /<Code>([^<]+)<\/Code>/.exec(uploadBody)?.[1];
    const providerDetail = providerCode ? ` R2 returned ${upload.status} (${providerCode}).` : ` R2 returned ${upload.status}.`;
    return problem(502, 'EVIDENCE_OBJECT_UPLOAD_FAILED', 'Synthetic evidence upload failed', `The presigned R2 upload did not complete.${providerDetail}`);
  }

  const completion = await fetch(
    `${context.apiBase}/profiles/${smokeProfileId}/prescriptions/${smokePrescriptionId}/evidence/${evidenceId}/complete`,
    {
      method: 'POST',
      headers: coreHeaders(context.token, crypto.randomUUID()),
      cache: 'no-store',
    },
  );
  const completionBody = await readJson(completion) as { data?: { evidenceId?: string; ocrJobId?: string }; code?: string } | null;
  if (!completion.ok || !completionBody?.data?.ocrJobId) {
    return problem(completion.status || 502, completionBody?.code ?? 'OCR_ENQUEUE_FAILED', 'Synthetic OCR work was not queued', 'The upload completed but Core did not enqueue the bounded OCR job.');
  }

  return NextResponse.json({
    data: {
      profileId: smokeProfileId,
      prescriptionId: smokePrescriptionId,
      evidenceId,
      ocrJobId: completionBody.data.ocrJobId,
      next: `/api/core/phase-8-smoke?evidenceId=${encodeURIComponent(evidenceId)}`,
    },
  });
}

export async function GET(request: NextRequest) {
  const context = await sessionContext();
  if ('error' in context) return context.error;

  const evidenceId = request.nextUrl.searchParams.get('evidenceId');
  if (!evidenceId || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(evidenceId)) {
    return problem(400, 'EVIDENCE_ID_REQUIRED', 'Evidence identifier is required', 'Provide the synthetic evidence identifier returned by the smoke POST request.');
  }

  const response = await fetch(
    `${context.apiBase}/profiles/${smokeProfileId}/evidence/${evidenceId}/ocr-extractions`,
    { headers: coreHeaders(context.token), cache: 'no-store' },
  );
  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
}
