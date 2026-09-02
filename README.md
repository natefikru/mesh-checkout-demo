# Sole

A sneaker storefront that connects Coinbase through [Mesh Connect](https://meshconnect.com), reads the account's live portfolio, and settles a cart in USDC over Ethereum — built for the Mesh Connect Customer Success / Corp Sec take-home.

**Live:** https://mesh-checkout-demo.vercel.app

## What this demonstrates

The take-home's seven requirements, and where each one lives in the code:

| # | Requirement | Where |
|---|---|---|
| 1 | Mesh dashboard account | External — requested via Contact Sales |
| 2 | App using Mesh | This repo |
| 3 | Fully functional on Sandbox | `MESH_BASE_URL` points at sandbox throughout |
| 4 | Launch Link, connect Coinbase | `components/storefront/connect-coinbase-button.tsx`, `app/api/mesh/link-token/route.ts` |
| 5 | Pay in USDC over Ethereum via Link UI | `components/storefront/cart-checkout-button.tsx`, `app/api/orders/route.ts` |
| 6 | Read portfolio via accessToken | `app/api/mesh/portfolio/route.ts`, `lib/mesh/portfolio.ts` |
| 7 | Bonus creativity | Cart with balance-aware checkout, live console drawer, return-user reconnect, atomic settlement — see below |

## Architecture, briefly

- **Next.js 16 App Router, TypeScript strict mode, Tailwind v4.** Deployed on Vercel.
- **Upstash Redis** for orders, connections, and the console event log — provisioned through Vercel's marketplace integration, so the env vars are `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel's naming), not Upstash's own.
- **`lib/mesh/client.ts`** is the single choke point for outbound Mesh calls: attaches credentials, unwraps the response envelope, and logs a redacted request/response pair to the console panel. One exception — `lib/mesh/verify.ts` — because `/api/v1/transfers/managed/verify` is a GET that requires a JSON body, which the Fetch API refuses outright; that one call goes through Node's raw `https` client instead.
- **Session identity** is a bare UUID in an httpOnly cookie, set by `middleware.ts` (Server Components can't set cookies themselves, so this has to happen ahead of any page render). It doubles as the Mesh `userId` and the Redis key prefix.
- **The Mesh token model matters here.** What gets stored server-side is `tokenId`, never the raw `accessToken` — they match on first connect and diverge once Mesh rotates the underlying token, and `tokenId` is the stable handle both for downstream API calls and for Mesh's return-user reconnect pattern (`accessTokens` on `createLink`), which this app actually uses: checking out with an existing connection skips Coinbase re-authentication entirely.
- **Settlement is webhook-driven, not client-driven.** `onTransferFinished` only ever moves an order to `pending`, because it fires on provider acknowledgement, not chain confirmation — treating it as payment confirmation is the classic integration bug. The webhook (`app/api/mesh/webhook/route.ts`), verified via HMAC-SHA256 over the raw request body and deduped on `EventId`, is the only path to `paid`. The order state machine (`lib/store/orders.ts`) applies that transition atomically with a Redis Lua script, closing a real race condition where the webhook and `onTransferFinished` landing close together could otherwise split an order's status from its recorded transaction hash.
- **The console drawer** (bottom of the page, resizable) streams every Mesh API call, SDK event, and webhook delivery for the current session in one interleaved timeline, polling `/api/console`. It's the same infrastructure the app uses internally, exposed as a live "how does this actually work" panel for the demo.

## Requirements traceability, in more detail

**Requirement 4 — connect Coinbase.** The link token is minted server-side with `integrationId` set to Coinbase's sandbox integration id, resolved at runtime from `/api/v1/integrations` (the sandbox id isn't published and differs from production's). This skips Mesh's connect catalog entirely and opens Link straight into Coinbase.

**Requirement 5 — pay in USDC over Ethereum.** Checkout reads the live USDC balance before offering to pay, pre-flights the exact token/network/address combination against `/api/v1/transfers/managed/verify`, then mints a payment-mode link token with `transferOptions.transactionId` set to the order id as the correlation key (Mesh's API has no idempotency key, so this stands in for one — it comes back on both the client callback and the webhook).

**Requirement 6 — read the portfolio.** Three separate server-side reads fan out in parallel: `/api/v1/holdings/get` (with `includeMarketValue: true`), `/api/v1/holdings/value` for totals, and `/api/v1/balance/get` for fiat. The `accessToken` (really the stored `tokenId`) never reaches the browser — every one of these calls happens server-side.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env vars (see `.env.example` for the full list with context):

- `MESH_CLIENT_ID`, `MESH_API_KEY` — from the Mesh dashboard's API keys page. Also add `http://localhost:3000` (and your deployed domain) under **Account → API keys → Access**, or the Link iframe won't render.
- `MESH_BASE_URL` — defaults to sandbox if unset.
- `MESH_WEBHOOK_SECRET` — from **Account → API keys → Webhooks**. Shown once on creation.
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` — an Upstash Redis instance. Easiest path: `vercel integration add upstash/upstash-kv` against a linked Vercel project, then `vercel env pull`.

The webhook needs a publicly reachable URL to register in the Mesh dashboard, so local development can exercise everything except the webhook-driven `paid` transition (`onTransferFinished` and the rest of the flow work fine locally).

## Sandbox credentials

Every sandbox login uses password `Pass123` and MFA/OTP code `123456`, for both the connect step and the transfer step. `Mesh` is the default sandbox user with a full ~$10M portfolio; `Mesh2` is empty (useful for testing the no-balance state).

## Testing

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Unit tests cover the logic that can break silently without a live dependency: webhook signature verification (valid, tampered, wrong secret, hex-vs-base64), the order state machine's terminal-state guarantees, envelope unwrapping, and console redaction.

A second tier of tests (`*.integration.test.ts`) runs against the real Mesh sandbox and the real Redis instance — skipped automatically in CI (no secrets there) via `describe.skipIf`, but they run locally whenever `.env.local` is populated. These exist because this is exactly the kind of integration where a mock can pass while the real API disagrees; one of them is a genuine concurrency test that fires two competing order updates with no `await` between them across ten fresh orders, proving the atomic update actually closes the race it claims to close.

## Deployment

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, and a production build on every push and pull request. Production deploys go out via `vercel --prod` — the Vercel project isn't linked to auto-deploy from GitHub pushes on this account, so a deploy is a deliberate step after CI is green, not an automatic side effect of pushing.
