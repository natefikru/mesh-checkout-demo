import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { callMesh, MeshApiError } from '@/lib/mesh/client'
import { resolveCoinbaseIntegrationId } from '@/lib/mesh/integrations'
import type { GetLinkTokenRequest, GetLinkTokenResponseContent } from '@/lib/mesh/types'

/**
 * Mints a connect-only link token restricted to Coinbase. Payment-mode
 * tokens (transferOptions) are minted in the checkout route instead, once an
 * order exists to correlate against.
 */
export async function POST() {
  const sessionId = await getSessionId()

  try {
    const integrationId = await resolveCoinbaseIntegrationId(sessionId)

    const body: GetLinkTokenRequest = {
      userId: sessionId,
      restrictMultipleAccounts: true,
      integrationId,
    }

    const content = await callMesh<GetLinkTokenResponseContent>('POST', '/api/v1/linktoken', {
      sessionId,
      body,
    })

    return NextResponse.json({ linkToken: content.linkToken })
  } catch (error) {
    if (error instanceof MeshApiError) {
      return NextResponse.json({ error: error.displayMessage ?? error.message }, { status: error.status === 200 ? 400 : error.status })
    }
    throw error
  }
}
