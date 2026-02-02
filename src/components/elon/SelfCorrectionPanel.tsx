import { useMemo } from 'react'
import { useAppStore } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

export function SelfCorrectionPanel() {
  const traces = useAppStore((s) => s.elonX.reasoningTraces)

  // Group by agent
  const agentStats = useMemo(() => {
    const map = new Map<string, { total: number; successes: number; corrected: number; totalAttempts: number; traces: typeof traces }>()
    for (const t of traces) {
      if (!map.has(t.agentId)) {
        map.set(t.agentId, { total: 0, successes: 0, corrected: 0, totalAttempts: 0, traces: [] })
      }
      const stat = map.get(t.agentId)!
      stat.total++
      stat.totalAttempts += t.attempt
      if (t.verdict === 'success') stat.successes++
      if (t.verdict === 'corrected') stat.corrected++
      stat.traces.push(t)
    }
    return map
  }, [traces])

  if (traces.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl mb-3 opacity-30">🔄</div>
        <div className="text-sm font-medium text-black/50">No correction traces yet</div>
        <div className="text-xs text-black/35 mt-1">Traces will appear when agents retry failed tasks</div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <ScrollAreaViewport className="h-full">
        <div className="p-2 space-y-2">
          {[...agentStats.entries()].map(([agentId, stat]) => {
            const successRate = stat.total > 0 ? Math.round(((stat.successes + stat.corrected) / stat.total) * 100) : 0
            const avgAttempts = stat.total > 0 ? (stat.totalAttempts / stat.total).toFixed(1) : '0'

            return (
              <div key={agentId} className="rounded-xl border border-black/10 bg-white/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-black/70">{agentId.toUpperCase()}</span>
                  <div className="flex items-center gap-2 text-[10px] text-black/50">
                    <span>Success: {successRate}%</span>
                    <span>Avg attempts: {avgAttempts}</span>
                  </div>
                </div>
                <div className="space-y-1 overflow-hidden">
                  {stat.traces.slice(0, 10).map((t) => (
                    <div
                      key={t.id}
                      className={`flex items-center gap-2 text-[10px] rounded-lg px-2 py-1 min-w-0 overflow-hidden ${
                        t.verdict === 'success'
                          ? 'bg-emerald-50 text-emerald-700'
                          : t.verdict === 'corrected'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <span className="shrink-0">
                        {t.verdict === 'success' ? '✓' : t.verdict === 'corrected' ? '✓' : '✗'}
                      </span>
                      <span className="shrink-0">Attempt {t.attempt}</span>
                      <span className="shrink-0 text-black/40">{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {t.errorMessage && (
                        <span className="truncate min-w-0 opacity-70">[{t.errorMessage.slice(0, 40)}]</span>
                      )}
                      {t.verdict === 'corrected' && (
                        <span className="shrink-0 text-amber-600">[corrected]</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollAreaViewport>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
