import { describe, expect, it } from 'vitest'
import { redact } from './log'

describe('redact', () => {
  it('replaces known secret keys regardless of case', () => {
    const input = { 'X-Client-Secret': 'shh', authToken: 'shh', ACCESSTOKEN: 'shh' }
    expect(redact(input)).toEqual({
      'X-Client-Secret': '[redacted]',
      authToken: '[redacted]',
      ACCESSTOKEN: '[redacted]',
    })
  })

  it('leaves ordinary fields untouched', () => {
    expect(redact({ symbol: 'USDC', amount: 50 })).toEqual({ symbol: 'USDC', amount: 50 })
  })

  it('recurses into nested objects and arrays', () => {
    const input = { toAddresses: [{ symbol: 'USDC', authToken: 'shh' }] }
    expect(redact(input)).toEqual({ toAddresses: [{ symbol: 'USDC', authToken: '[redacted]' }] })
  })

  it('passes through primitives and null unchanged', () => {
    expect(redact('hello')).toBe('hello')
    expect(redact(42)).toBe(42)
    expect(redact(null)).toBe(null)
  })

  it('does not mutate the input', () => {
    const input = { authToken: 'shh' }
    redact(input)
    expect(input.authToken).toBe('shh')
  })
})
