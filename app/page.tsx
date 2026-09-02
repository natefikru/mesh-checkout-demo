import { getSessionId } from '@/lib/session'
import { getConnection } from '@/lib/store/connections'
import { ConnectionProvider } from '@/components/storefront/connection-context'
import { CartProvider } from '@/components/storefront/cart-context'
import { WalletPanel } from '@/components/storefront/wallet-panel'
import { CartDrawer } from '@/components/storefront/cart-drawer'
import { ProductGrid } from '@/components/storefront/product-grid'
import { ConsoleDrawer } from '@/components/console/console-drawer'

export default async function Home() {
  const sessionId = await getSessionId()
  const connection = await getConnection(sessionId)

  return (
    <ConnectionProvider initialConnection={connection}>
      <CartProvider>
        <div className="min-h-full bg-white pb-16 text-[#14161a]">
          <header className="border-b border-[#e4e4e7]">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
              <span className="font-display text-xl italic">Sole</span>
              <div className="flex items-center gap-4">
                <WalletPanel initialConnection={connection} />
                <CartDrawer />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-6 py-14">
            <div className="mb-10 max-w-lg">
              <h1 className="font-display text-4xl leading-none">New arrivals</h1>
              <p className="mt-3 text-sm text-[#71717a]">
                Pick a pair, pay in USDC from a connected Coinbase account, settled on Ethereum.
              </p>
            </div>
            <ProductGrid />
          </main>
        </div>

        <ConsoleDrawer />
      </CartProvider>
    </ConnectionProvider>
  )
}
