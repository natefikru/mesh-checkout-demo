'use client'

import { CATALOG } from '@/lib/catalog'
import { useCart } from '@/components/storefront/cart-context'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function ProductGrid() {
  const { isInCart, toggle } = useCart()

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-3">
      {CATALOG.map((product) => {
        const inCart = isInCart(product.id)
        return (
          <div key={product.id} className="flex flex-col bg-white p-5">
            <div className="mb-4 flex aspect-square items-center justify-center bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
              {product.name}
            </div>
            <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500">{product.colorway}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">{currency.format(product.price)}</span>
              <button
                type="button"
                onClick={() => toggle(product.id)}
                className={
                  inCart
                    ? 'rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50'
                    : 'rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-700'
                }
              >
                {inCart ? 'Remove' : 'Add to cart'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
