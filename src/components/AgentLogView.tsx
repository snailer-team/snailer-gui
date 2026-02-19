import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../lib/store'
import type { AgentEvent, ChatMessage } from '../lib/store'

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

  // Run status changes
  if (type === 'RunStatusChanged') {
    const statusText = (message || phase || 'status').toLowerCase()
    const isFail = statusText.includes('fail') || statusText.includes('cancel')
    const isDone = statusText.includes('complete') || statusText.includes('done')
    return (
      <div className={`flex items-center gap-1.5 py-0.5 text-xs ${isNew ? 'animate-fade-in' : ''}`}>
        <span
          className={[
            'h-1.5 w-1.5 shrink-0 rounded-full',
            isFail ? 'bg-rose-500/70' : isDone ? 'bg-emerald-500/70' : 'bg-slate-500/70',
          ].join(' ')}
        />
        <span className={isFail ? 'text-rose-600' : isDone ? 'text-emerald-600' : 'text-black/55'}>
          {message || phase || 'run status changed'}
        </span>
      </div>
    )
  }

  if (type === 'LoopGuardTriggered') {
    return (
      <div className={`flex items-center gap-1.5 py-0.5 text-xs text-amber-700 ${isNew ? 'animate-fade-in' : ''}`}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/70" />
        <span>Loop guard triggered</span>
      </div>
    )
  }

  return null
}

function isRenderableAgentEvent(event: AgentEvent): boolean {
  if (event.type === 'FileOp') return Boolean(event.op)
  if (event.type === 'Start' || event.type === 'Done' || event.type === 'Fail') return true
  if (event.type === 'StatusLine') return Boolean(event.line)
  if (event.type === 'RunStatusChanged') return Boolean(event.message)
  if (event.type === 'LoopGuardTriggered') return true
  return false
}

function parseSystemStreamText(content: string): string {
  const trimmed = (content || '').trim()
  if (!trimmed) return ''
  const m = trimmed.match(/^\[[^\]]+\]\s*(.*)$/)
  if (m?.[1]) return m[1].trim()
  return trimmed
}

function renderSystemStreamItem(msg: ChatMessage, isNew?: boolean) {
  const text = parseSystemStreamText(msg.content)
  if (!text) return null
  return (
    <div className={`flex items-center gap-1.5 py-0.5 text-xs text-black/45 ${isNew ? 'animate-fade-in' : ''}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500/70" />
      <span className="truncate italic">{text}</span>
    </div>
  )
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
  const streamMessages = useMemo(
    () =>
      (session?.messages ?? []).filter(
        (m) =>
          m.role === 'system' &&
          Boolean(m.runId) &&
          (!runId || m.runId === runId) &&
          Boolean(m.content?.trim()),
      ),
    [session?.messages, runId],
  )

  // Track new items for animation
  const displayItems = useMemo(() => {
    const eventItems = visibleEvents.map((event) => ({
      id: event.id,
      kind: 'event' as const,
      event,
      isNew: !seenIds.has(event.id),
    }))
    const streamItems = streamMessages.map((msg) => ({
      id: msg.id,
      kind: 'stream' as const,
      msg,
      isNew: !seenIds.has(msg.id),
    }))
    return [...eventItems, ...streamItems]
  }, [visibleEvents, streamMessages, seenIds])

  // Update seen IDs after render
  useEffect(() => {
    const newIds = displayItems.map((x) => x.id).filter((id) => !seenIds.has(id))
    if (newIds.length > 0) {
      setSeenIds((prev) => {
        const next = new Set(prev)
        newIds.forEach((id) => next.add(id))
        return next
      })
    }
  }, [displayItems, seenIds])

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
        {displayItems.map((item) =>
          item.kind === 'event' ? (
            <AgentLogItem key={item.id} event={item.event} isNew={item.isNew} />
          ) : (
            <div key={item.id}>{renderSystemStreamItem(item.msg, item.isNew)}</div>
          ),
        )}

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
