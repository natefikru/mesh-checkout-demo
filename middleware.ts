import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie'

/**
 * Guarantees the session cookie exists before any Server Component or Route
 * Handler runs, including on the very first request. Server Components
 * cannot set cookies themselves (Next.js throws), so this is the only place
 * that can create one ahead of a page render rather than a route handler.
 *
 * Rewrites the incoming request's cookie header, not just the response, so
 * this same request's Server Components see the cookie immediately instead
 * of one request later.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE_NAME)) {
    return NextResponse.next()
  }

  // Edge runtime has no node:crypto; crypto.randomUUID() is the Web Crypto
  // global available in both Edge and Node.
  const sessionId = crypto.randomUUID()
  request.cookies.set(SESSION_COOKIE_NAME, sessionId)

  const response = NextResponse.next({ request })
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
