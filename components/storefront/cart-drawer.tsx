'use client'

import { useEffect, useState } from 'react'
import { useCart } from '@/components/storefront/cart-context'
import { useConnection } from '@/components/storefront/connection-context'
import { CartCheckoutButton } from '@/components/storefront/cart-checkout-loader'
import { OrderStatusBadge } from '@/components/storefront/order-status'
import type { Portfolio } from '@/lib/mesh/portfolio'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function CartDrawer() {
  const [open, setOpen] = useState(false)
  const { items, total, remove, clear, activeOrderId, setActiveOrderId } = useCart()
  const { connected } = useConnection()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!open || !connected) return
    let cancelled = false

    fetch('/api/mesh/portfolio')
      .then((res) => res.json())
      .then((data: Portfolio & { error?: string }) => {
        if (cancelled || !data.holdings) return
        const usdc = data.holdings.cryptocurrencyPositions.find((p) => p.symbol === 'USDC')
        setBalance(usdc?.amount ?? 0)
      })
      .catch(() => {
        /* balance display is best-effort; checkout still enforces the real check server-side */
      })

    return () => {
      cancelled = true
    }
  }, [open, connected])

  const insufficientFunds = connected && balance !== null && balance < total

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        Cart
        {items.length > 0 && (
          <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Cart</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-900">
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">Your cart is empty.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-gray-500">{item.colorway}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums text-gray-900">{currency.format(item.price)}</span>
                        <button type="button" onClick={() => remove(item.id)} className="text-xs text-gray-400 hover:text-red-600">
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {activeOrderId ? (
              <div className="border-t border-gray-200 px-5 py-4">
                <OrderStatusBadge orderId={activeOrderId} />
              </div>
            ) : (
              items.length > 0 && (
                <div className="space-y-3 border-t border-gray-200 px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total</span>
                    <span className="font-semibold tabular-nums text-gray-900">{currency.format(total)}</span>
                  </div>

                  {connected && balance !== null && (
                    <p className={`text-xs ${insufficientFunds ? 'text-red-600' : 'text-gray-500'}`}>
                      USDC balance: {balance.toLocaleString()}
                      {insufficientFunds && ' · insufficient for this order'}
                    </p>
                  )}

                  {connected ? (
                    <CartCheckoutButton
                      disabled={insufficientFunds}
                      onOrderCreated={(orderId) => {
                        setActiveOrderId(orderId)
                        clear()
                      }}
                    />
                  ) : (
                    <p className="text-xs text-gray-500">Connect Coinbase to check out.</p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </>
  )
}
