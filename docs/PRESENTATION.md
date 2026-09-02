# Presenting Sole: notes for the panel

This is the talking-points document, not the README. The README explains the code to a developer; this explains the project to the panel, mapped to what they asked for and organized so it reads well as a script.

Live app: https://mesh-checkout-demo.vercel.app
Repo: https://github.com/natefikru/mesh-checkout-demo
Take-home brief: [`Build_with_Mesh_-_Take_Home_Test.pdf`](./Build_with_Mesh_-_Take_Home_Test.pdf) in this folder

---

## 1. What Mesh Connect actually is, and why a customer would integrate it

Say this early, before touching the demo. It's the difference between "I built the assignment" and "I understand what I'm selling."

Mesh Connect is an aggregation and transfer layer sitting between a customer's app and every exchange, brokerage, and wallet a user might hold crypto or securities in. Without it, a company that wants to let users "pay with crypto" or "link your Coinbase" has to build and maintain a separate integration for every provider: OAuth flows that differ per exchange, credential storage, MFA handling, rate limits, webhook formats, token refresh logic, and a different holdings/balance schema for each one. Mesh collapses that into one SDK and one API surface.

The concrete pitch, in three parts:

- **One integration, many institutions.** `createLink()` and a handful of REST endpoints work identically whether the user connects Coinbase, Kraken, a self-custody wallet, or a brokerage. The catalog, the auth flow, and the data shape are Mesh's problem, not the customer's.
- **It's not just "connect," it's "move money."** The transfer flow (what this app uses for checkout) handles preview, fee calculation, MFA, and execution across networks and assets, so a customer can accept payment or fund a wallet without becoming a blockchain company.
- **Compliance and reliability live in the platform.** Travel Rule handling, KYC signals, catalog filtering by geography and asset — this is exactly the kind of thing that's expensive and risky to get wrong in-house, and exactly what a platform selling infrastructure should own.

For a Customer Success or Corp Sec conversation specifically: the value proposition to say out loud is that a customer isn't buying an SDK, they're buying the removal of an entire category of integration and compliance risk. That's the sentence worth having ready.

---

## 2. The demo, in order

Five minutes, narrated. Each step names the requirement it satisfies.

1. **Land on the storefront.** Five products, real photography, no login required yet. This is deliberately just a storefront — the take-home's judged on Mesh depth, not retail features.
2. **Click Connect Coinbase.** Link opens directly into Coinbase's login, skipping Mesh's provider catalog entirely — because the link token request restricts it with `integrationId`. *Requirement 4.* Sandbox login is `Mesh` / `Pass123`, MFA `123456`.
3. **Portfolio renders.** Click "Show portfolio" in the header. This is three separate server-side reads (`holdings/get`, `holdings/value`, `balance/get`) — the browser never touches the access token. *Requirement 6.*
4. **Add items to the cart, open it.** The drawer shows a live USDC balance fetched right there, compared against the cart total, before checkout is even attempted.
5. **Click Pay with Coinbase.** This is the interesting moment: point out that the app already has a stored connection, and instead of asking for Coinbase login again, Link recognizes the account via the stored token and jumps straight to the payment confirmation screen. Narrate this explicitly — it's the return-user reconnect pattern, and it's easy to miss if you don't call it out.
6. **Confirm the transfer.** USDC, Ethereum, the fixed test wallet, transfer MFA `123456`. *Requirement 5.*
7. **Point at the order status, not the Link success screen.** The Link UI says "Success" the moment the transfer is *initiated* — the order in this app still says "Awaiting confirmation" or "Pending." A few seconds later, once the webhook lands, it flips to "Paid" with a transaction hash linking to Etherscan. This gap is the single best thing to explain out loud (see §4 below).
8. **Open the console drawer at the bottom.** Every one of the calls that just happened is sitting there in order: the holdings reads, the pre-flight verify, the link token mint, then the SDK's own event stream (`pageLoaded`, `integrationSelected`, `transferMfaRequired`, `onTransferFinished`), then the webhook delivery. Click a row to see the full request/response JSON. This panel is what you'd actually screen-share on a support call.

---

## 3. Under the hood — the parts worth being able to explain unprompted

### The token model

Mesh hands back two things after a successful connect: a raw `accessToken` and a `tokenId`. They're identical on the very first connection and diverge the moment Mesh rotates the underlying credential. This app stores only `tokenId` — never the raw token — because `tokenId` is the stable handle for everything downstream: portfolio reads, and critically, Mesh's **managed token (MMT) return-user pattern**. Passing that stored `tokenId` back into `createLink()`'s `accessTokens` option is what makes step 5 above skip re-authentication. That's not a cosmetic nicety; it's the difference between a checkout that asks a returning customer to log into a third-party exchange every single time versus one that doesn't.

### Two different link tokens, doing two different jobs

