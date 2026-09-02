'use client'

import dynamic from 'next/dynamic'

// @meshconnect/web-link-sdk touches `window` at module scope, which breaks
// even a 'use client' component during Next's server-side render pass.
// ssr: false is only permitted from within a Client Component boundary, so
// this thin wrapper exists purely to hold that option.
export const ConnectCoinbaseButton = dynamic(
  () => import('@/components/storefront/connect-coinbase-button').then((m) => m.ConnectCoinbaseButton),
  { ssr: false },
)
