/**
 * Isolated from lib/session.ts (which imports next/headers) so middleware.ts,
 * which runs on the Edge runtime, can share the cookie name without pulling
 * in Node-only code.
 */
export const SESSION_COOKIE_NAME = 'mesh_session'
