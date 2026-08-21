// Phase 8 smoke route: server-bound Clerk token, fixed isolated profile, synthetic 1x1 PNG only.
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { coreApiRoot } from '../me/route';

const smokeProfileId = '94a36dc8-7502-4aa3-b00b-1138d47abd47';
const smokePrescriptionId = 'e910ce4c-43f4-4c51-b57f-ac5defd3348a';
const syntheticPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9qHq8AAAAASUVORK5CYII=',
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
    return problem(502, 'EVIDENCE_OBJECT_UPLOAD_FAILED', 'Synthetic evidence upload failed', 'The presigned R2 upload did not complete.');
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
