import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { claimWebhookEvent } from './webhook-dedupe'

/** Hits the real Upstash instance; skipped unless credentials are present, same pattern as the Mesh sandbox test. */
const hasCredentials = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

describe.skipIf(!hasCredentials)('claimWebhookEvent against live Redis', () => {
  it('claims a fresh EventId once, then rejects every replay', async () => {
    const eventId = randomUUID()
    expect(await claimWebhookEvent(eventId)).toBe(true)
    expect(await claimWebhookEvent(eventId)).toBe(false)
    expect(await claimWebhookEvent(eventId)).toBe(false)
  })
})
