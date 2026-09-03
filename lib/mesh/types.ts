/**
 * Hand-transcribed from the live Mesh Integration API OpenAPI spec
 * (https://integration-api.meshconnect.com/swagger/v1/swagger.json), not the
 * docs site, which lags it. Only the fields this app actually uses are typed.
 */

export type ApiResultStatus =
  | 'ok'
  | 'serverFailure'
  | 'permissionDenied'
  | 'badRequest'
  | 'notFound'
  | 'conflict'
  | 'tooManyRequest'
  | 'locked'
  | 'unavailableForLegalReasons'

export interface MeshEnvelope<T> {
  status: ApiResultStatus
  message: string | null
  displayMessage: string | null
  errorHash: string | null
  teamCode: string | null
  errorType: string | null
  errorData: unknown | null
  content: T | null
}

export type BrokerType = string

export interface TransferToAddressWithAmount {
  networkId: string
  symbol: string
  address: string
  addressTag?: string
  note?: string
  amount?: number
  displayAmountInFiat?: number
}

export interface LinkTokenTransferOptions {
  toAddresses?: TransferToAddressWithAmount[]
  amountInFiat?: number
  transactionId?: string
  transferType?: 'deposit' | 'payment' | 'onramp' | 'fiatOnRamp' | 'fiatOffRamp' | 'subscribe' | 'unsubscribe'
  isInclusiveFeeEnabled?: boolean
}

export interface GetLinkTokenRequest {
  userId: string
  restrictMultipleAccounts?: boolean
  integrationId?: string
  transferOptions?: LinkTokenTransferOptions
}

export interface GetLinkTokenResponseContent {
  linkToken: string
  paymentLink?: string
}

export interface IntegrationModel {
  id: string
  name: string | null
  type: BrokerType
  categories: string[] | null
  brokerGroup: string
  cryptoTransfersSupported: boolean
}

export interface IntegrationsResponseContent {
  items: IntegrationModel[]
}

export interface Position {
  name: string | null
  symbol: string | null
  amount: number
  costBasis: number | null
}

export interface PositionWithMarketValue extends Position {
  marketValue: number | null
  lastPrice: number | null
}

export interface HoldingsModel {
  status: 'succeeded' | 'failed' | 'notAuthorized'
  errorMessage: string | null
  displayMessage: string | null
  type: BrokerType
  accountId: string | null
  institutionName: string | null
  accountName: string | null
  cryptocurrencyPositions: PositionWithMarketValue[]
  equityPositions: PositionWithMarketValue[]
}

export interface BrokerPortfolioValueModel {
  totalValue: number
  totalPerformance: number
  equitiesValue: number
  equitiesPerformance: number
  cryptocurrenciesValue: number
  cryptocurrenciesPerformance: number
  nftsValue: number
  fiatValue: number
}

export interface FiatBalance {
  cash: number | null
  buyingPower: number | null
  cryptocurrencyBuyingPower: number | null
  currencyCode: string | null
}

export interface B2BBrokerAccountBalanceModel {
  balances: FiatBalance[]
  totalCashUsdValue: number | null
  totalBuyingPowerUsdValue: number | null
}

export type TransferVerifyFailureReason =
  | 'notSupportedOnIntegration'
  | 'notSupportedOnNetwork'
  | 'invalidAddressFormat'
  | 'notSupportedOnToken'

/** Live shape confirmed 2026-09-02: {status, errorMessage} on success, plus failureReason on failure. */
export interface TransferVerifyResponseContent {
  status: 'succeeded' | 'failed'
  errorMessage: string | null
  failureReason?: TransferVerifyFailureReason
}

export interface TransferVerificationRequest {
  integrationId: string
  token: string
  networkId: string
  targetAddress: string
}

/** Mesh's own record of a transfer, not this app's. Only the fields the UI displays. */
export interface TransferModel {
  id: string
  clientTransactionId: string | null
  status: 'pending' | 'succeeded' | 'failed'
  hash: string | null
  infoUrl: string | null
  amountInFiat: number
  symbol: string | null
  networkName: string | null
}

export interface GetMeshTransfersResponseContent {
  items: TransferModel[]
  total: number
  hasMorePages: boolean
}

export interface QuoteRequest {
  amountInFiat: number
  fiatCurrency: string
  symbol: string
  networkId: string
  toAddress: string
  brokerType: BrokerType
}

interface QuoteFees {
  networkFeeFiat: number
  minFeesFiat: number
  maxFeesFiat: number
}

export interface QuoteResponseContent {
  isEligible: boolean
  fees: { inFiat: QuoteFees }
}
