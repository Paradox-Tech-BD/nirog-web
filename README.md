# Nirog Web

Nirog Web is the responsive **Clinical Ledger** companion for the Nirog Flutter app. It uses Clerk for browser authentication and sends the active Clerk session token to Nirog Core through a narrow, same-origin server route. The browser never receives a Core API credential or calls a protected Core endpoint directly.

## Architecture

```text
Browser → ClerkProvider / Clerk session
        → GET /api/core/me (same origin)
        → Next.js server obtains Clerk session JWT
        → Authorization: Bearer <JWT> → Nirog Core /api/v1/me
```

The user feature is intentionally read-only at this first web boundary. It renders the authenticated account’s Core projection and connection state honestly; it does not invent medication, adherence, or clinical records that Core has not supplied.

## Environment

Copy `.env.example` to `.env.local`. Do not commit `.env.local`.

| Variable | Role |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key. This is safe to expose in client-side code. |
| `CLERK_SECRET_KEY` | Clerk server key. Required by the Next.js server and never exposed to the browser. |
| `NIROG_CORE_API_URL` | Public Nirog Core origin. The bridge appends `/api/v1` when absent, and also accepts a base that already ends in `/api/v1`. |

For the Core verifier configured with `CLERK_AUDIENCE=nirog-mobile-api`, add the following custom claim in **Clerk Dashboard → Sessions → Customize session token**:

```json
{ "aud": "nirog-mobile-api" }
```

The Web bridge must call `getToken()` without a template. Core requires the standard session token's `sid` claim to bind the verified actor to a session; Clerk JWT templates intentionally do not contain that session-bound claim. Keep `CLERK_AUTHORIZED_PARTIES` aligned with the actual browser origin represented by the token's `azp` claim, for example `https://www.nirog.me`.

## Run locally

```bash
pnpm install
pnpm dev
```

The application uses Next.js 16 App Router and Clerk’s `src/proxy.ts` convention. Protected data is checked close to the same-origin route handler using `await auth()` and `getToken()`, not inferred from a client-only display state.

## Verification

```bash
pnpm lint
pnpm build
```

The testable integration point is `GET /api/core/me`. It returns a consistent problem response for missing Core configuration, unavailable session tokens, or unreachable Core, preserving the Core response body and correlation identifier when Core responds.
