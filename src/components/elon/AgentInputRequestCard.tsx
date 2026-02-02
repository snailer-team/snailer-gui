import { useState } from 'react'
import type { AgentInputRequest } from '../../lib/store'

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

const statusStyles: Record<
  AgentInputRequest['status'],
  { bg: string; border: string; badge: string }
> = {
  pending: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-500/30',
    badge: 'bg-amber-500/10 text-amber-700',
  },
  resolved: {
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-700',
  },
  dismissed: {
    bg: 'bg-black/[0.02]',
    border: 'border-black/10',
    badge: 'bg-black/5 text-black/40',
  },
}

export function AgentInputRequestCard({
  request,
  onSubmit,
  onDismiss,
  compact,
}: {
  request: AgentInputRequest
  onSubmit: (requestId: string, value: string) => void
  onDismiss: (requestId: string) => void
  compact?: boolean
}) {
  const [value, setValue] = useState('')
  const style = statusStyles[request.status]
  const isPending = request.status === 'pending'

  if (compact) {
    return (
      <div className={`flex items-center gap-2 rounded-lg border ${style.border} ${style.bg} px-3 py-2`}>
        <span className="text-sm shrink-0">
          {request.inputType === 'password' ? '🔑' : '📝'}
        </span>
        <span className="text-[11px] font-semibold text-black/60 shrink-0">
          {request.agentId}:
        </span>
        <span className="text-[11px] text-black/70 truncate">{request.label}</span>

        {isPending && (
          <>
            {request.inputType === 'select' && request.options ? (
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="ml-auto shrink-0 rounded border border-black/10 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Select...</option>
                {request.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={request.inputType}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={request.placeholder || ''}
                className="ml-auto shrink-0 w-40 rounded border border-black/10 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && value.trim()) onSubmit(request.id, value.trim())
                }}
              />
            )}
            <button
              type="button"
              onClick={() => value.trim() && onSubmit(request.id, value.trim())}
              disabled={!value.trim()}
              className="shrink-0 rounded bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => onDismiss(request.id)}
              className="shrink-0 rounded bg-black/5 px-2 py-1 text-[10px] font-medium text-black/50 hover:bg-black/10 transition"
            >
              Skip
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-3 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/60">
            {request.agentId}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${style.badge}`}>
            {request.status}
          </span>
        </div>
        <span className="text-[10px] text-black/40">{formatTimeAgo(request.createdAt)}</span>
      </div>

      {/* Label */}
      <p className={`text-sm leading-relaxed break-words ${isPending ? 'text-black/80' : 'text-black/50'}`}>
        {request.label}
      </p>

      {/* Why */}
      <div className="mt-1.5 flex items-start gap-1 overflow-hidden">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40 shrink-0">Why:</span>
        <span className="text-xs text-black/60 break-words min-w-0">{request.why}</span>
      </div>

      {/* Input */}
      {isPending && (
        <div className="mt-3 flex items-center gap-2">
          {request.inputType === 'select' && request.options ? (
            <select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              <option value="">Select...</option>
              {request.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={request.inputType}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={request.placeholder || ''}
              className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && value.trim()) onSubmit(request.id, value.trim())
              }}
            />
          )}
          <button
            type="button"
            onClick={() => value.trim() && onSubmit(request.id, value.trim())}
            disabled={!value.trim()}
            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => onDismiss(request.id)}
            className="shrink-0 rounded-lg bg-black/5 px-3 py-1.5 text-xs font-medium text-black/50 hover:bg-black/10 transition"
          >
            Skip
          </button>
        </div>
      )}

      {/* Resolved info */}
      {request.status === 'resolved' && (
        <div className="mt-2 text-[10px] text-emerald-600 font-medium">
          Resolved {request.resolvedAt ? formatTimeAgo(request.resolvedAt) : ''}
        </div>
      )}
      {request.status === 'dismissed' && (
        <div className="mt-2 text-[10px] text-black/40 font-medium">
          Dismissed {request.resolvedAt ? formatTimeAgo(request.resolvedAt) : ''}
        </div>
      )}
    </div>
  )
}
