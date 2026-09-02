import { Redis } from '@upstash/redis'
import { requireEnv } from '@/lib/env'

let client: Redis | undefined

/**
 * Lazy singleton so a missing env var surfaces as a request error, not a build
 * failure. Var names are Vercel's marketplace convention for the Upstash
 * integration (KV_REST_API_*), not Upstash's own (UPSTASH_REDIS_REST_*).
 */
export function redis(): Redis {
  if (!client) {
    client = new Redis({
      url: requireEnv('KV_REST_API_URL'),
      token: requireEnv('KV_REST_API_TOKEN'),
    })
  }
  return client
}
