'use client'

import { useState } from 'react'
import { ConnectCoinbaseButton } from '@/components/storefront/connect-coinbase-loader'
import { PortfolioPanel } from '@/components/storefront/portfolio-panel'
import { useConnection } from '@/components/storefront/connection-context'
import type { StoredConnection } from '@/lib/store/connections'

export function WalletPanel({ initialConnection }: { initialConnection: StoredConnection | null }) {
  const { connected, refreshKey, markConnected, markDisconnected } = useConnection()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative flex items-center gap-3">
      <ConnectCoinbaseButton
        initialConnection={initialConnection}
        onConnected={markConnected}
        onDisconnected={() => {
          markDisconnected()
          setExpanded(false)
        }}
      />
      {connected && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-[#71717a] underline underline-offset-2 hover:text-[#14161a]"
        >
          {expanded ? 'Hide portfolio' : 'Show portfolio'}
        </button>
      )}
      {connected && expanded && (
        <div className="absolute right-0 top-full z-10 mt-3 w-72 rounded-lg border border-[#e4e4e7] bg-white p-4 shadow-lg">
          <PortfolioPanel connected={connected} refreshKey={refreshKey} />
        </div>
      )}
    </div>
  )
}
