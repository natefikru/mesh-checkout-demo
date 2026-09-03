# Architecture notes

Deeper reasoning behind a few decisions in this codebase. See the README for the quick overview and requirement mapping.

## Mesh client: one choke point, one exception

`lib/mesh/client.ts` is the only place outbound Mesh calls go through. It attaches credentials, unwraps the response envelope, and logs a redacted request/response pair to the console panel.

The one exception is `lib/mesh/verify.ts`. `/api/v1/transfers/managed/verify` is a GET that requires a JSON body, and the Fetch API refuses to send a body on a GET outright. That call goes through Node's raw `https` client instead.

## Session identity

Session identity is a bare UUID in an httpOnly cookie, set by `middleware.ts`. It has to happen in middleware because Server Components can't set cookies themselves, and this needs to exist before any page renders. The same UUID doubles as the Mesh `userId` and the Redis key prefix for everything the session owns.

## Token model: tokenId, not accessToken

Mesh hands back both a raw `accessToken` and a `tokenId` after a successful connect. They match on the first connection and diverge the moment Mesh rotates the underlying token. This app stores only `tokenId`, never the raw token, because `tokenId` is the stable handle for downstream API calls.

It's also what makes the return-user reconnect pattern work: passing the stored `tokenId` back through `createLink()`'s `accessTokens` option lets Link recognize the account and skip Coinbase re-authentication on a repeat checkout.

## Settlement: webhook-driven, not client-driven

`onTransferFinished` only ever moves an order to `pending`. It fires on provider acknowledgement, not chain confirmation, and treating that as payment confirmation is the classic integration bug: the Link UI says "Success" before the transfer has actually settled on-chain.

The webhook (`app/api/mesh/webhook/route.ts`) is the only path to `paid`. It's verified via HMAC-SHA256 over the raw request body and deduped on `EventId`. The order state machine (`lib/store/orders.ts`) applies that transition atomically with a Redis Lua script, which closes a real race: if the webhook and `onTransferFinished` land close together, an unsynchronized update could split an order's status from its recorded transaction hash.

## Console drawer

The resizable drawer at the bottom of the page streams every Mesh API call, SDK event, and webhook delivery for the current session in one interleaved timeline, polling `/api/console`. It's the same logging infrastructure the app uses internally (the redaction in `lib/mesh/client.ts` feeds it directly), exposed as a live panel for the demo.

## Fee quote and Mesh's own transfer record

Two Mesh endpoints outside the required flow, both wired into the cart drawer.

`POST /api/v1/transfers/managed/quote` shows an estimated network fee before checkout, over the same fixed token, network, and address the order will actually use. `brokerType` is hard-coded to the production value (`lib/mesh/quote.ts`): confirmed live against sandbox that the connection's own stored `brokerType` (`sandboxCoinbase`) gets a `400: "Broker SandboxCoinbase not supported"` on this specific endpoint, while `coinbase` succeeds even in the sandbox environment. Display-only; checkout's existing `verify` call is the real gate, so a failed quote fetch is silently swallowed rather than blocking anything.

`GET /api/v1/transfers/managed/mesh` (`lib/mesh/transfers.ts`) is Mesh's own record of a transfer, looked up by the order id sent as `transferOptions.transactionId` when the payment link token is minted, confirmed live to come back as `clientTransactionId` on the real transfer. Shown next to the app's own order status in `MeshTransferRecord`, so the pairing, "what my app recorded" against "what Mesh's API says happened", is visible without narration. It polls through a `pending` record rather than stopping on first sight, since Mesh creates the record immediately and updates its status as the transfer processes; stopping early would freeze the display on "Pending" even after the transfer actually settles.

## Connection revocation and expiry

Disconnect (`app/api/mesh/connections/route.ts`) calls Mesh's `DELETE /api/v1/account` with the stored `tokenId` as `authToken` before clearing the local record, so disconnecting in the app actually revokes the token on Mesh's side rather than just forgetting about it locally. Best-effort: a failed revoke still clears local state, logged to the console panel, so a flaky call can't strand the UI in a stuck "connected" state.

The inverse case matters too: a sandbox token can expire or get revoked outside this app, and Mesh then rejects it with `errorType: "unauthorizedToken"`. Both the portfolio route and the checkout route detect this specifically (`isUnauthorizedTokenError` in `lib/mesh/client.ts`), clear the now-dead local connection, and return `reconnectRequired: true`. The client (portfolio panel, wallet panel, cart drawer, checkout) resets to a disconnected state on that signal, so a stale token surfaces as "reconnect Coinbase" instead of every subsequent request silently 400ing forever with the UI still claiming to be connected.
