import { describe, expect, it } from 'vitest'
import { nextOrderStatus } from './orders'

describe('nextOrderStatus', () => {
  it('advances through the normal happy path', () => {
    expect(nextOrderStatus('created', 'pending')).toBe('pending')
    expect(nextOrderStatus('pending', 'paid')).toBe('paid')
  })

  it('allows created to jump straight to paid, since sandbox often skips Pending', () => {
    expect(nextOrderStatus('created', 'paid')).toBe('paid')
  })

  it('allows pending to fail', () => {
    expect(nextOrderStatus('pending', 'failed')).toBe('failed')
  })

  it('never downgrades paid, even to pending from a late onTransferFinished', () => {
    expect(nextOrderStatus('paid', 'pending')).toBe('paid')
    expect(nextOrderStatus('paid', 'failed')).toBe('paid')
  })

  it('never downgrades failed', () => {
    expect(nextOrderStatus('failed', 'pending')).toBe('failed')
    expect(nextOrderStatus('failed', 'paid')).toBe('failed')
  })
})
