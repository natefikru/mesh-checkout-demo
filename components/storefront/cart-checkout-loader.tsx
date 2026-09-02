'use client'

import dynamic from 'next/dynamic'

// Same window-at-module-scope constraint as the other Mesh SDK buttons; see
// connect-coinbase-loader.tsx.
export const CartCheckoutButton = dynamic(
  () => import('@/components/storefront/cart-checkout-button').then((m) => m.CartCheckoutButton),
  { ssr: false },
)
