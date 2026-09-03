import { NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { getTransferQuote } from '@/lib/mesh/quote'
import { MeshApiError } from '@/lib/mesh/client'

interface QuoteRequestBody {
  amountInFiat: number
}

function isQuoteRequestBody(value: unknown): value is QuoteRequestBody {
  if (typeof value !== 'object' || value === null) return false
  const amountInFiat = (value as Record<string, unknown>).amountInFiat
  return typeof amountInFiat === 'number' && amountInFiat > 0
}

export async function POST(req: Request) {
  const sessionId = await getSessionId()
  const payload: unknown = await req.json()

  if (!isQuoteRequestBody(payload)) {
    return NextResponse.json({ error: 'Missing amountInFiat' }, { status: 400 })
  }

  try {
    const quote = await getTransferQuote(payload.amountInFiat, sessionId)
    return NextResponse.json({ quote })
  } catch (error) {
    if (error instanceof MeshApiError) {
      return NextResponse.json({ error: error.displayMessage ?? error.message }, { status: error.status === 200 ? 400 : error.status })
    }
    throw error
  }
}
