'use client'

import Image from 'next/image'
import { CATALOG } from '@/lib/catalog'
import { useCart } from '@/components/storefront/cart-context'

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function ProductGrid() {
  const { isInCart, toggle } = useCart()

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e4e4e7] bg-[#e4e4e7] sm:grid-cols-3">
      {CATALOG.map((product) => {
        const inCart = isInCart(product.id)
        return (
          <div key={product.id} className="flex flex-col bg-white p-5">
            <div className="relative mb-4 aspect-square overflow-hidden bg-[#f4f4f5]">
              <Image
                src={product.image}
                alt={`${product.name} sneaker`}
                fill
                sizes="(min-width: 640px) 33vw, 50vw"
                className="object-contain p-6"
              />
            </div>
            <h3 className="font-display text-lg leading-tight">{product.name}</h3>
            <p className="text-sm text-[#71717a]">{product.colorway}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="tabular text-sm font-medium">{currency.format(product.price)}</span>
              <button
                type="button"
                onClick={() => toggle(product.id)}
                className={
                  inCart
                    ? 'rounded-full border border-[#d4d4d8] px-3.5 py-1.5 text-xs font-medium text-[#3f3f46] transition hover:border-[#a1a1aa]'
                    : 'rounded-full bg-[#14161a] px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#27272a]'
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
