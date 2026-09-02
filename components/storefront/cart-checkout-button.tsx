'use client'

import { useCallback, useRef, useState } from 'react'
import { createLink } from '@meshconnect/web-link-sdk'
import type { Link, SessionSummary, TransferFinishedPayload } from '@meshconnect/web-link-sdk'
import { useCart } from '@/components/storefront/cart-context'

async function postConsoleEvent(kind: string, label: string, detail?: unknown, ok?: boolean) {
  await fetch('/api/console', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, label, detail, ok }),
  }).catch(() => {
    /* console logging is best-effort; never block checkout on it */
  })
}

interface CartCheckoutButtonProps {
  disabled: boolean
  onOrderCreated: (orderId: string) => void
}

export function CartCheckoutButton({ disabled, onOrderCreated }: CartCheckoutButtonProps) {
  const { productIds } = useCart()
  const linkRef = useRef<Link | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openLinkFor = useCallback((oid: string, linkToken: string) => {
    linkRef.current = createLink({
      renderType: 'overlay',
      theme: 'system',
      displayFiatCurrency: 'USD',

      // The payment flow re-authenticates against Coinbase itself; this app
      // already has a saved connection from earlier, so a fresh one here is
      // only logged, not stored.
      onIntegrationConnected: (payload) => {
        void postConsoleEvent('sdk_event', 'onIntegrationConnected (checkout)', payload, true)
      },

      onTransferFinished: (payload: TransferFinishedPayload) => {
        void postConsoleEvent('sdk_event', 'onTransferFinished', payload, true)
        const txHash = 'txHash' in payload ? payload.txHash : undefined
        void fetch(`/api/orders/${oid}/transfer-finished`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash }),
        })
      },

      onExit: (exitError?: string, summary?: SessionSummary) => {
        if (exitError) void postConsoleEvent('sdk_event', 'onExit (checkout)', { error: exitError, page: summary?.page }, false)
        setBusy(false)
      },

      onEvent: (ev) => {
        void postConsoleEvent('sdk_event', ev.type, 'payload' in ev ? ev.payload : undefined, true)
      },
    })

    linkRef.current.openLink(linkToken)
  }, [])

  const checkout = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds }),
      })
      const data = (await res.json()) as { orderId?: string; linkToken?: string; error?: string }
      if (!res.ok || !data.orderId || !data.linkToken) {
        setError(data.error ?? 'Could not start checkout')
        setBusy(false)
        return
      }
      onOrderCreated(data.orderId)
      openLinkFor(data.orderId, data.linkToken)
    } catch {
      setError('Could not reach the server')
      setBusy(false)
    }
  }, [productIds, openLinkFor, onOrderCreated])

  return (
    <div className="space-y-1">
      <button
        onClick={checkout}
        disabled={busy || disabled}
        className="w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-40"
      >
        {busy ? 'Opening…' : 'Pay with Coinbase'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
