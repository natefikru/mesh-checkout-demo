import { redis } from '@/lib/store/redis'

export type OrderStatus = 'created' | 'pending' | 'paid' | 'failed'

export interface OrderItem {
  productId: string
  productName: string
  price: number
}

export interface Order {
  id: string
  sessionId: string
  items: OrderItem[]
  amountUsd: number
  status: OrderStatus
  txHash: string | null
  createdAt: number
  updatedAt: number
}

const TERMINAL_STATUSES: readonly OrderStatus[] = ['paid', 'failed']

/**
 * Terminal states are absorbing. A webhook can land before onTransferFinished
 * (sandbox often skips the Pending step entirely), and onTransferFinished
 * fires on provider acknowledgement, not chain confirmation, so it must
 * never be allowed to downgrade a webhook-confirmed paid/failed order.
 */
export function nextOrderStatus(current: OrderStatus, incoming: Exclude<OrderStatus, 'created'>): OrderStatus {
  if (TERMINAL_STATUSES.includes(current)) return current
  return incoming
}

function key(orderId: string): string {
  return `order:${orderId}`
}

export async function createOrder(order: Order): Promise<void> {
  await redis().set(key(order.id), order)
}

export async function getOrder(orderId: string): Promise<Order | null> {
  return redis().get<Order>(key(orderId))
}

export async function updateOrderStatus(
  orderId: string,
  incoming: Exclude<OrderStatus, 'created'>,
  patch: Partial<Pick<Order, 'txHash'>> = {},
): Promise<Order | null> {
  const order = await getOrder(orderId)
  if (!order) return null

  // A terminal order is fully frozen, not just its status field. Applying
  // patch fields (like txHash) even when the status is absorbed would let a
  // later, weaker signal corrupt data recorded by the stronger one that
  // already settled it.
  if (TERMINAL_STATUSES.includes(order.status)) return order

  const status = nextOrderStatus(order.status, incoming)
  const updated: Order = { ...order, ...patch, status, updatedAt: Date.now() }
  await redis().set(key(orderId), updated)
  return updated
}
