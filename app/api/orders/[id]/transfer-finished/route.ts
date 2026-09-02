import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { getOrder, updateOrderStatus } from '@/lib/store/orders'
import { appendConsoleEvent } from '@/lib/console/store'

interface TransferFinishedBody {
  txHash?: string
}

/**
 * The client's onTransferFinished callback lands here. This only ever moves
 * an order to `pending`, never `paid`: the callback fires when the provider
 * acknowledges the request, not when the chain confirms, so treating it as
 * settlement is the classic integration mistake. The webhook (Phase 6) is
 * the only path to `paid`.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sessionId = await getSessionId()

  const existing = await getOrder(id)
  if (!existing || existing.sessionId !== sessionId) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  const payload = (await req.json().catch(() => ({}))) as TransferFinishedBody
  const order = await updateOrderStatus(id, 'pending', { txHash: payload.txHash ?? null })

  await appendConsoleEvent({
    sessionId,
    kind: 'sdk_event',
    label: 'onTransferFinished',
    detail: { orderId: id, txHash: payload.txHash },
    ok: true,
  })

  return NextResponse.json({ order })
}
