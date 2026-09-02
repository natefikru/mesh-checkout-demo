import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyWebhookSignature } from './webhook'

const SECRET = 'test-secret'

function sign(body: Buffer, secret = SECRET): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64')
}

describe('verifyWebhookSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = Buffer.from(JSON.stringify({ EventId: 'evt_1', TransferStatus: 'Succeeded' }))
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true)
  })

  it('rejects a tampered body', () => {
    const body = Buffer.from(JSON.stringify({ EventId: 'evt_1', TransferStatus: 'Succeeded' }))
    const signature = sign(body)
    const tampered = Buffer.from(JSON.stringify({ EventId: 'evt_1', TransferStatus: 'Failed' }))
    expect(verifyWebhookSignature(tampered, signature, SECRET)).toBe(false)
  })

  it('rejects a signature made with the wrong secret', () => {
    const body = Buffer.from(JSON.stringify({ EventId: 'evt_1' }))
    expect(verifyWebhookSignature(body, sign(body, 'wrong-secret'), SECRET)).toBe(false)
  })

  it('rejects a missing signature header without throwing', () => {
    const body = Buffer.from('{}')
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false)
  })

  it('rejects a signature of the wrong length without throwing', () => {
    const body = Buffer.from('{}')
    expect(verifyWebhookSignature(body, 'short', SECRET)).toBe(false)
  })

  it('rejects a hex digest, since Mesh signs with base64 not hex', () => {
    const body = Buffer.from(JSON.stringify({ EventId: 'evt_1' }))
    const hexSignature = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
    expect(verifyWebhookSignature(body, hexSignature, SECRET)).toBe(false)
  })
})
