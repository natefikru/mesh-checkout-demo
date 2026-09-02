import { redis } from '@/lib/store/redis'

const TTL_SECONDS = 60 * 60 * 24 * 7

/**
 * Delivery is at-least-once and `Id` changes on every retry, so `EventId`
 * (stable across retries) is the only usable idempotency key. Returns true
 * the first time an EventId is seen, false on every replay.
 */
export async function claimWebhookEvent(eventId: string): Promise<boolean> {
  const result = await redis().set(`webhook-event:${eventId}`, Date.now(), { nx: true, ex: TTL_SECONDS })
  return result === 'OK'
}
