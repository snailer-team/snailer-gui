import { useState } from 'react'
import type { ModifiedFile } from '../lib/store'

// Chevron icon
function IconChevron({ className, expanded }: { className?: string; expanded?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`${className} transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// File icon
function IconFile({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path
        d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

interface DiffLineProps {
  line: string
  lineNum: number
}

function DiffLine({ line, lineNum }: DiffLineProps) {
  const isAdded = line.startsWith('+') && !line.startsWith('+++')
  const isRemoved = line.startsWith('-') && !line.startsWith('---')
  const isHeader = line.startsWith('@@') || line.startsWith('diff ') || line.startsWith('index ')
  const isMeta = line.startsWith('+++') || line.startsWith('---')

  let bgColor = ''
  let textColor = 'text-black/70'

  if (isAdded) {
    bgColor = 'bg-green-50'
    textColor = 'text-green-700'
  } else if (isRemoved) {
    bgColor = 'bg-red-50'
    textColor = 'text-red-700'
  } else if (isHeader) {
    bgColor = 'bg-blue-50/50'
    textColor = 'text-blue-600'
  } else if (isMeta) {
    textColor = 'text-black/40'
  }

  return (
    <div className={`flex text-[11px] font-mono leading-5 ${bgColor}`}>
      <span className="w-8 shrink-0 select-none pr-2 text-right text-black/30">{lineNum}</span>
      <span className={`flex-1 whitespace-pre-wrap break-all ${textColor}`}>{line}</span>
    </div>
  )
}

interface ProposedChangeProps {
  file: ModifiedFile
  isCompact?: boolean
}

export function ProposedChange({ file, isCompact = false }: ProposedChangeProps) {
  const [expanded, setExpanded] = useState(!isCompact)

  const lines = file.patch?.split('\n') || []
  const previewLines = isCompact ? lines.slice(0, 8) : lines
  const hasMore = isCompact && lines.length > 8

  // Extract filename from path
  const fileName = file.path.split('/').pop() || file.path

  return (
    <div className="rounded-xl border border-black/10 bg-white/80 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-black/[0.02] transition-colors"
      >
        <IconChevron className="h-3 w-3 text-black/40" expanded={expanded} />
        <IconFile className="h-3.5 w-3.5 text-black/50" />
        <span className="flex-1 text-left text-xs font-medium text-black/70 truncate">
          {fileName}
        </span>
        <div className="flex items-center gap-1.5 text-[10px]">
          {file.added > 0 && <span className="text-green-600">+{file.added}</span>}
          {file.removed > 0 && <span className="text-red-600">-{file.removed}</span>}
        </div>
      </button>

      {/* Diff content */}
      {expanded && (
        <div className="border-t border-black/5 bg-white/60 max-h-[300px] overflow-auto">
          <div className="py-1">
            {previewLines.map((line, i) => (
              <DiffLine key={i} line={line} lineNum={i + 1} />
            ))}
            {hasMore && (
              <div className="px-3 py-2 text-center text-[10px] text-black/40">
                ... {lines.length - 8} more lines
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer path */}
      <div className="border-t border-black/5 px-3 py-1.5 bg-black/[0.02]">
        <code className="text-[10px] text-black/40 truncate block">{file.path}</code>
      </div>
    </div>
  )
}

interface ProposedChangesListProps {
  files: ModifiedFile[]
  title?: string
}

export function ProposedChangesList({ files, title = 'Proposed Changes' }: ProposedChangesListProps) {
  const [allExpanded, setAllExpanded] = useState(false)

  if (files.length === 0) return null

  const totalAdded = files.reduce((sum, f) => sum + f.added, 0)
  const totalRemoved = files.reduce((sum, f) => sum + f.removed, 0)

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-100">
            <IconFile className="h-3 w-3 text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-amber-800">{title}</span>
          <span className="text-[10px] text-amber-600">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-green-600">+{totalAdded}</span>
          <span className="text-[10px] text-red-600">-{totalRemoved}</span>
          <button
            onClick={() => setAllExpanded(!allExpanded)}
            className="text-[10px] text-amber-600 hover:text-amber-800 transition-colors"
          >
            {allExpanded ? 'Collapse' : 'Expand'} all
          </button>
        </div>
      </div>

      {/* Files list */}
      <div className="space-y-2">
        {files.map((file) => (
          <ProposedChange key={file.path} file={file} isCompact={!allExpanded} />
        ))}
      </div>
    </div>
  )
}
