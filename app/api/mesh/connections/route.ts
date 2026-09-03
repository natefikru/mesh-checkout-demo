import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { getConnection, saveConnection, deleteConnection } from '@/lib/store/connections'
import { appendConsoleEvent } from '@/lib/console/store'
import { callMesh, MeshApiError } from '@/lib/mesh/client'
import type { StoredConnection } from '@/lib/store/connections'

export async function GET() {
  const sessionId = await getSessionId()
  const connection = await getConnection(sessionId)
  return NextResponse.json({ connection })
}

interface ConnectRequestBody {
  brokerType: string
  brokerName: string
  tokenId: string
  accountId: string
  accountName: string
}

function isConnectRequestBody(value: unknown): value is ConnectRequestBody {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.brokerType === 'string' &&
    typeof v.brokerName === 'string' &&
    typeof v.tokenId === 'string' &&
    typeof v.accountId === 'string' &&
    typeof v.accountName === 'string'
  )
}

export async function POST(req: Request) {
  const sessionId = await getSessionId()
  const payload: unknown = await req.json()

  if (!isConnectRequestBody(payload)) {
    return NextResponse.json({ error: 'Missing required connection fields' }, { status: 400 })
  }

  const connection: StoredConnection = {
    brokerType: payload.brokerType,
    brokerName: payload.brokerName,
    tokenId: payload.tokenId,
    accountId: payload.accountId,
    accountName: payload.accountName,
    connectedAt: Date.now(),
  }

  await saveConnection(sessionId, connection)
  await appendConsoleEvent({
    sessionId,
    kind: 'sdk_event',
    label: `Connected ${connection.brokerName}`,
    detail: { brokerType: connection.brokerType, accountName: connection.accountName },
    ok: true,
  })

  return NextResponse.json({ connection })
}

export async function DELETE() {
  const sessionId = await getSessionId()
  const connection = await getConnection(sessionId)

  if (connection) {
    try {
      await callMesh('DELETE', '/api/v1/account', {
        sessionId,
        body: { authToken: connection.tokenId, type: connection.brokerType },
      })
    } catch (err) {
      // Revoking on Mesh's side is best-effort: a stale sandbox token or a
      // connection Mesh already dropped shouldn't block clearing our own
      // record, but a real failure is worth having in the console log.
      await appendConsoleEvent({
        sessionId,
        kind: 'mesh_request',
        label: 'DELETE /api/v1/account failed',
        detail: err instanceof MeshApiError ? { message: err.message, status: err.status } : { error: String(err) },
        ok: false,
      })
    }
  }

  await deleteConnection(sessionId)
  return NextResponse.json({ ok: true })
}
