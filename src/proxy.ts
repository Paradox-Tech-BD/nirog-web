// Clinical Ledger design: authentication is enforced at the request boundary, never inferred from UI state.
import { clerkMiddleware } from '@clerk/nextjs/server';

export const cspBaselineDirectives = {
  'base-uri': ["'self'"],
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
