'use client'

import { CATALOG } from '@/lib/catalog'
import { useConnection } from '@/components/storefront/connection-context'
import { CheckoutButton } from '@/components/storefront/checkout-loader'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function ProductGrid() {
  const { connected } = useConnection()

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-3">
      {CATALOG.map((product) => (
        <div key={product.id} className="flex flex-col bg-white p-5">
          <div className="mb-4 flex aspect-square items-center justify-center bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
            {product.name}
          </div>
          <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
          <p className="text-sm text-gray-500">{product.colorway}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">{currency.format(product.price)}</span>
            {connected ? (
              <CheckoutButton product={product} />
            ) : (
              <button
                type="button"
                disabled
                title="Connect Coinbase to buy"
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                Buy
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
