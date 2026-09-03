import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { getConnection, deleteConnection } from '@/lib/store/connections'
import { createOrder } from '@/lib/store/orders'
import type { Order } from '@/lib/store/orders'
import { getProduct } from '@/lib/catalog'
import type { Product } from '@/lib/catalog'
import { readPortfolio, usdcBalance } from '@/lib/mesh/portfolio'
import { resolveCoinbaseIntegrationId } from '@/lib/mesh/integrations'
import { verifyTransfer } from '@/lib/mesh/verify'
import { callMesh, MeshApiError, isUnauthorizedTokenError } from '@/lib/mesh/client'
import { ETHEREUM_NETWORK_ID, TEST_WALLET_ADDRESS, USDC_SYMBOL } from '@/lib/mesh/constants'
import type { GetLinkTokenRequest, GetLinkTokenResponseContent } from '@/lib/mesh/types'

interface CheckoutRequestBody {
  productIds: string[]
}

function isCheckoutRequestBody(value: unknown): value is CheckoutRequestBody {
  if (typeof value !== 'object' || value === null) return false
  const productIds = (value as Record<string, unknown>).productIds
  return Array.isArray(productIds) && productIds.length > 0 && productIds.every((id) => typeof id === 'string')
}

/**
 * Creates an order and mints a payment-mode link token for it. Everything
 * here runs before Link ever opens: connection check, live USDC balance,
 * and a pre-flight verify of the exact token/network/address combination.
 */
export async function POST(req: Request) {
  const sessionId = await getSessionId()
  const payload: unknown = await req.json()

  if (!isCheckoutRequestBody(payload)) {
    return NextResponse.json({ error: 'Missing productIds' }, { status: 400 })
  }

  const items = payload.productIds.map(getProduct).filter((p): p is Product => p !== undefined)
  if (items.length !== payload.productIds.length) {
    return NextResponse.json({ error: 'Unknown product' }, { status: 404 })
  }
  const total = items.reduce((sum, p) => sum + p.price, 0)

  const connection = await getConnection(sessionId)
  if (!connection) {
    return NextResponse.json({ error: 'Connect Coinbase before checking out' }, { status: 400 })
  }

  try {
    const portfolio = await readPortfolio(connection, sessionId)
    const balance = usdcBalance(portfolio)
    if (balance < total) {
      return NextResponse.json({ error: `Insufficient USDC balance: have ${balance}, need ${total}` }, { status: 400 })
    }

    const integrationId = await resolveCoinbaseIntegrationId(sessionId)

    const verification = await verifyTransfer(
      { integrationId, token: USDC_SYMBOL, networkId: ETHEREUM_NETWORK_ID, targetAddress: TEST_WALLET_ADDRESS },
      sessionId,
    )
    if (verification.status !== 'succeeded') {
      return NextResponse.json({ error: verification.errorMessage ?? 'This transfer combination is not supported' }, { status: 400 })
    }

    const order: Order = {
      id: randomUUID(),
      sessionId,
      items: items.map((p) => ({ productId: p.id, productName: p.name, price: p.price })),
      amountUsd: total,
      status: 'created',
      txHash: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await createOrder(order)

    const linkTokenBody: GetLinkTokenRequest = {
      userId: sessionId,
      restrictMultipleAccounts: true,
      integrationId,
      transferOptions: {
        transactionId: order.id,
        transferType: 'payment',
        toAddresses: [{ networkId: ETHEREUM_NETWORK_ID, symbol: USDC_SYMBOL, address: TEST_WALLET_ADDRESS, amount: total }],
      },
    }

    const content = await callMesh<GetLinkTokenResponseContent>('POST', '/api/v1/linktoken', {
      sessionId,
      body: linkTokenBody,
    })

    return NextResponse.json({ orderId: order.id, linkToken: content.linkToken })
  } catch (error) {
    if (isUnauthorizedTokenError(error)) {
      // Same stale-token case as the portfolio route: the balance check or
      // verify call above hit a token Mesh no longer honors. Clear it so
      // the shopper gets a clean "reconnect" path instead of a checkout
      // that fails the same way on every retry.
      await deleteConnection(sessionId)
      return NextResponse.json({ error: 'Coinbase connection expired. Reconnect to continue.', reconnectRequired: true }, { status: 401 })
    }
    if (error instanceof MeshApiError) {
      return NextResponse.json({ error: error.displayMessage ?? error.message }, { status: error.status === 200 ? 400 : error.status })
    }
    throw error
  }
}
