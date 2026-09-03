import { callMesh } from '@/lib/mesh/client'
import { ETHEREUM_NETWORK_ID, PRODUCTION_COINBASE_BROKER_TYPE, TEST_WALLET_ADDRESS, USDC_SYMBOL } from '@/lib/mesh/constants'
import type { QuoteRequest, QuoteResponseContent } from '@/lib/mesh/types'

/**
 * Fee/eligibility preview shown before checkout, over the same fixed
 * token/network/address this app always checks out with. brokerType is
 * hard-coded to the production value: confirmed live against sandbox that
 * 'sandboxCoinbase' (the connection's own stored brokerType) 400s with
 * "Broker SandboxCoinbase not supported", while 'coinbase' succeeds even in
 * the sandbox environment. This is a real API quirk, not an oversight.
 */
export async function getTransferQuote(amountInFiat: number, sessionId?: string): Promise<QuoteResponseContent> {
  const body: QuoteRequest = {
    amountInFiat,
    fiatCurrency: 'USD',
    symbol: USDC_SYMBOL,
    networkId: ETHEREUM_NETWORK_ID,
    toAddress: TEST_WALLET_ADDRESS,
    brokerType: PRODUCTION_COINBASE_BROKER_TYPE,
  }

  return callMesh<QuoteResponseContent>('POST', '/api/v1/transfers/managed/quote', { sessionId, body })
}
