import { useMemo } from 'react'
import { useAppStore } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function formatAgo(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return `${diffSec}s`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}h`
  const day = Math.floor(hour / 24)
  return `${day}d`
}

export function ElonNormPanel() {
  const metrics = useAppStore((s) => s.elonX.metrics)
  const cycleRuns = useAppStore((s) => s.elonX.cycleRuns)
  const selectedCycleRunId = useAppStore((s) => s.elonX.selectedCycleRunId)
  const elonSelectCycleRun = useAppStore((s) => s.elonSelectCycleRun)

  const recentRuns = useMemo(() => cycleRuns.slice(0, 12), [cycleRuns])
  const latestRun = recentRuns[0] ?? null

  const normHealthText = useMemo(() => {
    if (metrics.lastCycleNormDecisionCount === 0) return 'No norm checks yet'
    if (metrics.lastCycleViolationCount === 0) return 'All norm checks passed'
    return `${metrics.lastCycleViolationCount} checks required revision/deny`
  }, [metrics.lastCycleNormDecisionCount, metrics.lastCycleViolationCount])

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 border-b border-black/5 px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-black/50">Norms</div>
        <div className="mt-0.5 text-[11px] text-black/45">Cycle compliance and autonomy signal</div>
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-2 p-2">
        <div className="rounded-lg border border-black/10 bg-white/80 p-2">
          <div className="text-[10px] uppercase tracking-wide text-black/45">Autonomy</div>
          <div className="mt-1 text-lg font-semibold text-black/80">
            {metrics.loaLevel} · {Math.round(metrics.autonomyRate)}%
          </div>
          <div className="mt-0.5 text-[10px] text-black/50">
            Interventions {metrics.interventions}
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-white/80 p-2">
          <div className="text-[10px] uppercase tracking-wide text-black/45">Last Cycle</div>
          <div className="mt-1 text-lg font-semibold text-black/80">
            {metrics.lastCycleNormDecisionCount} checks
          </div>
          <div
            className={[
              'mt-0.5 text-[10px]',
              metrics.lastCycleViolationCount > 0 ? 'text-amber-700' : 'text-emerald-700',
            ].join(' ')}
          >
            {normHealthText}
          </div>
        </div>
        <div className="col-span-2 rounded-lg border border-black/10 bg-white/80 p-2">
          <div className="text-[10px] uppercase tracking-wide text-black/45">Factory</div>
          <div className="mt-1 text-sm font-semibold text-black/75">
            C{metrics.lastFactoryComplexityScore} · {metrics.lastFactoryHeadcount} agents
          </div>
          <div className="mt-0.5 line-clamp-2 text-[10px] text-black/50">{metrics.lastFactoryReason || '—'}</div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          {recentRuns.length === 0 ? (
            <div className="p-4 text-xs text-black/45">No cycle history yet.</div>
          ) : (
            <div className="space-y-1.5 p-2">
              {recentRuns.map((run) => {
                const isSelected = selectedCycleRunId === run.id
                const statusTone =
                  run.status === 'completed'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : run.status === 'failed'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : run.status === 'aborted'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => elonSelectCycleRun(isSelected ? null : run.id)}
                    className={[
                      'w-full rounded-lg border p-2 text-left transition',
                      isSelected
                        ? 'border-black/20 bg-white shadow-sm'
                        : 'border-black/10 bg-white/70 hover:bg-white',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-semibold text-black/75">
                        cycle {run.id.slice(0, 8)}
                      </div>
                      <div className={`rounded-full border px-1.5 py-0.5 text-[10px] ${statusTone}`}>
                        {run.status}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-black/45">
                      {formatAgo(run.startedAt)} ago
                      {latestRun?.id === run.id ? ' · latest' : ''}
                    </div>
                    {run.errorMessage ? (
                      <div className="mt-1 line-clamp-2 text-[10px] text-red-600">{run.errorMessage}</div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          )}
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  )
}

