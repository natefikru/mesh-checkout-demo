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

/**
 * Read-modify-write on a single key, run as a Lua script so the whole
 * operation is atomic on the Redis server. Plain read-then-write here would
 * race: the webhook and onTransferFinished can both arrive close together,
 * and two concurrent requests reading the same pre-update order would both
 * decide independently whether the transition is allowed, with the second
 * write silently clobbering the first regardless of which one actually saw
 * the freshest state.
 */
const UPDATE_SCRIPT = `
  local raw = redis.call('GET', KEYS[1])
  if not raw then return nil end

  local order = cjson.decode(raw)

  if order.status == ARGV[3] or order.status == ARGV[4] then
    return raw
  end

  order.status = ARGV[1]
  order.updatedAt = tonumber(ARGV[2])
  if ARGV[5] == '1' then
    if ARGV[6] == '' then
      order.txHash = cjson.null
    else
      order.txHash = ARGV[6]
    end
  end

  local encoded = cjson.encode(order)
  redis.call('SET', KEYS[1], encoded)
  return encoded
`

export async function updateOrderStatus(
  orderId: string,
  incoming: Exclude<OrderStatus, 'created'>,
  patch: Partial<Pick<Order, 'txHash'>> = {},
): Promise<Order | null> {
  const [paid, failed] = TERMINAL_STATUSES
  const hasTxHash = 'txHash' in patch
  // The SDK auto-deserializes a JSON-looking eval result the same way it
  // does for get/set, so the script's encoded string arrives here already
  // parsed into an object, not as a string to parse ourselves.
  const result = await redis().eval<[string, string, string, string, string, string], Order | null>(UPDATE_SCRIPT, [key(orderId)], [
    incoming,
    String(Date.now()),
    paid!,
    failed!,
    hasTxHash ? '1' : '0',
    patch.txHash ?? '',
  ])
  return result
}
