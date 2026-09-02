import { callMesh } from '@/lib/mesh/client'
import type { B2BBrokerAccountBalanceModel, BrokerPortfolioValueModel, HoldingsModel } from '@/lib/mesh/types'
import type { StoredConnection } from '@/lib/store/connections'

export interface Portfolio {
  holdings: HoldingsModel
  value: BrokerPortfolioValueModel
  balance: B2BBrokerAccountBalanceModel
}

/**
 * Fans out to the three separate reads Mesh exposes for a connected account.
 * Each hits the underlying exchange live, so they run in parallel rather
 * than serially. authToken is the stored tokenId, per the Mesh managed
 * token model, not a raw accessToken.
 */
export async function readPortfolio(connection: StoredConnection, sessionId: string): Promise<Portfolio> {
  const body = { authToken: connection.tokenId, type: connection.brokerType }

  const [holdings, value, balance] = await Promise.all([
    callMesh<HoldingsModel>('POST', '/api/v1/holdings/get', {
      sessionId,
      body: { ...body, includeMarketValue: true },
    }),
    callMesh<BrokerPortfolioValueModel>('POST', '/api/v1/holdings/value', { sessionId, body }),
    callMesh<B2BBrokerAccountBalanceModel>('POST', '/api/v1/balance/get', { sessionId, body }),
  ])

  return { holdings, value, balance }
}

/** USDC available to spend, used to gate checkout before a link token is minted. */
export function usdcBalance(portfolio: Portfolio): number {
  const position = portfolio.holdings.cryptocurrencyPositions.find((p) => p.symbol === 'USDC')
  return position?.amount ?? 0
}
