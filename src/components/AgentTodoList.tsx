import { useState } from 'react'
import { useAppStore } from '../lib/store'
import type { OrchestratorTask, TeamRole } from '../lib/store'

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 14" />
    </svg>
  )
}

function IconDot({ className }: { className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${className}`} />
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-black/30" fill="none">
      <path
        d={open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const ROLE_LABELS: Partial<Record<TeamRole, string>> = {
  Oracle: 'Oracle',
  Explorer: 'Explorer',
  Librarian: 'Librarian',
  FrontendEngineer: 'Frontend',
  BackendEngineer: 'Backend',
  Debugger: 'Debugger',
  Tester: 'Tester',
}

interface TaskItemProps {
  task: OrchestratorTask
}

function TaskItem({ task }: TaskItemProps) {
  const { status, title, assignedTo, progress } = task

  const isRunning = status === 'running'
  const isDone = status === 'verified' || status === 'merged'
  const isFailed = status === 'failed' || status === 'cancelled'
  const needsReview = status === 'needs_review'

  return (
    <div
      className={[
        'flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors',
        isRunning ? 'bg-blue-50' : isDone ? 'bg-transparent' : 'bg-transparent',
      ].join(' ')}
    >
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        {isDone ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
            <IconCheck className="h-2.5 w-2.5 text-white" />
          </span>
        ) : isRunning ? (
          <IconSpinner className="h-4 w-4 animate-spin text-blue-500" />
        ) : isFailed ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500">
            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        ) : needsReview ? (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400">
            <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 text-white" fill="none">
              <path d="M8 4v5M8 11v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        ) : (
          <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-black/15">
          </span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={[
              'text-xs leading-relaxed',
              isDone ? 'text-black/40 line-through' : isFailed ? 'text-rose-600/70 line-through' : isRunning ? 'font-medium text-black/80' : 'text-black/65',
            ].join(' ')}
          >
            {title}
          </span>

          {/* Status badge */}
          {isRunning && (
            <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-blue-600">
              running
            </span>
          )}
          {needsReview && (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-amber-600">
              review
            </span>
          )}
          {isFailed && (
            <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-rose-600">
              failed
            </span>
          )}
        </div>

        {/* Progress bar (only when running) */}
        {isRunning && progress !== undefined && progress > 0 && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        )}

        {/* Assigned role */}
        {assignedTo && (
          <div className="mt-0.5 text-[10px] text-black/30">
            {ROLE_LABELS[assignedTo] ?? assignedTo}
          </div>
        )}
      </div>
    </div>
  )
}

export function AgentTodoList() {
  const tasks = useAppStore((s) => s.orchestrator.tasks)
  const currentRunStatus = useAppStore((s) => s.currentRunStatus)
  const [collapsed, setCollapsed] = useState(false)

  const isActive = currentRunStatus === 'running' || currentRunStatus === 'queued'
  const visibleTasks = tasks.filter((t) => t.title)

  if (visibleTasks.length === 0) return null

  const done = visibleTasks.filter((t) => t.status === 'verified' || t.status === 'merged').length
  const running = visibleTasks.filter((t) => t.status === 'running').length
  const total = visibleTasks.length

  // Sort: running first, then queued, then done/failed
  const sorted = [...visibleTasks].sort((a, b) => {
    const order = { running: 0, queued: 1, needs_review: 2, verified: 3, merged: 3, failed: 4, cancelled: 4 }
    return (order[a.status] ?? 5) - (order[b.status] ?? 5)
  })

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-[#f9fafb]">
      {/* Header */}
      <button
        className="flex w-full items-center justify-between px-3 py-2 hover:bg-black/[0.02] transition-colors"
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-black/40" fill="none">
            <rect x="2" y="3" width="10" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="2" y="7" width="10" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="2" y="11" width="7" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
          <span className="text-[11px] font-semibold text-black/50 uppercase tracking-wide">Tasks</span>
          <span className="text-[10px] text-black/30">
            {done}/{total}
          </span>
          {running > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-blue-500">
              <IconDot className="bg-blue-500 animate-pulse" />
              {running} running
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mini progress bar */}
          <div className="w-20 h-1.5 rounded-full bg-black/10 overflow-hidden">
            <div
              className={[
                'h-full rounded-full transition-all duration-500',
                isActive ? 'bg-blue-500' : done === total ? 'bg-emerald-500' : 'bg-black/20',
              ].join(' ')}
              style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : '0%' }}
            />
          </div>
          <IconChevron open={!collapsed} />
        </div>
      </button>

      {/* Task list */}
      {!collapsed && (
        <div className="border-t border-black/[0.05] px-1 py-1 space-y-0.5">
          {sorted.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
