import { callMesh } from '@/lib/mesh/client'
import { PRODUCTION_COINBASE_BROKER_TYPE, SANDBOX_COINBASE_BROKER_TYPE } from '@/lib/mesh/constants'
import type { IntegrationsResponseContent } from '@/lib/mesh/types'

interface CacheEntry {
  id: string
  expiresAt: number
}

let cache: CacheEntry | undefined
const CACHE_TTL_MS = 60 * 60 * 1000

/**
 * The sandbox Coinbase integration id isn't published anywhere; it has to be
 * resolved at runtime from the catalog. Cached in module scope for a warm
 * function's lifetime since it never changes within an hour.
 */
export async function resolveCoinbaseIntegrationId(sessionId?: string): Promise<string> {
  if (cache && cache.expiresAt > Date.now()) return cache.id

  const content = await callMesh<IntegrationsResponseContent>('GET', '/api/v1/integrations', { sessionId })
  const match =
    content.items.find((i) => i.type === SANDBOX_COINBASE_BROKER_TYPE) ??
    content.items.find((i) => i.type === PRODUCTION_COINBASE_BROKER_TYPE) ??
    content.items.find((i) => i.brokerGroup === 'coinbase')

  if (!match) throw new Error('Coinbase integration not found in the Mesh catalog')

  cache = { id: match.id, expiresAt: Date.now() + CACHE_TTL_MS }
  return match.id
}
