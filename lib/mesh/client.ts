import { meshConfig } from '@/lib/env'
import { appendConsoleEvent } from '@/lib/console/store'
import { redact } from '@/lib/console/log'
import type { MeshEnvelope } from '@/lib/mesh/types'

export class MeshApiError extends Error {
  readonly status: number
  readonly displayMessage: string | null
  readonly errorType: string | null

  constructor(status: number, envelope: MeshEnvelope<unknown>) {
    super(envelope.displayMessage ?? envelope.message ?? `Mesh API request failed with status ${status}`)
    this.name = 'MeshApiError'
    this.status = status
    this.displayMessage = envelope.displayMessage
    this.errorType = envelope.errorType
  }
}

/**
 * A stored tokenId Mesh no longer honors: rotated, expired, or revoked on
 * Mesh's side without this app knowing. Distinct from every other
 * MeshApiError because the fix isn't "retry" or "show the error", it's
 * "this connection is dead, clear it and ask the user to reconnect."
 */
export function isUnauthorizedTokenError(error: unknown): error is MeshApiError {
  return error instanceof MeshApiError && error.errorType === 'unauthorizedToken'
}

interface CallMeshOptions {
  /** Groups this call in the console panel; typically the session's userId. */
  sessionId?: string
  body?: unknown
}

/**
 * Single choke point for every outbound Mesh call. Attaches client
 * credentials, unwraps the envelope, and appends a redacted record of the
 * request/response pair to the console log so the integration panel can
 * render it without every call site remembering to log itself.
 */
export async function callMesh<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  options: CallMeshOptions = {},
): Promise<T> {
  const { clientId, apiKey, baseUrl } = meshConfig()
  const url = `${baseUrl}${path}`
  const startedAt = Date.now()

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': clientId,
      'X-Client-Secret': apiKey,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  const durationMs = Date.now() - startedAt
  const envelope = (await res.json()) as MeshEnvelope<T>
  const ok = res.ok && envelope.status === 'ok'

  if (options.sessionId) {
    await appendConsoleEvent({
      sessionId: options.sessionId,
      kind: 'mesh_request',
      label: `${method} ${path}`,
      detail: {
        request: options.body !== undefined ? redact(options.body) : undefined,
        response: redact(envelope),
        httpStatus: res.status,
      },
      durationMs,
      ok,
    })
  }

  if (!ok) throw new MeshApiError(res.status, envelope)
  return envelope.content as T
}
