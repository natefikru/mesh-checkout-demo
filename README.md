# Sole

A sneaker storefront that connects Coinbase through [Mesh Connect](https://meshconnect.com), reads the account's live portfolio, and settles a cart in USDC over Ethereum. Built for the Mesh Connect Customer Success / Corp Sec take-home.

**Live:** https://mesh-checkout-demo.vercel.app

## What this demonstrates

| # | Requirement | Where | Notes |
|---|---|---|---|
| 1 | Mesh dashboard account | External | Requested via Contact Sales |
| 2 | App using Mesh | This repo | |
| 3 | Fully functional on Sandbox | `MESH_BASE_URL` | Points at sandbox throughout |
| 4 | Launch Link, connect Coinbase | `connect-coinbase-button.tsx`, `link-token/route.ts` | `integrationId` is resolved at runtime from `/api/v1/integrations` and locked to Coinbase's sandbox id, so Link skips Mesh's provider catalog entirely |
| 5 | Pay in USDC over Ethereum via Link UI | `cart-checkout-button.tsx`, `orders/route.ts` | Checkout pre-flights the token, network, and address against `/api/v1/transfers/managed/verify`, then mints a payment link token with the order id as `transferOptions.transactionId`, used as a correlation key since Mesh's API has no idempotency header |
| 6 | Read portfolio via accessToken | `mesh/portfolio/route.ts`, `lib/mesh/portfolio.ts` | Three parallel server-side reads: `holdings/get`, `holdings/value`, `balance/get`. The token never reaches the browser |
| 7 | Bonus creativity | See Architecture below | Balance-aware checkout, fee quote before paying, live console drawer, return-user reconnect, atomic settlement, Mesh's own transfer record shown next to the app's order status, expired-connection auto-recovery |

## Architecture, briefly

- Next.js 16 App Router, TypeScript strict mode, Tailwind v4. Deployed on Vercel.
- Upstash Redis holds orders, connections, and the console event log (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, Vercel's naming for it).
- `lib/mesh/client.ts` is the single choke point for outbound Mesh calls: credentials, envelope unwrapping, redacted console logging.
- Session identity is a bare UUID in an httpOnly cookie, set in `middleware.ts`, doubling as the Mesh `userId` and Redis key prefix.
- Stores Mesh's `tokenId`, not the raw `accessToken`, which is what makes the return-user reconnect (skip re-login on repeat checkout) possible.
- Settlement is webhook-driven, not client-driven, with an atomic Redis Lua transition closing a real race between the webhook and the SDK callback.
- A resizable console drawer streams every Mesh API call, SDK event, and webhook delivery live, for the demo and for debugging.
- Before checkout, `POST /api/v1/transfers/managed/quote` shows an estimated network fee against the exact token, network, and address the order will use, using Mesh's production `brokerType` even in sandbox (confirmed live: the connection's own stored `sandboxCoinbase` value 400s on this endpoint).
- Once an order settles, `GET /api/v1/transfers/managed/mesh` shows Mesh's own transfer record next to the app's local order status, pairing "what my app recorded" against "what Mesh's API says happened."
- Disconnect calls Mesh's `DELETE /api/v1/account` to revoke the token, not just clear the local record. And if Mesh ever rejects a stored token as unauthorized (rotation, expiry), the app clears the stale connection and prompts reconnect instead of silently failing every request.

Reasoning behind each of these lives in [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required env vars (see `.env.example` for the full list with context):

- `MESH_CLIENT_ID`, `MESH_API_KEY`: from the Mesh dashboard's API keys page. Also add `http://localhost:3000` (and your deployed domain) under **Account → API keys → Access**, or the Link iframe won't render.
- `MESH_BASE_URL`: defaults to sandbox if unset.
- `MESH_WEBHOOK_SECRET`: from **Account → API keys → Webhooks**. Shown once on creation.
- `KV_REST_API_URL`, `KV_REST_API_TOKEN`: an Upstash Redis instance. Easiest path is `vercel integration add upstash/upstash-kv` against a linked Vercel project, then `vercel env pull`.

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

A second tier of tests (`*.integration.test.ts`) runs against the Mesh sandbox and the actual Redis instance, not mocks. They're skipped automatically in CI (no secrets there) via `describe.skipIf`, but run locally whenever `.env.local` is populated. This is the kind of integration where a mock can pass while the real API disagrees. One of these tests fires two competing order updates with no `await` between them across ten fresh orders, to prove the atomic update actually closes the race it claims to close.

## Deployment

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, and a production build on every push and pull request. Production deploys go out via `vercel --prod`. The Vercel project isn't linked to auto-deploy from GitHub pushes on this account, so a deploy is a deliberate step after CI is green, not an automatic side effect of pushing.
