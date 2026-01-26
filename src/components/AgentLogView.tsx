import { useMemo, useState } from 'react'
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
      isAdded ? 'bg-green-900/30 text-green-400' : '',
      isRemoved ? 'bg-red-900/30 text-red-400' : '',
      !isAdded && !isRemoved ? 'text-gray-400' : '',
    ].join(' ')}>
      <span className="w-10 shrink-0 pr-2 text-right text-gray-500 select-none">{lineNum}</span>
      <span className="w-4 shrink-0 text-center select-none">
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
    <div className="rounded-lg bg-gray-900 overflow-hidden my-2">
      <div className="max-h-[300px] overflow-auto p-2">
        {visibleLines.map((line, i) => (
          <DiffLine key={i} line={line} lineNum={i + 1} />
        ))}
      </div>
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full py-2 text-center text-xs text-gray-400 hover:text-gray-300 bg-gray-800/50 transition-colors"
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
      ? 'bg-amber-500'
      : isEdit || isCreate
        ? 'bg-green-500'
        : isSearch
          ? 'bg-blue-500'
          : 'bg-gray-400'

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
            <span className="text-sm font-semibold text-gray-200">{label}</span>
            {fileName && (
              <code className="text-sm font-mono text-amber-400">{fileName}</code>
            )}
            {resultText && !isBash && (
              <span className="text-xs text-gray-500">{resultText}</span>
            )}
          </div>
          {/* Bash command and output */}
          {isBash && note && (
            <div className="mt-1 font-mono text-sm text-gray-300">
              <div className="text-amber-400">{note}</div>
            </div>
          )}
          {/* Show output for bash if available */}
          {isBash && preview && preview.length > 0 && (
            <div className="mt-1 pl-3 border-l border-gray-700 font-mono text-xs text-gray-400">
              {preview.slice(0, 5).map((line, i) => (
                <div key={i} className="flex">
                  <span className="text-gray-600 mr-2">└</span>
                  <span>{line}</span>
                </div>
              ))}
              {preview.length > 5 && (
                <div className="text-gray-600">... +{preview.length - 5} lines</div>
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
    const textColor = type === 'Done' ? 'text-green-400' : type === 'Fail' ? 'text-red-400' : 'text-blue-400'

    return (
      <div className="flex items-start gap-2 py-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${bulletColor}`} />
        <div className="min-w-0 flex-1">
          <span className={`text-sm font-semibold ${textColor}`}>
            {type === 'Done' ? 'Done!' : type === 'Fail' ? 'Failed' : phase || 'Starting'}
          </span>
          {message && (
            <span className="text-sm text-gray-300 ml-1">{message}</span>
          )}
        </div>
      </div>
    )
  }

  // StatusLine - thinking indicator
  if (type === 'StatusLine' && line) {
    return (
      <div className="flex items-center gap-2 py-1 text-sm text-gray-400 italic">
        <span className="text-gray-500">Thought for</span>
        <span className="text-gray-300">{line}</span>
      </div>
    )
  }

  return null
}

export function AgentLogView() {
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const currentRunStatus = useAppStore((s) => s.currentRunStatus)
  const modifiedFilesByPath = useAppStore((s) => s.modifiedFilesByPath)

  // Get agentEvents from the active session
  const session = sessions.find((s) => s.id === activeSessionId)
  const agentEvents = session?.agentEvents ?? []

  // Process events into display items with diff patches
  const displayItems = useMemo(() => {
    return agentEvents.map((event) => {
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
  }, [agentEvents, modifiedFilesByPath])

  if (displayItems.length === 0) return null

  const isRunning = currentRunStatus === 'running' || currentRunStatus === 'queued'

  return (
    <div className="rounded-xl bg-gray-900/95 text-gray-100 overflow-hidden shadow-lg">
      {/* Content */}
      <div className="px-4 py-3 max-h-[500px] overflow-auto space-y-0.5">
        {displayItems.map(({ id, event, diffPatch }) => (
          <AgentLogItem key={id} event={event} diffPatch={diffPatch} />
        ))}

        {/* Working indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Working...</span>
          </div>
        )}
      </div>
    </div>
  )
}