The connect flow (`app/api/mesh/link-token/route.ts`) and the checkout flow (`app/api/orders/route.ts`) both call `POST /api/v1/linktoken`, but with different bodies. Connect passes `integrationId` alone. Checkout adds `transferOptions`: `transactionId` (the order id, used as a correlation key since Mesh's API has no idempotency header), `transferType: "payment"`, and a `toAddresses` entry with the exact amount. Same endpoint, two purposes — worth knowing cold if asked "how does the payment flow differ from the connect flow."

### Settlement: this is the one to lead with

`onTransferFinished` — the client-side SDK callback — fires when the provider *acknowledges* a transfer request, not when it actually settles on-chain. Mesh's own Link UI says as much on its own success screen: *"Transfers are not complete until they have received enough network confirmations."* Treating that callback as payment confirmation is a real, common integration mistake — credit the user, ship the order, and sometimes the transfer fails afterward.

This app never does that. `onTransferFinished` only ever moves an order to `pending`. The only path to `paid` is the Mesh transfer webhook (`app/api/mesh/webhook/route.ts`), verified with HMAC-SHA256 over the *raw* request body (Mesh's own docs inconsistently show a hex digest in one place and base64 in another — base64 is correct, and re-serializing the JSON to check it would break the signature anyway since key order and number formatting aren't guaranteed to round-trip). Deliveries dedupe on `EventId`, since Mesh's delivery is at-least-once and the outer `Id` field changes on every retry.

### A real bug, worth telling as a story

Building the order state machine, "terminal states are absorbing" seemed obvious: once an order is `paid` or `failed`, nothing should downgrade it. First version protected the `status` field correctly but not the fields riding alongside it — a late `onTransferFinished` arriving *after* the webhook had already settled an order could still silently overwrite its recorded transaction hash, while the status field itself correctly stayed `paid`. Found this live, in a browser, mid-build — not from a test. Fixed it, then wrote a regression test that fires two competing updates with no `await` between them across ten fresh orders and asserts the persisted record never has status from one writer and a hash from another.

That fix surfaced a second issue: the original `updateOrderStatus` was a plain read-then-write against Redis — read the order, decide the transition, write it back. Two requests landing close together (the webhook and `onTransferFinished` genuinely can race) could both read the same pre-update state and both "win" independently. Rewrote it as a single atomic Redis Lua script (`redis.eval`), so the whole read-check-write happens as one indivisible operation on the server, not two round trips from the client.

This is good material for a Corp Sec / Customer Success conversation specifically: it's the kind of subtle correctness bug a customer's engineering team would hit in production and escalate, and being able to explain both the bug and the fix in plain language is exactly the skill the role needs.

### Pre-flight verification

Before minting a payment link token, the app calls `GET /api/v1/transfers/managed/verify` to confirm the exact combination — Coinbase, USDC, Ethereum, that specific destination address — is actually supported, before ever opening Link. One implementation note worth mentioning if asked about debugging: that endpoint is a GET that requires a JSON body, which the Fetch API refuses outright ("Request with GET/HEAD method cannot have body"). It's the one Mesh call in this codebase that goes through Node's raw `https` client instead of the normal fetch-based wrapper, precisely because of that spec quirk.

### The console panel

Not a UI flourish — it's the same event log the app already writes to internally (`lib/console/store.ts`) on every Mesh call and SDK event, since Phase 2 of the build. The drawer is a thin, resizable UI on top of infrastructure that already existed. That's worth saying if asked "how long did the logging take to build" — the answer is that most of it was free, because it was designed in from the start rather than bolted on for the demo.

---

## 4. Anticipated questions

**"Why not just use `onTransferFinished` to mark the order paid? Isn't that simpler?"**
It's simpler and it's wrong. See §3. The Link UI's own copy on the success screen makes the case better than I can.

**"What happens if the webhook never arrives?"**
The order sits at `pending` indefinitely in this build — no retry/reconciliation job. In production I'd add a periodic reconciliation against `GET /api/v1/transfers/managed/mesh` (filterable by `ClientTransactionId`) for orders stuck past a threshold, since Mesh's delivery is at-least-once but not guaranteed-once-ever for a given endpoint's uptime.

**"Why store `tokenId` and not the access token?"**
Covered in §3 — stability across Mesh's own token rotation, and it's the value the return-user pattern is built around.

**"What's not built, and why?"**
No cart quantities beyond one-per-item, no order history UI, no reconciliation job (above), no multi-network checkout. All deliberate scope calls to keep the surface area proportional to a take-home rather than a production system — happy to talk through what changes to make it one.

**"What would you change about the Mesh SDK or API, based on building this?"**
Real, specific answer, not vague. The `/api/v1/transfers/managed/verify` endpoint being a GET with a required body is an easy trap for anyone using a standard fetch client. The documentation is inconsistent on the webhook signature encoding (hex vs base64) in two different places. Both are small things a Customer Success engineer would actually notice and could actually get fixed.
