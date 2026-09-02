import { NextResponse } from 'next/server'
import { requireEnv } from '@/lib/env'
import { verifyWebhookSignature } from '@/lib/mesh/webhook'
import type { MeshTransferWebhook } from '@/lib/mesh/webhook'
import { claimWebhookEvent } from '@/lib/store/webhook-dedupe'
import { getOrder, updateOrderStatus } from '@/lib/store/orders'
import { appendConsoleEvent } from '@/lib/console/store'

export const runtime = 'nodejs'

/**
 * The only path an order can reach `paid` through. onTransferFinished
 * (app/api/orders/[id]/transfer-finished) only ever sets `pending`, because
 * it fires on provider acknowledgement, not chain confirmation — this
 * webhook, gated on Mesh's own "Succeeded" status, is the real settlement
 * signal.
 */
export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer())
  const signature = req.headers.get('x-mesh-signature-256')
  const secret = requireEnv('MESH_WEBHOOK_SECRET')

  if (!verifyWebhookSignature(raw, signature, secret)) {
    return new NextResponse('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(raw.toString('utf8')) as MeshTransferWebhook

  const isNewDelivery = await claimWebhookEvent(event.EventId)
  if (!isNewDelivery) {
    return NextResponse.json({ ok: true, deduped: true })
  }

  if (event.TransactionId) {
    const order = await getOrder(event.TransactionId)
    if (order) {
      if (event.TransferStatus === 'Succeeded') {
        await updateOrderStatus(order.id, 'paid', { txHash: event.TxHash ?? null })
      } else if (event.TransferStatus === 'Failed') {
        await updateOrderStatus(order.id, 'failed')
      }

      await appendConsoleEvent({
        sessionId: order.sessionId,
        kind: 'webhook',
        label: `Mesh webhook: ${event.TransferStatus}`,
        detail: { orderId: order.id, transferId: event.TransferId, txHash: event.TxHash },
        ok: event.TransferStatus === 'Succeeded',
      })
    }
  }

  return NextResponse.json({ ok: true })
}
