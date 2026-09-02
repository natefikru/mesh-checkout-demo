import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { getOrder } from '@/lib/store/orders'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sessionId = await getSessionId()
  const order = await getOrder(id)

  if (!order || order.sessionId !== sessionId) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({ order })
}
