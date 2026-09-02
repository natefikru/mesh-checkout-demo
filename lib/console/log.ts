export type ConsoleEventKind = 'mesh_request' | 'sdk_event' | 'webhook'

export interface ConsoleEvent {
  id: string
  sessionId: string
  kind: ConsoleEventKind
  timestamp: number
  label: string
  detail?: unknown
  durationMs?: number
  ok?: boolean
}

const SECRET_KEYS = new Set([
  'x-client-secret',
  'authtoken',
  'fromauthtoken',
  'accesstoken',
  'refreshtoken',
  'tokenid',
  'mfacode',
])

/**
 * Deep-clones `value`, replacing any key that matches a known secret field
 * name (case-insensitive) with a fixed placeholder. Used before anything is
 * written to the console log, since that log is rendered straight to the
 * browser during the demo.
 */
export function redact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as unknown as T
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(val)
    }
    return out as T
  }
  return value
}
