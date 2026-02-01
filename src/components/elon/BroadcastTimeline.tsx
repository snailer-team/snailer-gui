import { useState, useEffect, useMemo } from 'react'
import { useAppStore, type Broadcast } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function formatCountdown(expiresAt: number): string {
  const remaining = expiresAt - Date.now()
  if (remaining <= 0) return 'expired'
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function BroadcastCard({ broadcast }: { broadcast: Broadcast }) {
  const { elonSelectEvidence } = useAppStore()
  const [, setNow] = useState(Date.now())

  // Update countdown every second
  useEffect(() => {
    if (broadcast.status !== 'active') return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [broadcast.status])

  const statusStyles: Record<Broadcast['status'], { bg: string; border: string; badge: string }> = {
    active: {
      bg: 'bg-white/90',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-700',
    },
    expired: {
      bg: 'bg-black/[0.02]',
      border: 'border-black/10',
      badge: 'bg-black/5 text-black/40',
    },
    superseded: {
      bg: 'bg-black/[0.02]',
      border: 'border-black/10',
      badge: 'bg-amber-500/10 text-amber-700',
    },
  }

  const style = statusStyles[broadcast.status]

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-3 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {/* Agent badges */}
          <div className="flex items-center gap-1">
            {broadcast.toAgentIds.map((agentId) => (
              <span
                key={agentId}
                className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/60"
              >
                {agentId}
              </span>
            ))}
          </div>
          {/* Status badge */}
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${style.badge}`}>
            {broadcast.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-black/40">
          {broadcast.status === 'active' && (
            <span className="font-medium text-emerald-600">
              ⏱ {formatCountdown(broadcast.expiresAt)}
            </span>
          )}
          <span>{formatTimeAgo(broadcast.createdAt)}</span>
        </div>
      </div>

      {/* Message */}
      <p className={`text-sm leading-relaxed ${broadcast.status === 'active' ? 'text-black/80' : 'text-black/50'}`}>
        {broadcast.message}
      </p>

      {/* Why (Rationale) */}
      <div className="mt-2 flex items-start gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Why:</span>
        <span className="text-xs text-black/60">{broadcast.why}</span>
      </div>

      {/* Evidence Links */}
      {broadcast.evidenceLinks.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Evidence:</span>
          <div className="flex items-center gap-1">
            {broadcast.evidenceLinks.map((id) => (
              <button
                key={id}
                onClick={() => elonSelectEvidence(id)}
                className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 hover:bg-blue-500/20 transition"
              >
                {id.slice(0, 8)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function BroadcastTimeline() {
  const { elonX } = useAppStore()
  const { broadcasts } = elonX

  const activeBroadcasts = useMemo(
    () => broadcasts.filter((b) => b.status === 'active'),
    [broadcasts]
  )

  const recentBroadcasts = useMemo(
    () => broadcasts.filter((b) => b.status !== 'active').slice(0, 20),
    [broadcasts]
  )

  if (broadcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-4xl mb-3 opacity-30">📢</div>
        <div className="text-sm font-medium text-black/40">No broadcasts yet</div>
        <div className="text-xs text-black/30 mt-1">
          Enable Auto-Cycle to start receiving CEO directives
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <ScrollAreaViewport className="h-full">
        <div className="p-4 space-y-4">
          {/* Active Broadcasts */}
          {activeBroadcasts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Active Directives
                </span>
                <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {activeBroadcasts.length}
                </span>
              </div>
              <div className="space-y-2">
                {activeBroadcasts.map((b) => (
                  <BroadcastCard key={b.id} broadcast={b} />
                ))}
              </div>
            </div>
          )}

          {/* Past Broadcasts */}
          {recentBroadcasts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Recent History
                </span>
              </div>
              <div className="space-y-2">
                {recentBroadcasts.map((b) => (
                  <BroadcastCard key={b.id} broadcast={b} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollAreaViewport>
      <ScrollBar />
    </ScrollArea>
  )
}
