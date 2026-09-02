'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { StoredConnection } from '@/lib/store/connections'

interface ConnectionState {
  connected: boolean
  connection: StoredConnection | null
  refreshKey: number
  markConnected: (connection: StoredConnection) => void
  markDisconnected: () => void
}

const ConnectionContext = createContext<ConnectionState | null>(null)

/**
 * Shares connect status between the header's wallet control, the product
 * grid's buy buttons, and checkout. Carries the full connection (including
 * tokenId) so checkout can replay it through Link's `accessTokens` on a
 * return visit — Mesh's documented pattern for skipping re-auth, and the
 * reason this value already reaches the client via initialConnection rather
 * than something new introduced here.
 */
export function ConnectionProvider({
  initialConnection,
  children,
}: {
  initialConnection: StoredConnection | null
  children: ReactNode
}) {
  const [connection, setConnection] = useState<StoredConnection | null>(initialConnection)
  const [refreshKey, setRefreshKey] = useState(0)

  const markConnected = useCallback((next: StoredConnection) => {
    setConnection(next)
    setRefreshKey((k) => k + 1)
  }, [])

  const markDisconnected = useCallback(() => setConnection(null), [])

  return (
    <ConnectionContext.Provider value={{ connected: connection !== null, connection, refreshKey, markConnected, markDisconnected }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection(): ConnectionState {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error('useConnection must be used within a ConnectionProvider')
  return ctx
}
