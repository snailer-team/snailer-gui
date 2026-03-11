import { useMemo } from 'react'

import { useAppStore } from '../lib/store'
import type { OrchestratorTask, TeamRole } from '../lib/store'

const ROLE_LABELS: Partial<Record<TeamRole, string>> = {
  Oracle: 'Oracle',
  Explorer: 'Explorer',
  Librarian: 'Librarian',
  FrontendEngineer: 'Frontend',
  BackendEngineer: 'Backend',
  Debugger: 'Debugger',
  Tester: 'Tester',
}

function statusWidth(task: OrchestratorTask) {
  if (typeof task.progress === 'number' && Number.isFinite(task.progress)) {
    return Math.max(6, Math.min(100, task.progress))
  }
  if (task.status === 'verified' || task.status === 'merged') return 100
  if (task.status === 'needs_review') return 88
  if (task.status === 'running') return 72
  if (task.status === 'queued') return 10
  if (task.status === 'failed' || task.status === 'cancelled') return 100
  return 0
}

function statusTone(task: OrchestratorTask) {
  if (task.status === 'verified' || task.status === 'merged') {
    return {
      line: 'bg-emerald-400',
      text: 'text-emerald-300',
      marker: '✓',
    }
  }
  if (task.status === 'needs_review') {
    return {
      line: 'bg-amber-400',
      text: 'text-amber-300',
      marker: '…',
    }
  }
  if (task.status === 'running') {
    return {
      line: 'bg-amber-400',
      text: 'text-amber-300',
      marker: '…',
    }
  }
  if (task.status === 'failed' || task.status === 'cancelled') {
    return {
      line: 'bg-rose-400',
      text: 'text-rose-300',
      marker: '×',
    }
  }
  return {
    line: 'bg-white/18',
    text: 'text-white/30',
    marker: '—',
  }
}

type UpdatedPlanLine = {
  raw: string
  isDone: boolean
  isActive: boolean
}

type UpdatedPlanParseResult = {
  tasks: UpdatedPlanLine[]
  notes: string[]
}

function parseUpdatedPlan(planText: string, allowActive: boolean): UpdatedPlanParseResult {
  const source = String(planText ?? '').trim()
  if (!source) return { tasks: [], notes: [] }
  const lines = source
    .split(/\r?\n/g)
    .map((line) => line.trimEnd())
    .filter(Boolean)

  const hasPlanMarker = (line: string) => {
    const trimmed = line.trimStart()
    return trimmed.includes('✔') || trimmed.includes('▢') || trimmed.includes('○')
  }

  const body = lines.filter((line) => !line.trimStart().startsWith('• Updated Plan'))
  let activeAssigned = false

  const tasks: UpdatedPlanLine[] = []
  const notes: string[] = []

  for (const line of body) {
    const trimmed = line.trimStart()
    if (!hasPlanMarker(trimmed)) {
      notes.push(trimmed)
      continue
    }
    const isDone = trimmed.includes('✔')
    const isPending = trimmed.includes('○') || trimmed.includes('▢')
    const isActive = allowActive && !isDone && isPending && !activeAssigned
    if (isActive) activeAssigned = true
    tasks.push({
      raw: trimmed,
      isDone,
      isActive,
    })
  }

  return { tasks, notes }
}

