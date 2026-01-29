import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '../lib/store'
import type { AgentEvent } from '../lib/store'

interface DiffLineProps {
  line: string
  lineNum: number
}

function DiffLine({ line, lineNum }: DiffLineProps) {
  const isAdded = line.startsWith('+') && !line.startsWith('+++')
  const isRemoved = line.startsWith('-') && !line.startsWith('---')

  return (
    <div className={[
      'flex font-mono text-xs leading-5',
      isAdded ? 'bg-emerald-50 text-emerald-900' : '',
      isRemoved ? 'bg-rose-50 text-rose-900' : '',
      !isAdded && !isRemoved ? 'text-black/70' : '',
    ].join(' ')}>
      <span className="w-10 shrink-0 pr-2 text-right text-black/35 select-none">{lineNum}</span>
      <span className="w-4 shrink-0 text-center select-none text-black/40">
        {isAdded ? '+' : isRemoved ? '-' : ' '}
      </span>
      <span className="flex-1 whitespace-pre-wrap break-all">{line.slice(1) || line}</span>
    </div>
  )
}

interface CollapsibleDiffProps {
  patch: string
  maxLines?: number
}

function CollapsibleDiff({ patch, maxLines = 15 }: CollapsibleDiffProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = patch.split('\n').filter(l => !l.startsWith('diff ') && !l.startsWith('index '))
  const visibleLines = expanded ? lines : lines.slice(0, maxLines)
  const hiddenCount = lines.length - maxLines

  return (
    <div className="my-2 overflow-hidden rounded-xl border border-black/10 bg-transparent">
      <div className="max-h-[300px] overflow-auto bg-transparent p-2">
        {visibleLines.map((line, i) => (
          <DiffLine key={i} line={line} lineNum={i + 1} />
        ))}
      </div>
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full bg-transparent py-2 text-center text-xs text-black/60 transition-colors hover:text-black/75"
        >
          Show full diff ({hiddenCount} more lines)
        </button>
      )}
    </div>
  )
}

interface AgentLogItemProps {
  event: AgentEvent
  diffPatch?: string
}

function AgentLogItem({ event, diffPatch }: AgentLogItemProps) {
  const { type, op, path, linesRead, linesAdded, linesRemoved, note, message, phase, line, preview } = event

  // FileOp events
  if (type === 'FileOp' && op) {
    const opLower = op.toLowerCase()
    const isSearch = opLower.includes('search') || opLower.includes('glob') || opLower.includes('grep')
    const isEdit = opLower.includes('edit') || opLower.includes('patch') || opLower.includes('str_replace')
    const isCreate = opLower.includes('create') || opLower.includes('write')
    const isBash = opLower.includes('bash') || opLower.includes('shell') || opLower.includes('command')

    // Bullet color
    const bulletColor = isBash
      ? 'bg-amber-500/80'
      : isEdit || isCreate
        ? 'bg-emerald-500/80'
        : isSearch
          ? 'bg-sky-500/80'
          : 'bg-black/35'

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

    // Use diffPatch from modifiedFilesByPath, or preview from event
    const patchContent = diffPatch || (preview ? preview.join('\n') : '')

    return (
      <div className="flex items-start gap-2 py-1.5">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${bulletColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-semibold text-black/80">{label}</span>
            {fileName && (
              <code className="rounded-md bg-black/5 px-1.5 py-0.5 text-sm font-mono text-black/70">
                {fileName}
              </code>
            )}
            {resultText && !isBash && (
              <span className="text-xs text-black/45">{resultText}</span>
            )}
          </div>
          {/* Bash command and output */}
          {isBash && note && (
            <div className="mt-1 font-mono text-sm text-black/70">
              <div className="text-amber-700">{note}</div>
            </div>
          )}
          {/* Show output for bash if available */}
          {isBash && preview && preview.length > 0 && (
            <div className="mt-1 border-l border-black/10 pl-3 font-mono text-xs text-black/60">
              {preview.slice(0, 5).map((line, i) => (
                <div key={i} className="flex">
                  <span className="mr-2 text-black/35">└</span>
                  <span>{line}</span>
                </div>
              ))}
              {preview.length > 5 && (
                <div className="text-black/40">... +{preview.length - 5} lines</div>
              )}
            </div>
          )}
          {/* Diff preview for edits/creates */}
          {(isEdit || isCreate) && patchContent && (
            <CollapsibleDiff patch={patchContent} />
          )}
        </div>
      </div>
    )
  }

  // Start/Done/Fail events
  if (type === 'Start' || type === 'Done' || type === 'Fail') {
    const bulletColor = type === 'Done' ? 'bg-green-500' : type === 'Fail' ? 'bg-red-500' : 'bg-blue-500'
    const textColor = type === 'Done' ? 'text-emerald-700' : type === 'Fail' ? 'text-rose-700' : 'text-sky-700'

    return (
      <div className="flex items-start gap-2 py-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${bulletColor}`} />
        <div className="min-w-0 flex-1">
          <span className={`text-sm font-semibold ${textColor}`}>
            {type === 'Done' ? 'Done!' : type === 'Fail' ? 'Failed' : phase || 'Starting'}
          </span>
          {message && (
            <span className="ml-1 text-sm text-black/65">{message}</span>
          )}
        </div>
      </div>
    )
  }

  // StatusLine - thinking indicator
  if (type === 'StatusLine' && line) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-black/55 italic">
        <span className="text-black/45">Thought for</span>
        <span className="text-black/65">{line}</span>
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
  const modifiedFilesByPath = useAppStore((s) => s.modifiedFilesByPath)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)

  // Get agentEvents from the active session
  const session = sessions.find((s) => s.id === activeSessionId)
  const agentEvents = (session?.agentEvents ?? []).filter((e) => (runId ? e.runId === runId : true))
  const visibleEvents = useMemo(() => agentEvents.filter(isRenderableAgentEvent), [agentEvents])

  // Process events into display items with diff patches
  const displayItems = useMemo(() => {
    return visibleEvents.map((event) => {
      // For FileOp events with a path, try to get the diff from modifiedFilesByPath
      let diffPatch: string | undefined
      if (event.type === 'FileOp' && event.path) {
        const modifiedFile = modifiedFilesByPath[event.path]
        if (modifiedFile?.patch) {
          diffPatch = modifiedFile.patch
        }
      }
      return {
        id: event.id,
        event,
        diffPatch,
      }
    })
  }, [visibleEvents, modifiedFilesByPath])
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
    <div className="rounded-2xl border border-black/10 bg-transparent text-black/80">
      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="max-h-[420px] overflow-auto px-4 py-3 space-y-0.5"
      >
        {displayItems.map(({ id, event, diffPatch }) => (
          <AgentLogItem key={id} event={event} diffPatch={diffPatch} />
        ))}

        {/* Working indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 py-2 text-sm text-black/55">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500/80" />
            <span>Working…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
