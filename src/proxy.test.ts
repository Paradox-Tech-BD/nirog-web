import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  clerkMiddleware: vi.fn(() => 'clerk-middleware'),
}));

vi.mock('@clerk/nextjs/server', () => ({ clerkMiddleware: mocks.clerkMiddleware }));

import middleware, { config, cspBaselineDirectives } from './proxy';

describe('Clerk browser security middleware', () => {
  it('uses Clerk-managed CSP allowances with a restrictive Nirog baseline', () => {
    expect(middleware).toBe('clerk-middleware');
    expect(cspBaselineDirectives).toEqual({
      'base-uri': ["'self'"],
      'connect-src': [
        "'self'",
        'https://nirog.up.railway.app',
        'https://*.r2.cloudflarestorage.com',
        'https://*.cloudflarestorage.com',
        'https://*.clerk.accounts.dev',
        'https://*.clerk.com',
        'wss:',
      ],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'manifest-src': ["'self'"],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
    });
    expect(mocks.clerkMiddleware).toHaveBeenCalledWith({
      contentSecurityPolicy: { directives: cspBaselineDirectives },
    });
  });

  it('continues to run the auth boundary for application, API, and Clerk routes', () => {
    expect(config.matcher).toEqual([
      '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
      '/(api|trpc)(.*)',
      '/__clerk/(.*)',
    ]);
  });
});