function UpdatedPlanCard({
  planText,
  runCompleted,
}: {
  planText: string
  runCompleted: boolean
}) {
  const parsed = useMemo(() => parseUpdatedPlan(planText, !runCompleted), [planText, runCompleted])
  const pendingCount = useMemo(() => parsed.tasks.filter((line) => !line.isDone).length, [parsed.tasks])

  if (parsed.tasks.length === 0 && parsed.notes.length === 0) return null

  return (
    <div className="overflow-hidden rounded-[20px] border border-[color:var(--color-border)] bg-white text-slate-800 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <div className="text-[12px] font-medium text-slate-500">
          {runCompleted ? '마지막 계획 스냅샷' : '업데이트된 계획'} {parsed.tasks.length}개
          {runCompleted && pendingCount > 0 ? (
            <span className="ml-2 text-slate-400">· 미완료 {pendingCount}개</span>
          ) : null}
        </div>
        <div className="text-[12px] font-medium text-slate-400">{runCompleted ? 'Plan Snapshot' : 'Updated Plan'}</div>
      </div>

      <div className="divide-y divide-slate-200/80">
        {parsed.tasks.map((line, index) => (
          <div
            key={`${line.raw}-${index}`}
            className={[
              'flex items-start gap-3 px-4 py-3 transition-colors duration-200',
              line.isActive ? 'bg-slate-50' : '',
            ].join(' ')}
          >
            <div className="flex items-center gap-3 pt-0.5">
              <span
                className={[
                  'h-4 w-4 shrink-0 rounded-full border',
                  line.isActive
                    ? 'border-slate-400 bg-slate-400'
                    : line.isDone
                    ? 'border-emerald-500 bg-emerald-500'
                    : 'border-slate-300 bg-white',
                ].join(' ')}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className={[
                  'font-mono text-[12px] leading-6',
                  line.isDone ? 'text-slate-500' : line.isActive ? 'text-slate-800' : 'text-slate-600',
                ].join(' ')}
              >
                <span className="whitespace-pre-wrap break-words">{line.raw}</span>
              </div>
            </div>
            {line.isActive ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                현재
              </span>
            ) : runCompleted && !line.isDone ? (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-400">
                미완료
              </span>
            ) : null}
          </div>
        ))}

        {parsed.notes.length > 0 ? (
          <div className="space-y-2 bg-slate-50/70 px-4 py-3">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Summary</div>
            <div className="space-y-1.5">
              {parsed.notes.map((note, index) => (
                <div key={`${note}-${index}`} className="text-[13px] leading-6 text-slate-500">
                  {note}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AgentTodoList({ runId }: { runId?: string }) {
  const currentRunId = useAppStore((state) => state.currentRunId)
  const resolvedRunId = runId ?? currentRunId ?? ''
  const planText = useAppStore((state) => (resolvedRunId ? state.runPlansById[resolvedRunId] ?? '' : ''))
  const tasks = useAppStore((state) => state.orchestrator.tasks)
  const maxParallel = useAppStore((state) => state.orchestrator.maxParallel)
  const currentRunStatus = useAppStore((state) => state.currentRunStatus)
  const modifiedCount = useAppStore((state) => Object.keys(state.modifiedFilesByPath).length)

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.title?.trim()),
    [tasks],
  )

  const sortedTasks = useMemo(() => {
    const order: Record<OrchestratorTask['status'], number> = {
      running: 0,
      needs_review: 1,
      queued: 2,
      verified: 3,
      merged: 3,
      failed: 4,
      cancelled: 4,
    }
    return [...visibleTasks].sort((left, right) => (order[left.status] ?? 9) - (order[right.status] ?? 9))
  }, [visibleTasks])

  const hasPlanText = planText.trim().length > 0
  if (!hasPlanText && sortedTasks.length === 0) return null

  const runningCount = sortedTasks.filter((task) => task.status === 'running' || task.status === 'needs_review').length
  const completedCount = sortedTasks.filter((task) => task.status === 'verified' || task.status === 'merged').length
  const allQueued = sortedTasks.every((task) => task.status === 'queued')
  const showParallel = (currentRunStatus === 'running' || currentRunStatus === 'queued') && maxParallel > 1 && runningCount + completedCount > 1
  const showPlan = !showParallel && (currentRunStatus === 'queued' || currentRunStatus === 'running') && (allQueued || runningCount === 0)
  const runCompleted =
    resolvedRunId.length > 0 &&
    resolvedRunId === currentRunId &&
    (currentRunStatus === 'completed' || currentRunStatus === 'failed' || currentRunStatus === 'cancelled')

  return (
    <div className="space-y-2.5">
      {hasPlanText ? <UpdatedPlanCard planText={planText} runCompleted={runCompleted} /> : null}

      {sortedTasks.length > 0 ? (
        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#101216] text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
          <div className="border-b border-white/8 px-6 py-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/28">
              {showParallel ? 'Running in Parallel' : showPlan ? 'Proposed Plan' : 'Todo'}
            </div>
          </div>

          <div className="space-y-5 px-6 py-6">
            {showPlan ? (
              <>
                <div className="text-[26px] font-semibold tracking-tight text-white">{sortedTasks[0]?.title ?? 'Task plan'}</div>
                <div className="space-y-4 pl-4">
                  {sortedTasks.map((task, index) => (
                    <div key={task.id} className="flex items-start gap-4">
                      <div className="mt-1 flex w-14 items-center justify-center text-white/26">
                        <span>{index === sortedTasks.length - 1 ? '└──' : '├──'}</span>
                      </div>
                      <div>
                        <div className="text-[17px] text-white/72">{task.title}</div>
                        {task.assignedTo ? (
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/28">
                            {ROLE_LABELS[task.assignedTo] ?? task.assignedTo}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-1 text-[15px] text-white/28">
                  {sortedTasks.length} tasks
                  {modifiedCount > 0 ? ` · ${modifiedCount} files affected` : ''}
                </div>
              </>
            ) : showParallel ? (
              <div className="space-y-5">
                {sortedTasks.map((task) => {
                  const tone = statusTone(task)
                  const width = statusWidth(task)
                  return (
                    <div key={task.id} className="grid grid-cols-[minmax(0,260px)_1fr_40px] items-center gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-[17px] text-white/72">{task.title}</div>
                        {task.assignedTo ? (
                          <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/28">
                            {ROLE_LABELS[task.assignedTo] ?? task.assignedTo}
                          </div>
                        ) : null}
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={[
                            'h-full rounded-full transition-all duration-700',
                            tone.line,
                            task.status === 'running' ? 'animate-pulse' : '',
                          ].join(' ')}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className={`text-right text-[22px] ${tone.text}`}>{tone.marker}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTasks.map((task) => {
                  const tone = statusTone(task)
                  return (
                    <div key={task.id} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-base text-white/78">{task.title}</div>
                          {task.assignedTo ? (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/28">
                              {ROLE_LABELS[task.assignedTo] ?? task.assignedTo}
                            </div>
                          ) : null}
                        </div>
                        <div className={`text-lg ${tone.text}`}>{tone.marker}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
