'use client'

import { useCallback, useRef, useState } from 'react'
import { createLink } from '@meshconnect/web-link-sdk'
import type { IntegrationAccessToken, Link, SessionSummary, TransferFinishedPayload } from '@meshconnect/web-link-sdk'
import { useCart } from '@/components/storefront/cart-context'
import { useConnection } from '@/components/storefront/connection-context'

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
  const { connection } = useConnection()
  const linkRef = useRef<Link | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openLinkFor = useCallback(
    (oid: string, linkToken: string) => {
      // Reuse the stored connection's tokenId through Link's accessTokens,
      // Mesh's documented return-user pattern: Link recognizes the account
      // and skips straight to asset selection instead of asking the shopper
      // to log into Coinbase and grant permissions again for a payment
      // they've already connected an account for.
      const accessTokens: IntegrationAccessToken[] | undefined = connection
        ? [
            {
              accessToken: connection.tokenId,
              // StoredConnection widens this to `string` at the storage boundary;
              // it was a valid SDK BrokerType when Mesh first returned it.
              brokerType: connection.brokerType as IntegrationAccessToken['brokerType'],
              brokerName: connection.brokerName,
              accountId: connection.accountId,
              accountName: connection.accountName,
            },
          ]
        : undefined

      linkRef.current = createLink({
        renderType: 'overlay',
        theme: 'system',
        displayFiatCurrency: 'USD',
        accessTokens,

        // Falls back to a fresh Coinbase login only if accessTokens above
        // didn't cover it (e.g. no stored connection yet).
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
    },
    [connection],
  )

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
        className="w-full rounded-full bg-[#14161a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#27272a] disabled:opacity-40"
      >
        {busy ? 'Opening…' : 'Pay with Coinbase'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
