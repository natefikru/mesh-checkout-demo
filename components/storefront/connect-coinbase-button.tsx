'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createLink } from '@meshconnect/web-link-sdk'
import type { Link, LinkPayload, SessionSummary } from '@meshconnect/web-link-sdk'

interface StoredConnection {
  brokerName: string
  accountName: string
}

async function postConsoleEvent(kind: string, label: string, detail?: unknown, ok?: boolean) {
  await fetch('/api/console', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, label, detail, ok }),
  }).catch(() => {
    /* console logging is best-effort; never block the checkout flow on it */
  })
}

export function ConnectCoinbaseButton({
  initialConnection,
  onConnected,
  onDisconnected,
}: {
  initialConnection: StoredConnection | null
  onConnected?: (connection: StoredConnection) => void
  onDisconnected?: () => void
}) {
  const linkRef = useRef<Link | null>(null)
  const [busy, setBusy] = useState(false)
  const [connection, setConnection] = useState<StoredConnection | null>(initialConnection)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    linkRef.current = createLink({
      renderType: 'overlay',
      theme: 'system',
      displayFiatCurrency: 'USD',

      onIntegrationConnected: (payload: LinkPayload) => {
        const at = payload.accessToken
        if (!at) {
          void postConsoleEvent('sdk_event', 'onIntegrationConnected (delayedAuth)', payload, true)
          return
        }
        const token = at.accountTokens[0]
        void postConsoleEvent(
          'sdk_event',
          'onIntegrationConnected',
          { brokerType: at.brokerType, brokerName: at.brokerName, accountName: token.account.accountName },
          true,
        )

        void fetch('/api/mesh/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brokerType: at.brokerType,
            brokerName: at.brokerName,
            tokenId: token.tokenId ?? token.accessToken,
            accountId: token.account.accountId,
            accountName: token.account.accountName,
          }),
        })
          .then((res) => res.json())
          .then((data: { connection: StoredConnection }) => {
            setConnection(data.connection)
            onConnected?.(data.connection)
          })
          .catch(() => setError('Connected, but saving the connection failed. Refresh and try again.'))
      },

      onExit: (exitError?: string, summary?: SessionSummary) => {
        if (exitError) void postConsoleEvent('sdk_event', 'onExit (error)', { error: exitError, page: summary?.page }, false)
        else void postConsoleEvent('sdk_event', 'onExit', { page: summary?.page }, true)
        setBusy(false)
      },

      onEvent: (ev) => {
        void postConsoleEvent('sdk_event', ev.type, 'payload' in ev ? ev.payload : undefined, true)
      },
    })

    return () => linkRef.current?.closeLink()
  }, [onConnected])

  const open = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/mesh/link-token', { method: 'POST' })
      const data = (await res.json()) as { linkToken?: string; error?: string }
      if (!res.ok || !data.linkToken) {
        setError(data.error ?? 'Could not start Mesh Link')
        setBusy(false)
        return
      }
      linkRef.current?.openLink(data.linkToken)
    } catch {
      setError('Could not reach the server')
      setBusy(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    setDisconnecting(true)
    try {
      await fetch('/api/mesh/connections', { method: 'DELETE' })
      void postConsoleEvent('sdk_event', 'Disconnected Coinbase', undefined, true)
      setConnection(null)
      onDisconnected?.()
    } finally {
      setDisconnecting(false)
    }
  }, [onDisconnected])

  if (connection) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>
          {connection.brokerName} connected · {connection.accountName}
        </span>
        <button
          type="button"
          onClick={disconnect}
          disabled={disconnecting}
          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 disabled:opacity-50"
        >
          {disconnecting ? 'Disconnecting…' : 'Disconnect'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={open}
        disabled={busy}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
      >
        {busy ? 'Opening Mesh Link…' : 'Connect Coinbase'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
