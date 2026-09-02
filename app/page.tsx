import { getSessionId } from '@/lib/session'
import { getConnection } from '@/lib/store/connections'
import { ConnectCoinbaseButton } from '@/components/storefront/connect-coinbase-loader'

export default async function Home() {
  const sessionId = await getSessionId()
  const connection = await getConnection(sessionId)

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 px-6 py-24">
      <div className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-50">Mesh Connect sandbox</p>
        <h1 className="text-4xl font-medium tracking-tight">Sole</h1>
        <p className="max-w-md text-base leading-relaxed opacity-70">
          A sneaker storefront that settles in USDC from a connected Coinbase account.
        </p>
      </div>

      <ConnectCoinbaseButton initialConnection={connection} />
    </main>
  )
}
