'use client'

import dynamic from 'next/dynamic'

// Same window-at-module-scope constraint as the connect button; see
// connect-coinbase-loader.tsx.
export const CheckoutButton = dynamic(
  () => import('@/components/storefront/checkout-button').then((m) => m.CheckoutButton),
  { ssr: false },
)
