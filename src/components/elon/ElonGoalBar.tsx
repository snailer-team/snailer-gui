import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../../lib/store'

function StatusBadge({ status }: { status: 'idle' | 'running' | 'paused' | 'completed' | 'failed' }) {
  const styles: Record<typeof status, string> = {
    idle: 'bg-black/5 text-black/50 border-black/10',
    running: 'bg-blue-500/10 text-blue-700 border-blue-500/20 animate-pulse',
    paused: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-700 border-red-500/20',
  }

  const labels: Record<typeof status, string> = {
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
    completed: 'Done',
    failed: 'Failed',
  }

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export function ElonGoalBar() {
  const {
    elonFrame,
    setElonFrame,
    elonX,
    elonExecuteGoal,
    elonPauseExecution,
    elonResumeExecution,
    elonAbortExecution,
    currentRunStatus,
    projectPath,
    setProjectPath,
  } = useAppStore()

  const handlePickFolder = async () => {
    try {
      const folder = await invoke<string | null>('pick_folder')
      if (folder) {
        setProjectPath(folder)
      }
    } catch (err) {
      console.error('Failed to pick folder:', err)
    }
  }

  const planStatus = elonX.planTree?.status ?? 'idle'
  const isRunning = planStatus === 'running' || currentRunStatus === 'running'
  const isPaused = planStatus === 'paused'
  const canExecute = elonFrame.problem.trim() && !isRunning && !isPaused

  // Display shortened path
  const displayPath = projectPath
    ? projectPath.length > 40
      ? '...' + projectPath.slice(-37)
      : projectPath
    : 'No project selected'

  return (
    <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      {/* Project Path Row */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-black/5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Project</span>
        <button
          type="button"
          onClick={() => void handlePickFolder()}
          disabled={isRunning}
          className="flex-1 flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-1.5 text-left hover:bg-black/10 transition disabled:opacity-50"
        >
          <span className="text-[11px]">📁</span>
          <span className={`text-xs truncate ${projectPath ? 'text-black/70' : 'text-black/40 italic'}`}>
            {displayPath}
          </span>
        </button>
        {projectPath && (
          <span className="text-[9px] text-emerald-600 font-medium">✓ Set</span>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Problem Input */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Problem</span>
            <StatusBadge status={planStatus} />
          </div>
          <input
            value={elonFrame.problem}
            onChange={(e) => setElonFrame({ problem: e.target.value })}
            placeholder="What are we building?"
            disabled={isRunning}
            className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-medium text-black/80 placeholder:text-black/30 outline-none focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:opacity-60"
          />
        </div>

        {/* Constraints */}
        <div className="w-48">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45 mb-2">Constraints</div>
          <input
            value={elonFrame.constraints}
            onChange={(e) => setElonFrame({ constraints: e.target.value })}
            placeholder="Hard limits"
            disabled={isRunning}
            className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black/70 placeholder:text-black/30 outline-none focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:opacity-60"
          />
        </div>

        {/* Verification */}
        <div className="w-48">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45 mb-2">Verification</div>
          <input
            value={elonFrame.verification}
            onChange={(e) => setElonFrame({ verification: e.target.value })}
            placeholder="Proof of done"
            disabled={isRunning}
            className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black/70 placeholder:text-black/30 outline-none focus:border-black/20 focus:ring-2 focus:ring-black/5 disabled:opacity-60"
          />
        </div>

        {/* Controls */}
        <div className="flex items-end gap-2 pt-5">
          {!isRunning && !isPaused && (
            <button
              type="button"
              onClick={() => void elonExecuteGoal()}
              disabled={!canExecute}
              className="flex items-center gap-1.5 rounded-xl border border-black/10 bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-[15px]">▶</span>
              Execute
            </button>
          )}

          {isRunning && (
            <button
              type="button"
              onClick={elonPauseExecution}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-500/20"
            >
              <span className="text-[15px]">⏸</span>
              Pause
            </button>
          )}

          {isPaused && (
            <button
              type="button"
              onClick={elonResumeExecution}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-500/20"
            >
              <span className="text-[15px]">▶</span>
              Resume
            </button>
          )}

          {(isRunning || isPaused) && (
            <button
              type="button"
              onClick={elonAbortExecution}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-500/20"
              title="Abort execution"
            >
              <span className="text-[15px]">⏹</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
