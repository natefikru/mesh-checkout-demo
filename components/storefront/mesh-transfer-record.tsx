'use client'

import { useEffect, useState } from 'react'

interface TransferView {
  status: 'pending' | 'succeeded' | 'failed'
  hash: string | null
  infoUrl: string | null
}

const POLL_MS = 1500
const MAX_ATTEMPTS = 20

const LABEL: Record<TransferView['status'], string> = {
  pending: 'Pending on Mesh',
  succeeded: 'Succeeded',
  failed: 'Failed',
}

/**
 * Mesh's own transfer record, polled independently of the app's local order
 * status (order-status.tsx). Shown side by side so the pairing, "our order
 * record" vs. "Mesh's transfer record", is visible without narration.
 * Capped at MAX_ATTEMPTS so an order the shopper never completes doesn't
 * poll forever.
 */
export function MeshTransferRecord({ orderId }: { orderId: string }) {
  const [transfer, setTransfer] = useState<TransferView | null>(null)
  const [exhausted, setExhausted] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0

    const poll = () => {
      attempts += 1
      fetch(`/api/orders/${orderId}/mesh-transfer`)
        .then((res) => res.json())
        .then((data: { transfer?: TransferView | null }) => {
          if (cancelled) return
          if (data.transfer) setTransfer(data.transfer)
          // Keep polling through 'pending': Mesh creates the transfer record
          // immediately, then updates its status as the transfer processes.
          // Stopping on first sight would freeze the UI on "Pending on Mesh"
          // forever, exactly the comparison this component exists to show.
          if (data.transfer && data.transfer.status !== 'pending') return
          if (attempts >= MAX_ATTEMPTS) {
            setExhausted(true)
            return
          }
          timer = setTimeout(poll, POLL_MS)
        })
        .catch(() => {
          if (!cancelled && attempts < MAX_ATTEMPTS) timer = setTimeout(poll, POLL_MS)
        })
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [orderId])

  if (!transfer) {
    return <p className="text-xs opacity-50">{exhausted ? 'No Mesh record yet' : "Checking Mesh's record…"}</p>
  }

  const color = transfer.status === 'succeeded' ? 'text-emerald-600' : transfer.status === 'failed' ? 'text-red-600' : 'opacity-60'

  return (
    <p className={`text-xs ${color}`}>
      Mesh: {LABEL[transfer.status]}
      {transfer.hash && transfer.infoUrl && (
        <>
          {' · '}
          <a href={transfer.infoUrl} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2">
            {transfer.hash.slice(0, 10)}…
          </a>
        </>
      )}
    </p>
  )
}
