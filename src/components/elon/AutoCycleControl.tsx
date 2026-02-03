import { useState, useEffect, useMemo } from 'react'
import { useAppStore, type AutoCycleInterval } from '../../lib/store'

const INTERVAL_OPTIONS: { value: AutoCycleInterval; label: string }[] = [
  { value: 300000, label: '5m' },
  { value: 900000, label: '15m' },
  { value: 1800000, label: '30m' },
  { value: 3600000, label: '60m' },
]

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

export function AutoCycleControl() {
  const {
    elonX,
    autoCycleToggle,
    autoCycleSetInterval,
    autoCycleRunNow,
    autoCycleKillSwitch,
    autoCycleTick,
    autoCycleExpireBroadcasts,
  } = useAppStore()

  const { autoCycle, cycleRuns } = elonX
  const [nowMs, setNowMs] = useState(() => Date.now())

  // Timer for countdown and cycle tick
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now())
      autoCycleTick()
      autoCycleExpireBroadcasts()
    }, 1000)
    return () => clearInterval(interval)
  }, [autoCycleTick, autoCycleExpireBroadcasts])

  const countdown = useMemo(() => {
    if (!autoCycle.nextRunAt) return null
    return Math.max(0, autoCycle.nextRunAt - nowMs)
  }, [autoCycle.nextRunAt, nowMs])

  const lastRun = cycleRuns[0]
  const isRunning = autoCycle.status === 'running'

  const statusStyles: Record<typeof autoCycle.status, { bg: string; text: string; dot: string }> = {
    idle: { bg: 'bg-black/5', text: 'text-black/50', dot: 'bg-black/20' },
    running: { bg: 'bg-blue-500/10', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse' },
    paused: { bg: 'bg-amber-500/10', text: 'text-amber-700', dot: 'bg-amber-500' },
    cooldown: { bg: 'bg-emerald-500/10', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  }

  const currentStyle = statusStyles[autoCycle.status]

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {/* Title & Status */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
            CEO Auto-Cycle
          </span>
          <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${currentStyle.bg}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${currentStyle.dot}`} />
            <span className={`text-[10px] font-semibold uppercase ${currentStyle.text}`}>
              {autoCycle.status}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-black/10" />

        {/* ON/OFF Toggle */}
        <button
          type="button"
          onClick={() => autoCycleToggle(!autoCycle.enabled)}
          disabled={isRunning}
          className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
            autoCycle.enabled ? 'bg-emerald-500' : 'bg-black/20'
          } ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
              autoCycle.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>

        {/* Interval Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
            Interval
          </span>
          <select
            value={autoCycle.intervalMs}
            onChange={(e) => autoCycleSetInterval(Number(e.target.value) as AutoCycleInterval)}
            disabled={isRunning}
            className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-xs font-medium text-black/70 outline-none focus:border-black/20 disabled:opacity-50"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-black/10" />

        {/* Countdown */}
        {autoCycle.enabled && countdown !== null && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
              Next
            </span>
            <span className="text-sm font-semibold tabular-nums text-black/70">
              {formatCountdown(countdown)}
            </span>
          </div>
        )}

        {/* Last Run */}
        {lastRun && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
              Last
            </span>
            <span
              className={`text-xs font-medium ${
                lastRun.status === 'completed'
                  ? 'text-emerald-600'
                  : lastRun.status === 'failed'
                    ? 'text-red-600'
                    : lastRun.status === 'running'
                      ? 'text-blue-600'
                      : 'text-black/50'
              }`}
            >
              {lastRun.status === 'completed'
                ? '✓ Done'
                : lastRun.status === 'failed'
                  ? '✗ Failed'
                  : lastRun.status === 'running'
                    ? '⏳ Running'
                    : 'Aborted'}
            </span>
          </div>
        )}

        {/* Drift Guard Warning */}
        {autoCycle.consecutiveFailures > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5">
            <span className="text-[10px] font-semibold text-amber-700">
              ⚠ {autoCycle.consecutiveFailures}/3 failures
            </span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Run Now Button */}
        <button
          type="button"
          onClick={() => void autoCycleRunNow()}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="text-[11px]">▶</span>
          Run Now
        </button>

        {/* Kill Switch */}
        <button
          type="button"
          onClick={autoCycleKillSwitch}
          className="flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-500/20"
          title="Kill Switch: Stop all cycles immediately"
        >
          <span className="text-[11px]">⏹</span>
          Kill
        </button>
      </div>
    </div>
  )
}
