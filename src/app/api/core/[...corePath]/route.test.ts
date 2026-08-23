import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  proxyAuthorizedCoreRequest: vi.fn(async () => new Response(null, { status: 204 })),
  isAllowedCoreEvidencePath: vi.fn(() => true),
}));

vi.mock('@/lib/core-proxy', () => ({ proxyAuthorizedCoreRequest: mocks.proxyAuthorizedCoreRequest }));
vi.mock('@/lib/core-route-policy', () => ({ isAllowedCoreEvidencePath: mocks.isAllowedCoreEvidencePath }));

import { PATCH, PUT } from './route';

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
