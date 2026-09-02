'use client'

import { useEffect, useRef, useState } from 'react'

interface ConsoleEvent {
  id: string
  kind: 'mesh_request' | 'sdk_event' | 'webhook'
  timestamp: number
  label: string
  detail?: unknown
  durationMs?: number
  ok?: boolean
}

const POLL_MS = 1000

/** Streams every Mesh API call, SDK event, and webhook delivery for this session; the "how does this actually work" panel for the demo. */
export function ConsoleDrawer() {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<ConsoleEvent[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const cursorRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = () => {
      const url = cursorRef.current ? `/api/console?since=${cursorRef.current}` : '/api/console'
      fetch(url)
        .then((res) => res.json())
        .then((data: { events?: ConsoleEvent[] }) => {
          if (cancelled) return
          if (data.events && data.events.length > 0) {
            cursorRef.current = data.events[data.events.length - 1]!.id
            setEvents((prev) => [...prev, ...data.events!])
          }
          timer = setTimeout(poll, POLL_MS)
        })
        .catch(() => {
          if (!cancelled) timer = setTimeout(poll, POLL_MS)
        })
    }
    poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open])

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-800 bg-gray-950 text-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2 font-mono text-xs uppercase tracking-wide text-gray-400 hover:text-gray-200"
      >
        <span>Mesh activity{events.length > 0 && ` (${events.length})`}</span>
        <span>{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="max-h-64 overflow-y-auto border-t border-gray-800 font-mono text-xs">
          {events.length === 0 ? (
            <p className="px-4 py-3 text-gray-500">No activity yet.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="border-b border-gray-900">
                <button
                  type="button"
                  onClick={() => setExpandedId((id) => (id === event.id ? null : event.id))}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-900"
                >
                  <span className="w-24 shrink-0 text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${event.ok === false ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="w-24 shrink-0 uppercase text-gray-500">{event.kind.replace('_', ' ')}</span>
                  <span className="flex-1 truncate">{event.label}</span>
                  {event.durationMs !== undefined && <span className="shrink-0 text-gray-500">{event.durationMs}ms</span>}
                </button>
                {expandedId === event.id && event.detail !== undefined && (
                  <pre className="overflow-x-auto bg-black px-4 py-3 text-[11px] text-gray-300">
                    {JSON.stringify(event.detail, null, 2)}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
