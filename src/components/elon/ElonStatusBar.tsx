import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../../lib/store'

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

function formatCost(cost: number): string {
  if (cost < 0.01) return '<$0.01'
  return `$${cost.toFixed(2)}`
}

export function ElonStatusBar() {
  const { elonX, currentRunStatus } = useAppStore()
  const { metrics, planTree } = elonX
  const [nowMs, setNowMs] = useState(0)

  // Update every second for elapsed time
  useEffect(() => {
    setNowMs(Date.now())
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const cycleTime = useMemo(() => {
    if (!metrics.cycleStartMs) return 0
    if (!nowMs) return 0
    return nowMs - metrics.cycleStartMs
  }, [metrics.cycleStartMs, nowMs])

  const progress = useMemo(() => {
    if (metrics.totalTasks === 0) return 0
    return Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
  }, [metrics.completedTasks, metrics.totalTasks])

  const isActive = planTree?.status === 'running' || currentRunStatus === 'running'

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-6">
        {/* Cycle Time */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Cycle</span>
          <span className={`text-sm font-semibold tabular-nums ${isActive ? 'text-black/80' : 'text-black/50'}`}>
            {formatDuration(cycleTime)}
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-black/10" />

        {/* Autonomy Rate - xAI "No one tells me no" */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40" title="xAI: No one tells me no">
            ⚡ Autonomy
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              metrics.autonomyRate >= 90
                ? 'text-emerald-600'
                : metrics.autonomyRate >= 70
                  ? 'text-amber-600'
                  : 'text-red-600'
            }`}
          >
            {metrics.autonomyRate}%
          </span>
          {metrics.interventions > 0 && (
            <span className="text-[10px] text-red-500/70">({metrics.interventions} blocks)</span>
          )}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-black/10" />

        {/* Tasks Progress */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Tasks</span>
          <span className="text-sm font-semibold tabular-nums text-black/80">
            {metrics.completedTasks}/{metrics.totalTasks}
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-black/10" />

        {/* Iteration Speed - xAI Fast Iteration */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40" title="xAI: Daily/multiple iterations">
            🔄 Iter
          </span>
          <span className={`text-sm font-semibold tabular-nums ${
            metrics.completedTasks > 0 && cycleTime > 0
              ? (metrics.completedTasks / (cycleTime / 60000)) >= 1
                ? 'text-emerald-600'
                : 'text-amber-600'
              : 'text-black/50'
          }`}>
            {metrics.completedTasks > 0 && cycleTime > 60000
              ? `${(metrics.completedTasks / (cycleTime / 60000)).toFixed(1)}/m`
              : '-'
            }
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-black/10" />

        {/* Tokens */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Tokens</span>
          <span className="text-xs font-medium tabular-nums text-black/60">
            {metrics.totalInputTokens > 0 || metrics.totalOutputTokens > 0
              ? `${(metrics.totalInputTokens / 1000).toFixed(1)}k in / ${(metrics.totalOutputTokens / 1000).toFixed(1)}k out`
              : '-'
            }
          </span>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-black/10" />

        {/* Cost */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Cost</span>
          <span className="text-sm font-semibold tabular-nums text-black/80">
            {formatCost(metrics.estimatedCost)}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Progress Bar */}
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 rounded-full bg-black/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isActive ? 'bg-blue-500' : progress === 100 ? 'bg-emerald-500' : 'bg-black/20'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-semibold tabular-nums text-black/50 w-8">{progress}%</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5">
          {isActive ? (
            <>
              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-blue-600">Running</span>
            </>
          ) : planTree?.status === 'completed' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">Done</span>
            </>
          ) : planTree?.status === 'failed' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-red-600">Failed</span>
            </>
          ) : planTree?.status === 'paused' ? (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-600">Paused</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-black/20" />
              <span className="text-xs font-medium text-black/40">Idle</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
