import { redis } from '@/lib/store/redis'
import type { BrokerType } from '@/lib/mesh/types'

/**
 * What we persist from onIntegrationConnected. Deliberately holds the
 * Mesh-managed tokenId, never the raw accessToken: they match on first
 * connect and diverge once Mesh rotates the underlying token, and tokenId
 * is the stable handle for both downstream API calls and MMT reconnects.
 */
export interface StoredConnection {
  brokerType: BrokerType
  brokerName: string
  tokenId: string
  accountId: string
  accountName: string
  connectedAt: number
}

function key(sessionId: string): string {
  return `connection:${sessionId}`
}

export async function saveConnection(sessionId: string, connection: StoredConnection): Promise<void> {
  await redis().set(key(sessionId), connection)
}

export async function getConnection(sessionId: string): Promise<StoredConnection | null> {
  return redis().get<StoredConnection>(key(sessionId))
}

export async function deleteConnection(sessionId: string): Promise<void> {
  await redis().del(key(sessionId))
}
