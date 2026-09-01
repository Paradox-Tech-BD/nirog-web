import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  proxyAuthorizedCoreRequest: vi.fn(async () => new Response(null, { status: 204 })),
  isAllowedCoreEvidencePath: vi.fn(() => true),
  isReadOnlyCoreOperationsPath: vi.fn(() => false),
  isCrossOriginMutation: vi.fn(() => false),
  hasSupportedJsonMutationMediaType: vi.fn(() => true),
}));

vi.mock('@/lib/core-proxy', () => ({ proxyAuthorizedCoreRequest: mocks.proxyAuthorizedCoreRequest }));
vi.mock('@/lib/browser-mutation', () => ({ isCrossOriginMutation: mocks.isCrossOriginMutation }));
vi.mock('@/lib/core-route-policy', () => ({
  isAllowedCoreEvidencePath: mocks.isAllowedCoreEvidencePath,
  isReadOnlyCoreOperationsPath: mocks.isReadOnlyCoreOperationsPath,
}));
vi.mock('@/lib/request-media-type', () => ({ hasSupportedJsonMutationMediaType: mocks.hasSupportedJsonMutationMediaType }));

import { GET, PATCH, POST, PUT } from './route';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Core proxy route PATCH support', () => {
  it('forwards the medication-draft correction request through the allowlisted proxy', async () => {
    const path = ['profiles', '00000000-0000-4000-8000-000000000101', 'medication-drafts', '00000000-0000-4000-8000-000000000201'];
    const request = new Request('https://www.nirog.me/api/core/' + path.join('/'), { method: 'PATCH' });

    const response = await PATCH(request, { params: Promise.resolve({ corePath: path }) });

    expect(response.status).toBe(204);
    expect(mocks.isAllowedCoreEvidencePath).toHaveBeenCalledWith(path.join('/'));
    expect(mocks.proxyAuthorizedCoreRequest).toHaveBeenCalledWith(request, path.join('/'));
  });
});

describe('Core proxy route PUT support', () => {
  it('forwards an allowlisted inventory initialization request', async () => {
    const path = ['profiles', '00000000-0000-4000-8000-000000000101', 'regimens', '00000000-0000-4000-8000-000000000201', 'inventory'];
    const request = new Request(`https://www.nirog.me/api/core/${path.join('/')}`, { method: 'PUT' });

    const response = await PUT(request, { params: Promise.resolve({ corePath: path }) });

    expect(response.status).toBe(204);
    expect(mocks.isAllowedCoreEvidencePath).toHaveBeenCalledWith(path.join('/'));
    expect(mocks.proxyAuthorizedCoreRequest).toHaveBeenCalledWith(request, path.join('/'));
  });
});

describe('Core proxy aggregate operations status bridge', () => {
  it('forwards the exact status read through the authenticated same-origin proxy', async () => {
    const path = ['platform', 'operations', 'status'];
    mocks.isReadOnlyCoreOperationsPath.mockReturnValueOnce(true);
    const request = new Request(`https://www.nirog.me/api/core/${path.join('/')}`);

    const response = await GET(request, { params: Promise.resolve({ corePath: path }) });

    expect(response.status).toBe(204);
    expect(mocks.proxyAuthorizedCoreRequest).toHaveBeenCalledWith(request, path.join('/'));
  });

  it('does not expose a write route for aggregate operations status', async () => {
    const path = ['platform', 'operations', 'status'];
    mocks.isReadOnlyCoreOperationsPath.mockReturnValueOnce(true);
    const request = new Request(`https://www.nirog.me/api/core/${path.join('/')}`, { method: 'POST' });

    const response = await POST(request, { params: Promise.resolve({ corePath: path }) });

    expect(response.status).toBe(404);
    expect(mocks.proxyAuthorizedCoreRequest).not.toHaveBeenCalledWith(request, path.join('/'));
  });
});

describe('Core proxy cross-origin mutation boundary', () => {
  it('rejects a cross-origin mutation before it reaches the authorized Core proxy', async () => {
    const path = ['profiles', '00000000-0000-4000-8000-000000000101', 'medications'];
    mocks.isCrossOriginMutation.mockReturnValueOnce(true);
    const request = new Request(`https://www.nirog.me/api/core/${path.join('/')}`, { method: 'POST' });

    const response = await POST(request, { params: Promise.resolve({ corePath: path }) });

    expect(response.status).toBe(403);
    expect(mocks.proxyAuthorizedCoreRequest).not.toHaveBeenCalledWith(request, path.join('/'));
  });
});

describe('Core proxy request media-type boundary', () => {
  it('rejects an unsupported mutation body before it reaches the authorized Core proxy', async () => {
    const path = ['profiles', '00000000-0000-4000-8000-000000000101', 'medications'];
    mocks.hasSupportedJsonMutationMediaType.mockReturnValueOnce(false);
    const request = new Request(`https://www.nirog.me/api/core/${path.join('/')}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'unexpected',
    });

    const response = await POST(request, { params: Promise.resolve({ corePath: path }) });

    expect(response.status).toBe(415);
    expect(mocks.proxyAuthorizedCoreRequest).not.toHaveBeenCalledWith(request, path.join('/'));
  });
});
