import { describe, expect, it } from 'vitest'
import { getMeshTransferByClientId } from '@/lib/mesh/transfers'

/**
 * Hits the real Mesh sandbox. Skipped unless credentials are present, so it
 * runs locally and stays out of CI (no secrets there).
 */
const hasCredentials = Boolean(process.env.MESH_CLIENT_ID && process.env.MESH_API_KEY)

describe.skipIf(!hasCredentials)('getMeshTransferByClientId against the live sandbox', () => {
  it('returns null for a client transaction id with no matching transfer', async () => {
    const transfer = await getMeshTransferByClientId('no-such-order-id')
    expect(transfer).toBeNull()
  })
})
