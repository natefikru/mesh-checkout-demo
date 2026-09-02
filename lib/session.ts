import { randomUUID } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'mesh_session'

/**
 * Bare UUID, no PII, matching the Mesh userId constraint. Doubles as the
 * Redis key prefix for this visitor's orders, connection, and console log.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const store = await cookies()
  const existing = store.get(COOKIE_NAME)?.value
  if (existing) return existing

  const id = randomUUID()
  store.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return id
}
