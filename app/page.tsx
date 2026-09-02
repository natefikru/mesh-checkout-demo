import { getSessionId } from '@/lib/session'
import { getConnection } from '@/lib/store/connections'
import { ConnectionProvider } from '@/components/storefront/connection-context'
import { WalletPanel } from '@/components/storefront/wallet-panel'
import { ProductGrid } from '@/components/storefront/product-grid'

export default async function Home() {
  const sessionId = await getSessionId()
  const connection = await getConnection(sessionId)

  return (
    <ConnectionProvider initialConnected={connection !== null}>
      <div className="min-h-full bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <span className="text-lg font-semibold tracking-tight">Sole</span>
            <WalletPanel initialConnection={connection} />
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">New arrivals</h1>
            <p className="mt-1 text-sm text-gray-500">Pay in USDC from a connected Coinbase account.</p>
          </div>
          <ProductGrid />
        </main>
      </div>
    </ConnectionProvider>
  )
}
