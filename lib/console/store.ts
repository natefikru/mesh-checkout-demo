import { randomUUID } from 'node:crypto'
import { redis } from '@/lib/store/redis'
import { redact } from '@/lib/console/log'
import type { ConsoleEvent, ConsoleEventKind } from '@/lib/console/log'

const MAX_EVENTS_PER_SESSION = 200
const TTL_SECONDS = 60 * 60 * 6 // demo sessions are short-lived; don't accumulate forever

function key(sessionId: string): string {
  return `console:${sessionId}`
}

export interface AppendEventInput {
  sessionId: string
  kind: ConsoleEventKind
  label: string
  detail?: unknown
  durationMs?: number
  ok?: boolean
}

export async function appendConsoleEvent(input: AppendEventInput): Promise<ConsoleEvent> {
  const event: ConsoleEvent = {
    id: randomUUID(),
    sessionId: input.sessionId,
    kind: input.kind,
    timestamp: Date.now(),
    label: input.label,
    detail: input.detail !== undefined ? redact(input.detail) : undefined,
    durationMs: input.durationMs,
    ok: input.ok,
  }

  const k = key(input.sessionId)
  const client = redis()
  await client.rpush(k, JSON.stringify(event))
  await client.ltrim(k, -MAX_EVENTS_PER_SESSION, -1)
  await client.expire(k, TTL_SECONDS)

  return event
}

export async function listConsoleEvents(sessionId: string, sinceId?: string): Promise<ConsoleEvent[]> {
  const raw = await redis().lrange<string>(key(sessionId), 0, -1)
  const events = raw.map((entry) => (typeof entry === 'string' ? (JSON.parse(entry) as ConsoleEvent) : (entry as ConsoleEvent)))
  if (!sinceId) return events

  const cursor = events.findIndex((e) => e.id === sinceId)
  return cursor === -1 ? events : events.slice(cursor + 1)
}
