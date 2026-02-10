import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../lib/store'
import type { AgentEvent } from '../lib/store'

interface AgentLogItemProps {
  event: AgentEvent
  isNew?: boolean
}

function AgentLogItem({ event, isNew }: AgentLogItemProps) {
  const { type, op, path, linesRead, linesAdded, linesRemoved, note, message, phase, line } = event

  // FileOp events
  if (type === 'FileOp' && op) {
    const opLower = op.toLowerCase()
    const isSearch = opLower.includes('search') || opLower.includes('glob') || opLower.includes('grep')
    const isEdit = opLower.includes('edit') || opLower.includes('patch') || opLower.includes('str_replace')
    const isCreate = opLower.includes('create') || opLower.includes('write')
    const isBash = opLower.includes('bash') || opLower.includes('shell') || opLower.includes('command')

    // Bullet color
    const bulletColor = isBash
      ? 'bg-amber-500/70'
      : isEdit || isCreate
        ? 'bg-emerald-500/70'
        : isSearch
          ? 'bg-sky-500/70'
          : 'bg-black/30'

    // Label
    const label = isBash ? 'Bash' : isEdit ? 'Edit' : isCreate ? 'Create' : isSearch ? 'Search' : 'Read'

    // Extract filename
    const fileName = path?.split('/').pop() || path

    // Format result/note
    let resultText = ''
    if (linesRead) resultText = `${linesRead} lines`
    if (linesAdded !== undefined || linesRemoved !== undefined) {
      const parts = []
      if (linesAdded) parts.push(`+${linesAdded}`)
      if (linesRemoved) parts.push(`-${linesRemoved}`)
      resultText = parts.join(' ')
    }

    return (
      <div className={`flex items-center gap-1.5 py-0.5 ${isNew ? 'animate-fade-in' : ''}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bulletColor}`} />
        <span className="text-xs font-medium text-black/60">{label}</span>
        {fileName && (
          <code className="text-xs font-mono text-black/50">{fileName}</code>
        )}
        {resultText && !isBash && (
          <span className="text-[10px] text-black/40">{resultText}</span>
        )}
        {/* Bash command inline */}
        {isBash && note && (
          <span className="text-xs font-mono text-amber-600/80 truncate max-w-[200px]">{note}</span>
        )}
      </div>
    )
  }

  // Start/Done/Fail events
  if (type === 'Start' || type === 'Done' || type === 'Fail') {
    const bulletColor = type === 'Done' ? 'bg-green-500/70' : type === 'Fail' ? 'bg-red-500/70' : 'bg-blue-500/70'
    const textColor = type === 'Done' ? 'text-emerald-600' : type === 'Fail' ? 'text-rose-600' : 'text-sky-600'

    return (
      <div className={`flex items-center gap-1.5 py-0.5 ${isNew ? 'animate-fade-in' : ''}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bulletColor}`} />
        <span className={`text-xs font-medium ${textColor}`}>
          {type === 'Done' ? 'Done' : type === 'Fail' ? 'Failed' : phase || 'Starting'}
        </span>
        {message && (
          <span className="text-xs text-black/50 truncate">{message}</span>
        )}
      </div>
    )
  }

  // StatusLine - thinking indicator
  if (type === 'StatusLine' && line) {
    return (
      <div className={`flex items-center gap-1.5 py-0.5 text-xs text-black/45 ${isNew ? 'animate-fade-in' : ''}`}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400/60 animate-pulse" />
        <span className="italic">thinking {line}</span>
      </div>
    )
  }

  return null
}

function isRenderableAgentEvent(event: AgentEvent): boolean {
  if (event.type === 'FileOp') return Boolean(event.op)
  if (event.type === 'Start' || event.type === 'Done' || event.type === 'Fail') return true
  if (event.type === 'StatusLine') return Boolean(event.line)
  return false
}

export function AgentLogView({ runId }: { runId?: string } = {}) {
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const currentRunStatus = useAppStore((s) => s.currentRunStatus)
  const currentRunId = useAppStore((s) => s.currentRunId)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // Get agentEvents from the active session
  const session = sessions.find((s) => s.id === activeSessionId)
  const agentEvents = (session?.agentEvents ?? []).filter((e) => (runId ? e.runId === runId : true))
  const visibleEvents = useMemo(() => agentEvents.filter(isRenderableAgentEvent), [agentEvents])

  // Track new items for animation
  const displayItems = useMemo(() => {
    return visibleEvents.map((event) => ({
      id: event.id,
      event,
      isNew: !seenIds.has(event.id),
    }))
  }, [visibleEvents, seenIds])

  // Update seen IDs after render
  useEffect(() => {
    const newIds = visibleEvents.map((e) => e.id).filter((id) => !seenIds.has(id))
    if (newIds.length > 0) {
      setSeenIds((prev) => {
        const next = new Set(prev)
        newIds.forEach((id) => next.add(id))
        return next
      })
    }
  }, [visibleEvents, seenIds])

  const hasItems = displayItems.length > 0

  const isRunning =
    (currentRunStatus === 'running' || currentRunStatus === 'queued') && (!runId || runId === currentRunId)

  useEffect(() => {
    if (!stickToBottomRef.current) return
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [displayItems.length, isRunning])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distance < 80
  }

  if (!hasItems) return null

  return (
    <div className="text-black/70">
      {/* Compact streaming log */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="px-3 py-1.5 space-y-0"
      >
        {displayItems.map(({ id, event, isNew }) => (
          <AgentLogItem key={id} event={event} isNew={isNew} />
        ))}

        {/* Working indicator */}
        {isRunning && (
          <div className="flex items-center gap-1.5 py-0.5 text-xs text-black/45">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500/70" />
            <span>working…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
