import crypto from 'node:crypto'

export type TransferStatus = 'Pending' | 'Succeeded' | 'Failed' | 'RefundPending' | 'RefundSucceeded'

/** PascalCase, unlike every other Mesh surface — this is the live payload shape. */
export interface MeshTransferWebhook {
  Id: string
  EventId: string
  SentTimestamp: number
  TransferId: string
  Timestamp: number
  TransferStatus: TransferStatus
  TransactionId?: string
  UserId: string
  TxHash?: string
  Token: string
  Chain: string
}

/**
 * HMAC-SHA256 over the raw request body bytes, base64 encoded. Mesh's own
 * common-errors doc shows a hex digest, which is wrong; base64 is what the
 * webhooks doc and every working example actually use. Verifying against a
 * re-serialized JSON.stringify would also fail here, since key order and
 * number formatting aren't guaranteed to round-trip — the signature is only
 * ever valid over the exact bytes Mesh sent.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false

  const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('base64')

  const a = Buffer.from(signatureHeader)
  const b = Buffer.from(computed)
  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}
