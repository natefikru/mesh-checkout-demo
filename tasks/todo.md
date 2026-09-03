# Add Get Mesh Transfers + Get Quote demo surface

## Context
Two Mesh API endpoints are unused: `GET /api/v1/transfers/managed/mesh` (Mesh's own
transfer record) and `POST /api/v1/transfers/managed/quote` (fee/eligibility preview).
Both add real demo value: pairing "what my app recorded" against "what Mesh's API
says happened" for a completed order, and showing fee transparency before checkout.

Confirmed endpoint shapes from live docs fetch (docs.meshconnect.com), not assumed:

**Get Mesh transfers** — `GET /api/v1/transfers/managed/mesh`
Query params: `ClientTransactionId`, `Count`, etc. Response `content.items[]` of
`TransferModel`: `status` (pending/succeeded/failed), `hash`, `infoUrl`, `amountInFiat`,
`symbol`, `networkName`, `createdTimestamp`, `executedTimestamp`, `transferType`.
Our checkout flow already sends the order id as `transferOptions.transactionId` when
minting the link token (`app/api/orders/route.ts`), which per docs becomes the
transfer's `clientTransactionId` — need to confirm this mapping empirically since it's
the one unverified assumption in this plan.

**Get quote** — `POST /api/v1/transfers/managed/quote`
Body: `amountInFiat`, `fiatCurrency`, `symbol`, `networkId`, `toAddress`, `brokerType`
(docs say "currently only coinbase supported" — ambiguous whether sandbox wants
`coinbase` or `sandboxCoinbase`; existing code stores `sandboxCoinbase` as the
connection's brokerType). Response `content.fees.inFiat.{networkFeeFiat,
minFeesFiat, maxFeesFiat}`, `isEligible`, `minAmountFiat`/`maxAmountFiat`.

Existing reusable constants: `ETHEREUM_NETWORK_ID`, `USDC_SYMBOL`, `TEST_WALLET_ADDRESS`,
`PRODUCTION_COINBASE_BROKER_TYPE` / `SANDBOX_COINBASE_BROKER_TYPE` (`lib/mesh/constants.ts`).

## Risks, resolved via direct sandbox smoke test (real credentials, real responses)
1. `brokerType` for the quote endpoint: `sandboxCoinbase` (the connection's stored
   value) returns `400: "Broker SandboxCoinbase not supported."` `coinbase`
   (`PRODUCTION_COINBASE_BROKER_TYPE`) returns 200 with real fee data. The quote call
   must hard-code `PRODUCTION_COINBASE_BROKER_TYPE`, not read `connection.brokerType`.
2. `clientTransactionId` on a real transfer does match the order id sent as
   `transferOptions.transactionId`. Confirmed against a real completed sandbox
   transfer: `status: "succeeded"`, real `hash`, `infoUrl` pointing at Etherscan,
   `destinationAddress` matching `TEST_WALLET_ADDRESS`.

## Plan

### A. Mesh transfer record paired with local order
1. `lib/mesh/types.ts`: add a minimal `TransferModel` type (only the fields we
   display: `status`, `hash`, `infoUrl`, `amountInFiat`, `symbol`, `networkName`,
   `clientTransactionId`) and `GetMeshTransfersResponseContent`.
2. `lib/mesh/transfers.ts`: `getMeshTransferByClientId(clientTransactionId, sessionId?)`
   — builds the query string with `URLSearchParams` (not raw template interpolation,
   `ClientTransactionId=<id>&Count=1&DescendingOrder=true`; `DescendingOrder` makes
   "most recent" explicit rather than relying on undocumented default ordering, in
   case a session ever produces more than one transfer for the same order id), calls
   `callMesh<GetMeshTransfersResponseContent>('GET', path, { sessionId })`, returns
   `content.items[0] ?? null`.
3. `app/api/orders/[id]/mesh-transfer/route.ts`: GET handler. Fetch the **local**
   order first via `getOrder(id)` and check `order.sessionId === sessionId` (same
   auth check as `app/api/orders/[id]/route.ts`, 404 on mismatch) *before* calling
   Mesh, so an unauthenticated/foreign order id never reaches the Mesh API. Only
   then call `getMeshTransferByClientId(order.id, sessionId)`. Returns `{ transfer }`
   (`transfer: null` is a valid, expected response, not an error).
4. `components/storefront/mesh-transfer-record.tsx`: client component, polls
   `/api/orders/[id]/mesh-transfer` at the same 1500ms cadence as `OrderStatusBadge`,
   capped at 20 attempts (~30s) so an abandoned order doesn't poll forever. Three
   explicit UI states, none left blank: (1) before the first response arrives, or
   while `transfer` is still `null`, show "Checking Mesh's record…" (matches
   `OrderStatusBadge`'s own "Checking order…" copy); (2) once found, show "Mesh's
   record: <status> · <tx hash link>", visually labeled distinctly from the app's
   own order status so the pairing reads without narration; (3) after the attempt
   cap is exhausted with nothing found, show "No Mesh record yet" rather than
   silently leaving the "Checking…" state up forever. Mounted inside the cart
   drawer's `open &&` block, same as `OrderStatusBadge`, so closing the drawer
   naturally cancels the poll.
5. Wire it into `cart-drawer.tsx` next to `<OrderStatusBadge orderId={activeOrderId} />`.

### B. Fee transparency before checkout
1. `lib/mesh/types.ts`: add `QuoteRequest`/`QuoteResponseContent` (only the fields
   used: `isEligible`, `fees.inFiat.{networkFeeFiat,minFeesFiat,maxFeesFiat}`).
2. `lib/mesh/quote.ts`: `getTransferQuote(amountInFiat, sessionId?)` — POST with the
   fixed symbol/network/address constants already used by checkout, plus whichever
   `brokerType` the risk-check above confirms.
3. `app/api/mesh/quote/route.ts`: POST handler, body `{ amountInFiat }`, calls the
   above, standard `MeshApiError` handling matching the rest of the API routes.
4. `cart-drawer.tsx`: effect fetching the quote when the drawer is open, a
   connection exists, and `total > 0`, keyed on `[open, connected, total]` (mirrors
   the existing balance-fetch effect right above it, including its `.catch()`
   pattern: on failure, silently omit the fee line rather than showing an error,
   since checkout's own server-side `verify` call is the real gate, this is display
   only). Renders one line near Total: "Est. network fee: $X.XX–$Y.YY".

## Verification
- Direct sandbox smoke test of both new `lib/mesh/*` functions (a throwaway script
  using real `.env.local` credentials) before wiring any UI, to settle the two risks
  above with real responses, not assumptions.
- Add `lib/mesh/transfers.integration.test.ts` and `lib/mesh/quote.integration.test.ts`,
  matching the existing `client.integration.test.ts` pattern (`describe.skipIf` on
  missing credentials).
- `npm run typecheck && npm run lint && npm run test && npm run build`.
- Manual check: run the dev server, curl the two new routes with a real session
  cookie, confirm real JSON shapes render without crashing. Full browser purchase
  flow through Mesh Link is out of scope for this smoke test (third-party iframe,
  not automatable here); note this limitation explicitly rather than claiming
  end-to-end coverage.
- Commit, push to `main`, `vercel --prod`, confirm the live alias returns 200 and
  reflects the new deploy.
