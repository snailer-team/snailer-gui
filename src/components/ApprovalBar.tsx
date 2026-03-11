import { useEffect, useMemo, useState } from 'react'

import { useAppStore } from '../lib/store'
import { ProposedChangesList } from './ProposedChange'

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ApprovalBar() {
  const { pendingApprovals, approve, currentRunStatus } = useAppStore()
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (currentRunStatus !== 'awaiting_approval') return
    const timer = window.setInterval(() => setNowMs(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [currentRunStatus])

  const active = useMemo(() => pendingApprovals[0] ?? null, [pendingApprovals])
  if (!active || currentRunStatus !== 'awaiting_approval') return null

  const secsLeft =
    typeof active.deadlineMs === 'number' ? Math.max(0, Math.floor((active.deadlineMs - nowMs) / 1000)) : null
  const isApplyReview = active.kind === 'apply_changes'

  return (
    <div className="mx-auto w-full max-w-[760px] space-y-3">
      <div className="overflow-hidden rounded-[20px] border border-[color:var(--color-border)] bg-white shadow-sm">
        <div className="border-b border-slate-200/80 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                {isApplyReview ? 'Review Complete' : 'Approval Required'}
              </div>
              <div className="mt-1 text-[20px] font-semibold tracking-tight text-slate-900">
                {isApplyReview ? '변경 사항을 적용할까요?' : '계속 진행하려면 승인해 주세요'}
              </div>
              <div className="mt-1 max-w-[560px] whitespace-pre-wrap text-[13px] leading-5 text-slate-500">
                {active.prompt}
              </div>
            </div>
            {secsLeft != null ? (
              <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-mono text-slate-400">
                {secsLeft}s
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => void approve(active.approvalId, 'approve_once')}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-slate-700"
          >
            <IconCheck className="h-4 w-4" />
            <span>Approve &amp; apply</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const feedback = window.prompt('수정 요청 내용을 입력하세요')?.trim()
              if (!feedback) return
              void approve(active.approvalId, 'request_change', feedback)
            }}
            className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            Request revision
          </button>

          <button
            type="button"
            onClick={() => void approve(active.approvalId, 'approve_always')}
            className="rounded-full px-2.5 py-2 text-[12px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            Always approve
          </button>

          <button
            type="button"
            onClick={() => void approve(active.approvalId, 'reject')}
            className="rounded-full px-2.5 py-2 text-[12px] font-medium text-rose-500 transition hover:bg-rose-50"
          >
            Reject
          </button>
        </div>
      </div>

      {active.diffs && active.diffs.length > 0 ? (
        <ProposedChangesList files={active.diffs} title="Proposed Changes" />
      ) : null}
    </div>
  )
}
