'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface ConnectionState {
  connected: boolean
  refreshKey: number
  markConnected: () => void
}

const ConnectionContext = createContext<ConnectionState | null>(null)

/** Shares connect status between the header's wallet control and the product grid's buy buttons. */
export function ConnectionProvider({ initialConnected, children }: { initialConnected: boolean; children: ReactNode }) {
  const [connected, setConnected] = useState(initialConnected)
  const [refreshKey, setRefreshKey] = useState(0)

  const markConnected = useCallback(() => {
    setConnected(true)
    setRefreshKey((k) => k + 1)
  }, [])

  return <ConnectionContext.Provider value={{ connected, refreshKey, markConnected }}>{children}</ConnectionContext.Provider>
}

export function useConnection(): ConnectionState {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error('useConnection must be used within a ConnectionProvider')
  return ctx
}
