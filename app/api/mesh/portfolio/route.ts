import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { getConnection, deleteConnection } from '@/lib/store/connections'
import { readPortfolio } from '@/lib/mesh/portfolio'
import { MeshApiError, isUnauthorizedTokenError } from '@/lib/mesh/client'

export async function GET() {
  const sessionId = await getSessionId()
  const connection = await getConnection(sessionId)

  if (!connection) {
    return NextResponse.json({ error: 'No Coinbase connection for this session' }, { status: 404 })
  }

  try {
    const portfolio = await readPortfolio(connection, sessionId)
    return NextResponse.json(portfolio)
  } catch (error) {
    if (isUnauthorizedTokenError(error)) {
      // Mesh no longer honors this token (rotated, expired, or revoked
      // outside this app). Clear it here instead of leaving the app stuck
      // showing "connected" forever while every portfolio read 400s.
      await deleteConnection(sessionId)
      return NextResponse.json({ error: 'Coinbase connection expired. Reconnect to continue.', reconnectRequired: true }, { status: 401 })
    }
    if (error instanceof MeshApiError) {
      return NextResponse.json({ error: error.displayMessage ?? error.message }, { status: error.status === 200 ? 400 : error.status })
    }
    throw error
  }
}
