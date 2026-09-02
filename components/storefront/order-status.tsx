'use client'

import { useEffect, useState } from 'react'

interface OrderView {
  status: 'created' | 'pending' | 'paid' | 'failed'
  txHash: string | null
}

const LABEL: Record<OrderView['status'], string> = {
  created: 'Awaiting confirmation…',
  pending: 'Pending — waiting on the network',
  paid: 'Paid',
  failed: 'Failed',
}

const POLL_MS = 1500

/** Polls until the order reaches a terminal state; paid only ever arrives via the webhook, never onTransferFinished. */
export function OrderStatusBadge({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderView | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = () => {
      fetch(`/api/orders/${orderId}`)
        .then((res) => res.json())
        .then((data: { order?: OrderView }) => {
          if (cancelled || !data.order) return
          setOrder(data.order)
          if (data.order.status !== 'paid' && data.order.status !== 'failed') {
            timer = setTimeout(poll, POLL_MS)
          }
        })
        .catch(() => {
          if (!cancelled) timer = setTimeout(poll, POLL_MS)
        })
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [orderId])

  if (!order) return <p className="text-xs opacity-50">Checking order…</p>

  const color = order.status === 'paid' ? 'text-emerald-600' : order.status === 'failed' ? 'text-red-600' : 'opacity-60'

  return (
    <p className={`text-xs ${color}`}>
      {LABEL[order.status]}
      {order.status === 'paid' && order.txHash && <span className="ml-1 font-mono">{order.txHash.slice(0, 10)}…</span>}
    </p>
  )
}
