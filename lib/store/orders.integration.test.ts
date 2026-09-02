import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createOrder, getOrder, updateOrderStatus } from './orders'
import type { Order } from './orders'

/** Hits real Redis; skipped unless credentials are present, same pattern as the other integration tests. */
const hasCredentials = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

function freshOrder(): Order {
  const now = Date.now()
  return {
    id: randomUUID(),
    sessionId: 'test-session',
    items: [{ productId: 'field-runner', productName: 'Field Runner', price: 50 }],
    amountUsd: 50,
    status: 'created',
    txHash: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe.skipIf(!hasCredentials)('updateOrderStatus against live Redis', () => {
  it('reaches paid directly from created, matching sandbox skipping Pending', async () => {
    const order = freshOrder()
    await createOrder(order)

    const updated = await updateOrderStatus(order.id, 'paid', { txHash: '0xabc' })
    expect(updated?.status).toBe('paid')
    expect(updated?.txHash).toBe('0xabc')
  })

  it('a terminal order rejects the entire later update, not just the status field', async () => {
    const order = freshOrder()
    await createOrder(order)
    await updateOrderStatus(order.id, 'paid', { txHash: '0xreal-settlement' })

    // A late onTransferFinished-equivalent call, arriving after the webhook already settled it.
    const afterLateUpdate = await updateOrderStatus(order.id, 'pending', { txHash: '0xshould-not-overwrite' })

    expect(afterLateUpdate?.status).toBe('paid')
    expect(afterLateUpdate?.txHash).toBe('0xreal-settlement')

    const persisted = await getOrder(order.id)
    expect(persisted?.status).toBe('paid')
    expect(persisted?.txHash).toBe('0xreal-settlement')
  })

  it('returns null for an order that does not exist', async () => {
    expect(await updateOrderStatus(randomUUID(), 'paid')).toBeNull()
  })
})
