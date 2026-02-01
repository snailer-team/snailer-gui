import { useMemo } from 'react'
import { useAppStore } from '../../lib/store'
import {
  type Evidence,
  getVerdictColor,
  getVerdictIcon,
  getTypeIcon,
  formatTimestamp,
} from '../../lib/elonEvidence'
import { ELON_AGENTS } from '../../lib/elonOrg'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function getAgentTitle(agentId: string): string {
  const agent = ELON_AGENTS.find((a) => a.id === agentId)
  return agent?.title.split(' ')[0] ?? agentId.toUpperCase()
}

function EvidenceCard({
  evidence,
  isSelected,
  onSelect,
}: {
  evidence: Evidence
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${getVerdictColor(evidence.verdict)} ${isSelected ? 'ring-2 ring-black/10' : 'hover:bg-white/50'}`}
    >
      <div className="flex items-start gap-2">
        {/* Type Icon */}
        <span className="text-base shrink-0">{getTypeIcon(evidence.type)}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{getVerdictIcon(evidence.verdict)}</span>
            <span className="truncate text-sm font-medium">{evidence.title}</span>
          </div>
          <div className="mt-0.5 text-xs opacity-70">{evidence.summary}</div>
          <div className="mt-1 flex items-center gap-2 text-[10px] opacity-50">
            <span>[{getAgentTitle(evidence.relatedAgentId)}]</span>
            <span>·</span>
            <span>{formatTimestamp(evidence.timestamp)}</span>
          </div>
        </div>
      </div>
    </button>
  )
}

function EvidenceDetail({ evidence }: { evidence: Evidence }) {
  const renderData = () => {
    switch (evidence.type) {
      case 'test_result': {
        const data = evidence.data as { total: number; passed: number; failed: number; duration: number; failures?: Array<{ name: string; message: string }> }
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg bg-white/60 p-2">
                <div className="text-lg font-semibold text-black/80">{data.total}</div>
                <div className="text-[10px] text-black/40">Total</div>
              </div>
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <div className="text-lg font-semibold text-emerald-600">{data.passed}</div>
                <div className="text-[10px] text-emerald-600/70">Passed</div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2">
                <div className="text-lg font-semibold text-red-600">{data.failed}</div>
                <div className="text-[10px] text-red-600/70">Failed</div>
              </div>
              <div className="rounded-lg bg-white/60 p-2">
                <div className="text-lg font-semibold text-black/80">{data.duration}ms</div>
                <div className="text-[10px] text-black/40">Duration</div>
              </div>
            </div>
            {data.failures && data.failures.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-semibold uppercase text-black/40 mb-1">Failures</div>
                {data.failures.map((f, i) => (
                  <div key={i} className="rounded-lg bg-red-500/5 border border-red-500/10 p-2 text-xs">
                    <div className="font-medium text-red-700">{f.name}</div>
                    <div className="text-red-600/70 mt-0.5">{f.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      case 'build_log': {
        const data = evidence.data as { success: boolean; errors: number; warnings: number; output: string; duration: number }
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`rounded-lg p-2 ${data.success ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                <div className={`text-lg font-semibold ${data.success ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.success ? '✓' : '✗'}
                </div>
                <div className="text-[10px] opacity-70">{data.success ? 'Success' : 'Failed'}</div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2">
                <div className="text-lg font-semibold text-red-600">{data.errors}</div>
                <div className="text-[10px] text-red-600/70">Errors</div>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2">
                <div className="text-lg font-semibold text-amber-600">{data.warnings}</div>
                <div className="text-[10px] text-amber-600/70">Warnings</div>
              </div>
            </div>
            {data.output && (
              <pre className="mt-2 rounded-lg bg-black/5 p-2 text-[11px] text-black/70 overflow-auto max-h-32">
                {data.output}
              </pre>
            )}
          </div>
        )
      }

      case 'diff': {
        const data = evidence.data as { path: string; added: number; removed: number; patch: string }
        return (
          <div className="space-y-2">
            <div className="rounded-lg bg-white/60 p-2">
              <div className="text-xs font-medium text-black/70 truncate">{data.path}</div>
              <div className="mt-1 flex items-center gap-3 text-sm">
                <span className="text-emerald-600 font-medium">+{data.added}</span>
                <span className="text-red-600 font-medium">-{data.removed}</span>
              </div>
            </div>
            {data.patch && (
              <pre className="rounded-lg bg-black/5 p-2 text-[10px] text-black/70 overflow-auto max-h-40 font-mono">
                {data.patch.slice(0, 500)}
                {data.patch.length > 500 && '...'}
              </pre>
            )}
          </div>
        )
      }

      case 'lint_report': {
        const data = evidence.data as { errors: number; warnings: number; issues: Array<{ file: string; line: number; message: string; severity: string }> }
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-red-500/10 p-2">
                <div className="text-lg font-semibold text-red-600">{data.errors}</div>
                <div className="text-[10px] text-red-600/70">Errors</div>
              </div>
              <div className="rounded-lg bg-amber-500/10 p-2">
                <div className="text-lg font-semibold text-amber-600">{data.warnings}</div>
                <div className="text-[10px] text-amber-600/70">Warnings</div>
              </div>
            </div>
            {data.issues.length > 0 && (
              <div className="space-y-1 mt-2">
                {data.issues.slice(0, 5).map((issue, i) => (
                  <div
                    key={i}
                    className={`rounded-lg p-2 text-xs ${issue.severity === 'error' ? 'bg-red-500/5 border border-red-500/10' : 'bg-amber-500/5 border border-amber-500/10'}`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] text-black/40">{issue.file}:{issue.line}</span>
                    </div>
                    <div className={issue.severity === 'error' ? 'text-red-700' : 'text-amber-700'}>
                      {issue.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      }

      case 'screenshot': {
        const data = evidence.data as { url: string; description?: string }
        return (
          <div className="space-y-2">
            {data.description && (
              <div className="text-xs text-black/60">{data.description}</div>
            )}
            {data.url && (
              <div className="rounded-lg bg-black/5 p-4 text-center">
                <span className="text-4xl">📷</span>
                <div className="text-xs text-black/40 mt-1">Screenshot preview</div>
              </div>
            )}
          </div>
        )
      }

      default:
        return (
          <pre className="rounded-lg bg-black/5 p-2 text-[10px] text-black/60 overflow-auto">
            {JSON.stringify(evidence.data, null, 2)}
          </pre>
        )
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getTypeIcon(evidence.type)}</span>
        <span className="font-semibold text-black/80">{evidence.title}</span>
      </div>
      {renderData()}
    </div>
  )
}

export function ElonEvidencePanel() {
  const { elonX, elonSelectEvidence, elonSetEvidenceFilter } = useAppStore()
  const { evidences, selectedEvidenceId, evidenceFilter } = elonX

  const filteredEvidences = useMemo(() => {
    if (evidenceFilter === 'all') return evidences
    return evidences.filter((e) => {
      if (evidenceFilter === 'pass') return e.verdict === 'pass'
      if (evidenceFilter === 'fail') return e.verdict === 'fail'
      if (evidenceFilter === 'warning') return e.verdict === 'warning'
      return true
    })
  }, [evidences, evidenceFilter])

  const selectedEvidence = useMemo(() => {
    return evidences.find((e) => e.id === selectedEvidenceId) ?? null
  }, [evidences, selectedEvidenceId])

  const filterButtons: Array<{ key: typeof evidenceFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pass', label: 'Pass' },
    { key: 'fail', label: 'Fail' },
    { key: 'warning', label: 'Warn' },
  ]

  return (
    <div className="h-full flex flex-col rounded-2xl border border-black/10 bg-white/50">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-black/5">
        <span className="text-sm font-semibold text-black/80">Evidence</span>
        <div className="flex items-center gap-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => elonSetEvidenceFilter(btn.key)}
              className={`rounded-lg px-2 py-0.5 text-[10px] font-medium transition ${
                evidenceFilter === btn.key
                  ? 'bg-black/10 text-black/80'
                  : 'text-black/40 hover:bg-black/5'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          <div className="p-2 space-y-2">
            {filteredEvidences.length === 0 ? (
              <div className="text-center py-8 text-sm text-black/40">
                No evidence yet
              </div>
            ) : (
              filteredEvidences.map((ev) => (
                <EvidenceCard
                  key={ev.id}
                  evidence={ev}
                  isSelected={selectedEvidenceId === ev.id}
                  onSelect={() => elonSelectEvidence(ev.id === selectedEvidenceId ? null : ev.id)}
                />
              ))
            )}
          </div>
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Detail View */}
      {selectedEvidence && (
        <div className="shrink-0 border-t border-black/5 max-h-[200px] overflow-auto">
          <EvidenceDetail evidence={selectedEvidence} />
        </div>
      )}
    </div>
  )
}
