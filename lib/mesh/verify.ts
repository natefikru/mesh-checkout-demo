import https from 'node:https'
import { meshConfig } from '@/lib/env'
import { appendConsoleEvent } from '@/lib/console/store'
import { redact } from '@/lib/console/log'
import { MeshApiError } from '@/lib/mesh/client'
import type { MeshEnvelope, TransferVerificationRequest, TransferVerifyResponseContent } from '@/lib/mesh/types'

/**
 * GET /api/v1/transfers/managed/verify takes a JSON request body. The Fetch
 * API refuses to send one on GET ("Request with GET/HEAD method cannot have
 * body"), which is what callMesh uses for everything else, so this one call
 * goes through Node's raw https client instead, which has no such
 * restriction. Mirrors callMesh's console logging so it shows up in the
 * same timeline.
 */
export function verifyTransfer(input: TransferVerificationRequest, sessionId?: string): Promise<TransferVerifyResponseContent> {
  const { clientId, apiKey, baseUrl } = meshConfig()
  const url = new URL(`${baseUrl}/api/v1/transfers/managed/verify`)
  const body = JSON.stringify(input)
  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-Client-Id': clientId,
          'X-Client-Secret': apiKey,
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: Buffer) => chunks.push(chunk))
        res.on('end', () => {
          void (async () => {
            const durationMs = Date.now() - startedAt
            try {
              const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8')) as MeshEnvelope<TransferVerifyResponseContent>
              const ok = (res.statusCode ?? 0) < 400 && envelope.status === 'ok'

              if (sessionId) {
                await appendConsoleEvent({
                  sessionId,
                  kind: 'mesh_request',
                  label: 'GET /api/v1/transfers/managed/verify',
                  detail: { request: redact(input), response: redact(envelope), httpStatus: res.statusCode },
                  durationMs,
                  ok,
                })
              }

              if (!ok) {
                reject(new MeshApiError(res.statusCode ?? 500, envelope))
                return
              }
              resolve(envelope.content as TransferVerifyResponseContent)
            } catch (err) {
              reject(err instanceof Error ? err : new Error(String(err)))
            }
          })()
        })
      },
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}
