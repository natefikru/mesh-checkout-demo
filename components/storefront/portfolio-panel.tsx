'use client'

import { useEffect, useState } from 'react'
import type { Portfolio } from '@/lib/mesh/portfolio'

type FetchResult = { status: 'error'; message: string } | { status: 'ready'; portfolio: Portfolio }

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const quantity = new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 })

/**
 * Refetches whenever `refreshKey` changes, which the parent bumps on a fresh
 * connection. Tags each result with the refreshKey it answers, so "loading"
 * is derived from a stale/absent tag rather than set with an imperative
 * setState at the top of the effect.
 */
export function PortfolioPanel({
  connected,
  refreshKey,
  onExpired,
}: {
  connected: boolean
  refreshKey: number
  onExpired?: () => void
}) {
  const [loaded, setLoaded] = useState<{ key: number; result: FetchResult } | null>(null)

  useEffect(() => {
    if (!connected) return
    let cancelled = false

    fetch('/api/mesh/portfolio')
      .then(async (res) => {
        const data = (await res.json()) as Portfolio & { error?: string; reconnectRequired?: boolean }
        if (cancelled) return
        if (data.reconnectRequired) {
          onExpired?.()
          return
        }
        setLoaded({
          key: refreshKey,
          result: res.ok ? { status: 'ready', portfolio: data } : { status: 'error', message: data.error ?? 'Could not read the portfolio' },
        })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key: refreshKey, result: { status: 'error', message: 'Could not reach the server' } })
      })

    return () => {
      cancelled = true
    }
  }, [connected, refreshKey, onExpired])

  if (!connected) return null

  const isLoading = loaded === null || loaded.key !== refreshKey
  if (isLoading) return <p className="text-sm opacity-50">Loading portfolio…</p>
  if (loaded.result.status === 'error') return <p className="text-sm text-red-600">{loaded.result.message}</p>

  const { holdings, value, balance } = loaded.result.portfolio
  const fiat = balance.balances[0]
  const positions = holdings.cryptocurrencyPositions.filter((p) => p.amount > 0)

  return (
    <div className="space-y-4 border-t border-current/10 pt-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Portfolio</p>
        <p className="text-lg font-medium tabular-nums">{currency.format(value.totalValue)}</p>
      </div>

      {fiat?.cash !== null && fiat?.cash !== undefined && (
        <p className="text-sm opacity-70">Cash: {currency.format(fiat.cash)}</p>
      )}

      <ul className="divide-y divide-current/10">
        {positions.map((p) => (
          <li key={p.symbol} className="flex items-baseline justify-between py-2 text-sm">
            <span>{p.symbol}</span>
            <span className="tabular-nums opacity-70">
              {quantity.format(p.amount)}
              {p.marketValue !== null && <span className="ml-3 opacity-50">{currency.format(p.marketValue)}</span>}
            </span>
          </li>
        ))}
        {positions.length === 0 && <li className="py-2 text-sm opacity-50">No crypto positions</li>}
      </ul>
    </div>
  )
}
