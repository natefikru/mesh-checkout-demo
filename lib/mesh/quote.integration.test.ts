import { describe, expect, it } from 'vitest'
import { getTransferQuote } from '@/lib/mesh/quote'

/**
 * Hits the real Mesh sandbox. Skipped unless credentials are present, so it
 * runs locally and stays out of CI (no secrets there).
 */
const hasCredentials = Boolean(process.env.MESH_CLIENT_ID && process.env.MESH_API_KEY)

describe.skipIf(!hasCredentials)('getTransferQuote against the live sandbox', () => {
  it('returns an eligible quote with a positive network fee for a $50 order', async () => {
    const quote = await getTransferQuote(50)
    expect(quote.isEligible).toBe(true)
    expect(quote.fees.inFiat.minFeesFiat).toBeGreaterThan(0)
  })
})
