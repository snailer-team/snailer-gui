import { useEffect, useMemo, useState } from 'react'

import { useAppStore } from '../lib/store'
import { Button } from './ui/button'
import { ProposedChangesList } from './ProposedChange'

export function ApprovalBar() {
  const { pendingApprovals, approve, currentRunStatus } = useAppStore()
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (currentRunStatus !== 'awaiting_approval') return
    const t = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [currentRunStatus])

  const active = useMemo(() => pendingApprovals[0] ?? null, [pendingApprovals])
  if (!active || currentRunStatus !== 'awaiting_approval') return null

  const secsLeft =
    typeof active.deadlineMs === 'number' ? Math.max(0, Math.floor((active.deadlineMs - nowMs) / 1000)) : null

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-6 space-y-3">
      {/* Approval card */}
      <div className="snailer-card rounded-2xl border border-[color:var(--color-border)] bg-[#f8fafc] px-4 py-3 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">Approval Required</div>
            <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-[color:var(--color-text-secondary)]">
              {active.prompt}
            </div>
          </div>
          {secsLeft != null ? <div className="shrink-0 text-xs text-slate-500">{secsLeft}s</div> : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => void approve(active.approvalId, 'approve_once')}>
            한 번 승인
          </Button>
          <Button size="sm" variant="default" onClick={() => void approve(active.approvalId, 'approve_always')}>
            항상 승인
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              const feedback = window.prompt('변경 요청 내용을 입력하세요')?.trim()
              if (!feedback) return
              void approve(active.approvalId, 'request_change', feedback)
            }}
          >
            변경 요청
          </Button>
          <Button size="sm" variant="destructive" onClick={() => void approve(active.approvalId, 'reject')}>
            거절
          </Button>
        </div>
      </div>

      {/* Show diffs if available */}
      {active.diffs && active.diffs.length > 0 && (
        <ProposedChangesList files={active.diffs} title="Proposed Changes" />
      )}
    </div>
  )
}

