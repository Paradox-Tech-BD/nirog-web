// Clinical Ledger design: authentication is enforced at the request boundary, never inferred from UI state.
import { clerkMiddleware } from '@clerk/nextjs/server';

export const cspBaselineDirectives = {
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
};

export default clerkMiddleware({
  contentSecurityPolicy: {
    directives: cspBaselineDirectives,
  },
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
