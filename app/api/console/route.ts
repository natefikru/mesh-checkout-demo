import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { appendConsoleEvent, listConsoleEvents } from '@/lib/console/store'
import type { ConsoleEventKind } from '@/lib/console/log'

export async function GET(req: Request) {
  const sessionId = await getSessionId()
  const since = new URL(req.url).searchParams.get('since') ?? undefined
  const events = await listConsoleEvents(sessionId, since)
  return NextResponse.json({ events })
}

interface ClientEventBody {
  kind: ConsoleEventKind
  label: string
  detail?: unknown
  ok?: boolean
}

function isClientEventBody(value: unknown): value is ClientEventBody {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.kind === 'string' && typeof v.label === 'string'
}

/** Lets the browser's SDK callbacks (onEvent, onExit, onTransferFinished) land in the same timeline as server-side Mesh calls. */
export async function POST(req: Request) {
  const sessionId = await getSessionId()
  const payload: unknown = await req.json()

  if (!isClientEventBody(payload)) {
    return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 })
  }

  const event = await appendConsoleEvent({
    sessionId,
    kind: payload.kind,
    label: payload.label,
    detail: payload.detail,
    ok: payload.ok,
  })

  return NextResponse.json({ event })
}
