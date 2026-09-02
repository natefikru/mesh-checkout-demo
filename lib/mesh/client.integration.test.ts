import { describe, expect, it } from 'vitest'
import { callMesh } from '@/lib/mesh/client'
import { SANDBOX_COINBASE_BROKER_TYPE } from '@/lib/mesh/constants'
import type { IntegrationsResponseContent } from '@/lib/mesh/types'

/**
 * Hits the real Mesh sandbox. Skipped unless credentials are present, so it
 * runs locally and stays out of CI (no secrets there). Exists to catch drift
 * against the live API that a mocked unit test cannot.
 */
const hasCredentials = Boolean(process.env.MESH_CLIENT_ID && process.env.MESH_API_KEY)

describe.skipIf(!hasCredentials)('callMesh against the live sandbox', () => {
  it('lists integrations and finds sandbox Coinbase', async () => {
    const content = await callMesh<IntegrationsResponseContent>('GET', '/api/v1/integrations')
    const coinbase = content.items.find((i) => i.type === SANDBOX_COINBASE_BROKER_TYPE)
    expect(coinbase).toBeDefined()
    expect(coinbase?.name).toBe('Coinbase')
  })
})
