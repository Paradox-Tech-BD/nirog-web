import { describe, expect, it } from 'vitest';
import nextConfig, { securityHeaders } from './next.config';

describe('production browser security headers', () => {
  it('applies the conservative security policy to every route', async () => {
    if (!nextConfig.headers) throw new Error('The Web configuration must define global response headers.');

    await expect(nextConfig.headers()).resolves.toEqual([
      { source: '/:path*', headers: securityHeaders },
    ]);
    expect(securityHeaders).toEqual(expect.arrayContaining([
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
    ]));
  });
});
