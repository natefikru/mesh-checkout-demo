import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'

/**
 * Reads the session id middleware guarantees exists on every request. Bare
 * UUID, no PII, which also satisfies Mesh's userId constraint; it doubles as
 * the Redis key prefix for this visitor's orders, connection, and console log.
 */
export async function getSessionId(): Promise<string> {
  const store = await cookies()
  const id = store.get(SESSION_COOKIE_NAME)?.value
  if (!id) throw new Error('Session cookie missing — is middleware.ts matching this route?')
  return id
}
