import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../lib/store'
import type { AgentEvent, ChatMessage } from '../lib/store'

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconSearch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconEdit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M2 12l2-2 8-8 2 2-8 8-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 2l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconCreate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconRead({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M3 4h10M3 8h8M3 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconBash({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 6l2 2-2 2M8 10h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconChevron({ className, open }: { className?: string; open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function classifyFileOp(op: string) {
  const o = op.toLowerCase()
  if (o.includes('search') || o.includes('glob') || o.includes('grep')) return 'search'
  if (o.includes('edit') || o.includes('patch') || o.includes('str_replace')) return 'edit'
  if (o.includes('create') || o.includes('write')) return 'create'
  if (o.includes('bash') || o.includes('shell') || o.includes('command')) return 'bash'
  return 'read'
}

// ─── Stats bar ───────────────────────────────────────────────────────────────

interface LogStats {
  files: number
  edits: number
  bashes: number
  searches: number
  elapsedMs: number
}

function StatsBar({ stats }: { stats: LogStats }) {
  const parts = []
  if (stats.edits > 0) parts.push({ label: `${stats.edits} edit${stats.edits > 1 ? 's' : ''}`, color: 'text-emerald-600' })
  if (stats.bashes > 0) parts.push({ label: `${stats.bashes} cmd`, color: 'text-amber-600' })
  if (stats.searches > 0) parts.push({ label: `${stats.searches} search`, color: 'text-sky-600' })

  const secs = Math.floor(stats.elapsedMs / 1000)
  const elapsed = secs > 0 ? `${secs}s` : null

  if (parts.length === 0 && !elapsed) return null

  return (
    <div className="flex items-center gap-3 px-3 pt-2 pb-1">
      {parts.map((p) => (
        <span key={p.label} className={`text-[10px] font-semibold ${p.color}`}>
          {p.label}
        </span>
      ))}
      {elapsed && (
        <span className="ml-auto text-[10px] font-mono text-black/30">{elapsed}</span>
      )}
    </div>
  )
}

// ─── FileOp event card ────────────────────────────────────────────────────────

function FileOpCard({ event, isNew }: { event: AgentEvent; isNew: boolean }) {
  const [open, setOpen] = useState(false)
  const kind = classifyFileOp(event.op ?? '')

  const config = {
    search: { icon: <IconSearch className="h-3 w-3" />, label: 'Search', dot: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50' },
    edit:   { icon: <IconEdit className="h-3 w-3" />,   label: 'Edit',   dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    create: { icon: <IconCreate className="h-3 w-3" />, label: 'Create', dot: 'bg-violet-500', text: 'text-violet-700', bg: 'bg-violet-50' },
    bash:   { icon: <IconBash className="h-3 w-3" />,   label: 'Bash',   dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
    read:   { icon: <IconRead className="h-3 w-3" />,   label: 'Read',   dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' },
  }[kind]

  const fileName = event.path?.split('/').pop() ?? event.path ?? ''
  const hasDetail = Boolean(event.note || (event.preview && event.preview.length > 0))
  const hasDiff = event.linesAdded !== undefined || event.linesRemoved !== undefined

  return (
    <div className={`group relative ${isNew ? 'animate-[slideIn_0.15s_ease-out]' : ''}`}>
      {/* Timeline dot */}
      <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center">
        <span className={`h-2 w-2 rounded-full ${config.dot} ring-2 ring-white`} />
      </div>

      <div
        className={[
          'ml-6 rounded-lg border border-transparent px-2.5 py-1.5 transition-colors',
          hasDetail ? 'cursor-pointer hover:border-black/10 hover:bg-white/60' : '',
          open ? 'border-black/10 bg-white/60' : '',
        ].join(' ')}
        onClick={() => hasDetail && setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${config.text} ${config.bg}`}>
            {config.icon}
            {config.label}
          </span>
          {fileName && (
            <code className="min-w-0 truncate text-xs font-mono text-black/60">{fileName}</code>
          )}
          {hasDiff && (
            <div className="ml-auto flex items-center gap-1 text-[10px] font-mono font-semibold">
              {event.linesAdded ? <span className="text-emerald-600">+{event.linesAdded}</span> : null}
              {event.linesRemoved ? <span className="text-rose-500">-{event.linesRemoved}</span> : null}
            </div>
          )}
          {event.linesRead && !hasDiff && (
            <span className="ml-auto text-[10px] text-black/30">{event.linesRead}L</span>
          )}
          {hasDetail && (
            <IconChevron className="ml-auto h-3 w-3 shrink-0 text-black/30" open={open} />
          )}
        </div>

        {/* Bash command inline preview */}
        {kind === 'bash' && event.note && !open && (
          <div className="mt-1 truncate pl-1 font-mono text-[10px] text-amber-700/70">
            $ {event.note}
          </div>
        )}

        {/* Expanded detail */}
        {open && (
          <div className="mt-2 overflow-hidden rounded-md bg-black/[0.03] p-2">
            {event.note && (
              <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-black/60">
                {kind === 'bash' ? `$ ${event.note}` : event.note}
              </pre>
            )}
            {event.preview && event.preview.length > 0 && (
              <div className="mt-1 space-y-px">
                {event.preview.map((line, i) => (
                  <div key={i} className="font-mono text-[10px] text-black/50">{line}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Status event card ────────────────────────────────────────────────────────

function StatusEventCard({ event, isNew }: { event: AgentEvent; isNew: boolean }) {
  const isDone = event.type === 'Done'
  const isFail = event.type === 'Fail'

  const config = isDone
    ? { icon: <IconCheck className="h-3.5 w-3.5 text-white" />, iconBg: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Done' }
    : isFail
    ? { icon: <IconX className="h-3.5 w-3.5 text-white" />, iconBg: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', label: 'Failed' }
    : { icon: null, iconBg: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50 border-sky-100', label: event.phase ?? 'Starting' }

  // For Start events, don't show the message (it's usually the full prompt text).
  // For Done/Fail, show a short message if available.
  const displayMsg = (isDone || isFail) && event.message
    ? event.message.length > 80 ? event.message.slice(0, 77) + '…' : event.message
    : null

  return (
    <div className={`group relative ${isNew ? 'animate-[slideIn_0.15s_ease-out]' : ''}`}>
      <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center">
        <span className={`flex h-4 w-4 items-center justify-center rounded-full ${config.iconBg} ring-2 ring-white`}>
          {config.icon ?? <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
      </div>

      <div className={`ml-6 rounded-lg border px-3 py-1.5 ${config.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${config.text}`}>{config.label}</span>
          {displayMsg && (
            <span className={`min-w-0 truncate text-xs ${config.text} opacity-70`}>{displayMsg}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── StatusLine (thinking) ────────────────────────────────────────────────────

function ThinkingCard({ event, isNew }: { event: AgentEvent; isNew: boolean }) {
  return (
    <div className={`group relative ${isNew ? 'animate-[slideIn_0.15s_ease-out]' : ''}`}>
      <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-violet-400 ring-2 ring-white animate-pulse" />
      </div>
      <div className="ml-6 px-2.5 py-1">
        <span className="text-[11px] italic text-black/40">
          {event.line}
        </span>
      </div>
    </div>
  )
}

// ─── RunStatusChanged ─────────────────────────────────────────────────────────

function RunStatusCard({ event, isNew }: { event: AgentEvent; isNew: boolean }) {
  const text = (event.message ?? '').toLowerCase()
  const isDone = text.includes('complet') || text.includes('done')
  const isFail = text.includes('fail') || text.includes('cancel')

  const dotColor = isFail ? 'bg-rose-400' : isDone ? 'bg-emerald-400' : 'bg-slate-400'
  const textColor = isFail ? 'text-rose-600' : isDone ? 'text-emerald-600' : 'text-black/50'

  return (
    <div className={`group relative ${isNew ? 'animate-[slideIn_0.15s_ease-out]' : ''}`}>
      <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center">
        <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ring-2 ring-white`} />
      </div>
      <div className="ml-6 px-2.5 py-1">
        <span className={`text-xs ${textColor}`}>{event.message}</span>
      </div>
    </div>
  )
}

// ─── LoopGuard ────────────────────────────────────────────────────────────────

function LoopGuardCard({ isNew }: { isNew: boolean }) {
  return (
    <div className={`group relative ${isNew ? 'animate-[slideIn_0.15s_ease-out]' : ''}`}>
      <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
      </div>
      <div className="ml-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
        <span className="text-xs font-semibold text-amber-700">Loop guard triggered</span>
      </div>
    </div>
  )
}

// ─── System stream item ───────────────────────────────────────────────────────

function parseSystemStreamText(content: string): string {
  const trimmed = (content ?? '').trim()
  if (!trimmed) return ''
  const m = trimmed.match(/^\[[^\]]+\]\s*(.*)$/)
  return (m?.[1] ?? trimmed).trim()
}

function SystemStreamCard({ msg, isNew }: { msg: ChatMessage; isNew: boolean }) {
  const text = parseSystemStreamText(msg.content)
  if (!text) return null
  return (
    <div className={`group relative ${isNew ? 'animate-[slideIn_0.15s_ease-out]' : ''}`}>
      <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 ring-2 ring-white" />
      </div>
      <div className="ml-6 px-2.5 py-1">
        <span className="truncate text-[11px] italic text-black/40">{text}</span>
      </div>
    </div>
  )
}

// ─── Working indicator ────────────────────────────────────────────────────────

function WorkingIndicator() {
  return (
    <div className="relative">
      <div className="absolute left-0 top-2 flex h-4 w-4 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
      </div>
      <div className="ml-6 flex items-center gap-2 px-2.5 py-1.5">
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1 w-1 rounded-full bg-black/30 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <span className="text-[11px] text-black/40">working</span>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BOILERPLATE_STATUS_RE = /^run status: (running|queued|started|idle)$/i

function isRenderableAgentEvent(event: AgentEvent): boolean {
  if (event.type === 'FileOp') return Boolean(event.op)
  if (event.type === 'Start' || event.type === 'Done' || event.type === 'Fail') return true
  if (event.type === 'StatusLine') return Boolean(event.line)
  if (event.type === 'RunStatusChanged') {
    const msg = (event.message ?? '').trim()
    // Filter out boilerplate "Run status: running" messages — they are noise.
    return Boolean(msg) && !BOILERPLATE_STATUS_RE.test(msg)
  }
  if (event.type === 'LoopGuardTriggered') return true
  return false
}

function computeStats(events: AgentEvent[], startTime: number): LogStats {
  const files = new Set<string>()
  let edits = 0, bashes = 0, searches = 0
  for (const e of events) {
    if (e.type !== 'FileOp' || !e.op) continue
    const k = classifyFileOp(e.op)
    if (k === 'edit' || k === 'create') { edits++; if (e.path) files.add(e.path) }
    else if (k === 'bash') bashes++
    else if (k === 'search') searches++
  }
  const elapsed = startTime > 0 ? Date.now() - startTime : 0
  return { files: files.size, edits, bashes, searches, elapsedMs: elapsed }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentLogView({ runId }: { runId?: string } = {}) {
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const currentRunStatus = useAppStore((s) => s.currentRunStatus)
  const currentRunId = useAppStore((s) => s.currentRunId)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const [startTime] = useState(() => Date.now())
  const [, setTick] = useState(0)

  // Tick for elapsed timer
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

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

  useEffect(() => {
    const newIds = displayItems.filter((x) => x.isNew).map((x) => x.id)
    if (newIds.length > 0) {
      setSeenIds((prev) => {
        const next = new Set(prev)
        newIds.forEach((id) => next.add(id))
        return next
      })
    }
  }, [displayItems])

  const isRunning =
    (currentRunStatus === 'running' || currentRunStatus === 'queued') && (!runId || runId === currentRunId)

  useEffect(() => {
    if (!stickToBottomRef.current) return
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [displayItems.length, isRunning])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const stats = useMemo(() => computeStats(visibleEvents, startTime), [visibleEvents, startTime])

  if (displayItems.length === 0 && !isRunning) return null

  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-[#f9fafb]">
      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Timeline */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative px-3 pb-2"
      >
        {/* Vertical timeline line */}
        {displayItems.length > 0 && (
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-black/[0.06]" />
        )}

        <div className="space-y-0.5">
          {displayItems.map((item) => {
            if (item.kind === 'stream') {
              return <SystemStreamCard key={item.id} msg={item.msg} isNew={item.isNew} />
            }
            const { event, isNew } = item
            if (event.type === 'FileOp') return <FileOpCard key={event.id} event={event} isNew={isNew} />
            if (event.type === 'Start' || event.type === 'Done' || event.type === 'Fail')
              return <StatusEventCard key={event.id} event={event} isNew={isNew} />
            if (event.type === 'StatusLine') return <ThinkingCard key={event.id} event={event} isNew={isNew} />
            if (event.type === 'RunStatusChanged') return <RunStatusCard key={event.id} event={event} isNew={isNew} />
            if (event.type === 'LoopGuardTriggered') return <LoopGuardCard key={event.id} isNew={isNew} />
            return null
          })}

          {isRunning && <WorkingIndicator />}
        </div>

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
