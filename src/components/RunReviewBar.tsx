import { useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

import { useAppStore } from '../lib/store'

function IconUndo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 14 4 9l5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20a8 8 0 0 0-8-8H4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatRelativeTime(timestamp: number) {
  const deltaSecs = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (deltaSecs < 5) return 'now'
  if (deltaSecs < 60) return `${deltaSecs}s ago`
  const mins = Math.floor(deltaSecs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  return `${hours}h ago`
}

function summarizeEvent(event: ReturnType<typeof useAppStore.getState>['sessions'][number]['agentEvents'][number]) {
  if (event.type === 'Done') return event.message?.trim() || 'Task completed'
  if (event.type === 'Fail') return event.message?.trim() || 'Task failed'
  if (event.type === 'RunStatusChanged') return event.message?.trim() || 'Status updated'
  if (event.type === 'FileOp') {
    const file = event.path?.split('/').pop() || event.path || 'file'
    if (event.linesAdded || event.linesRemoved) {
      return `Updated ${file} · +${event.linesAdded ?? 0} -${event.linesRemoved ?? 0}`
    }
    return `${event.op ?? 'Touched'} ${file}`
  }
  if (event.type === 'StatusLine') return event.line?.trim() || 'Status updated'
  return event.message?.trim() || event.type
}

export function RunReviewBar() {
  const {
    sessions,
    activeSessionId,
    currentRunId,
    currentRunStatus,
    projectPath,
    modifiedFilesByPath,
  } = useAppStore()
  const [rollingBack, setRollingBack] = useState(false)

  const session = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )

  const files = useMemo(
    () => Object.values(modifiedFilesByPath),
    [modifiedFilesByPath],
  )

  const entries = useMemo(() => {
    return (session?.agentEvents ?? [])
      .filter((event) => !currentRunId || event.runId === currentRunId)
      .filter((event) => event.type === 'Done' || event.type === 'RunStatusChanged' || event.type === 'FileOp' || event.type === 'StatusLine')
      .slice()
      .reverse()
      .slice(0, 2)
  }, [session?.agentEvents, currentRunId])

  if (currentRunStatus !== 'completed' || files.length === 0 || !projectPath) return null

  const handleRollback = async () => {
    try {
      setRollingBack(true)
      const result = await invoke<{ rolledBack: number }>('git_rollback_files', {
        cwd: projectPath,
        paths: files.map((file) => file.path),
      })
      useAppStore.setState({ modifiedFilesByPath: {} })
      toast('Rolled back changes', { description: `${result.rolledBack} file(s) restored.` })
    } catch (error) {
      toast('Rollback failed', { description: error instanceof Error ? error.message : String(error) })
    } finally {
      setRollingBack(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px] rounded-[22px] border border-[color:var(--color-border)] bg-[#f8fafc] px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-medium text-slate-700">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span>작업 완료</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">
              {files.length}개 파일 변경됨
            </span>
          </div>
          {entries[0] ? (
            <div className="mt-1 truncate text-[12px] text-slate-500">
              {summarizeEvent(entries[0])}
              <span className="ml-2 text-slate-400">{formatRelativeTime(entries[0].timestamp)}</span>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void handleRollback()}
          disabled={rollingBack}
          className={[
            'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-medium transition',
            rollingBack
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
          ].join(' ')}
        >
          <IconUndo className="h-4 w-4" />
          <span>{rollingBack ? 'Rolling back…' : 'Rollback'}</span>
        </button>
      </div>
    </div>
  )
}
