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
