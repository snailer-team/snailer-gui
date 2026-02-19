import { useMemo, useState } from 'react'
import { useAppStore } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function formatAgo(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return `${diffSec}s`
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m`
  const hour = Math.floor(min / 60)
  return `${hour}h`
}

export function ElonAssignmentPanel() {
  const decisions = useAppStore((s) => s.elonRegistry.agentAssignmentDecisions)
  const employees = useAppStore((s) => s.elonRegistry.agentEmployees)
  const cycleRuns = useAppStore((s) => s.elonX.cycleRuns)
  const evidences = useAppStore((s) => s.elonX.evidences)
  const elonSelectEvidence = useAppStore((s) => s.elonSelectEvidence)
  const elonSelectCycleRun = useAppStore((s) => s.elonSelectCycleRun)
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'factory' | 'ceo'>('all')

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  )
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return decisions
      .filter((d) => sourceFilter === 'all' || d.selectedBy === sourceFilter)
      .filter((d) => {
        if (!q) return true
        const displayName = employeeMap.get(d.agentId)?.displayName ?? ''
        return [
          d.agentId,
          displayName,
          d.cycleRunId,
          d.taskId,
          d.why,
          d.selectedBy,
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .slice(0, 120)
  }, [decisions, employeeMap, query, sourceFilter])

  const cycleRunMap = useMemo(() => new Map(cycleRuns.map((c) => [c.id, c])), [cycleRuns])

  const openRightTab = (tab: 'broadcasts' | 'evidence') => {
    window.dispatchEvent(new CustomEvent('elon:right-panel-tab-change', { detail: { tab } }))
  }

  const openCycleBroadcasts = (cycleRunId: string) => {
    elonSelectCycleRun(cycleRunId)
    openRightTab('broadcasts')
  }

  const openCycleEvidence = (cycleRunId: string) => {
    elonSelectCycleRun(cycleRunId)
    const evidence = evidences.find((e) => {
      const data = e.data as { json?: { cycleId?: string } } | undefined
      return data?.json?.cycleId === cycleRunId
    })
    if (evidence?.id) {
      elonSelectEvidence(evidence.id)
    }
    openRightTab('evidence')
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 border-b border-black/5 px-3 py-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-black/50">Assignments</div>
        <div className="mt-0.5 text-[11px] text-black/45">Factory/CEO assignment decisions</div>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agent/cycle/reason..."
            className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] text-black/70 outline-none focus:border-black/20"
          />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as 'all' | 'factory' | 'ceo')}
            className="rounded-md border border-black/10 bg-white px-2 py-1 text-[11px] text-black/70"
          >
            <option value="all">all</option>
            <option value="factory">factory</option>
            <option value="ceo">ceo</option>
          </select>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          {filtered.length === 0 ? (
            <div className="p-4 text-xs text-black/45">No assignment decisions yet.</div>
          ) : (
            <div className="space-y-1.5 p-2">
              {filtered.map((d, idx) => {
                const employee = employeeMap.get(d.agentId)
                return (
                  <div key={`${d.cycleRunId}-${d.agentId}-${idx}`} className="rounded-lg border border-black/10 bg-white/70 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-xs font-semibold text-black/75">
                        {employee?.displayName ?? d.agentId}
                      </div>
                      <div
                        className={`rounded-full border px-1.5 py-0.5 text-[10px] ${
                          d.selectedBy === 'factory'
                            ? 'border-blue-200 bg-blue-50 text-blue-700'
                            : 'border-violet-200 bg-violet-50 text-violet-700'
                        }`}
                      >
                        {d.selectedBy}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-black/45">
                      <button
                        type="button"
                        className="rounded border border-black/10 px-1 py-0.5 text-[9px] text-blue-600 hover:bg-blue-50"
                        onClick={() => openCycleBroadcasts(d.cycleRunId)}
                        title="Open Broadcasts tab"
                      >
                        cycle {d.cycleRunId.slice(0, 8)}
                      </button>
                      <span>·</span>
                      <span>{formatAgo(d.at)} ago</span>
                      {employee?.status && (
                        <>
                          <span>·</span>
                          <span>{employee.status}</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        className="rounded border border-black/10 px-1.5 py-0.5 text-[9px] text-black/55 hover:bg-black/5"
                        onClick={() => openCycleBroadcasts(d.cycleRunId)}
                        title="Open broadcasts panel"
                      >
                        Broadcasts
                      </button>
                      <button
                        type="button"
                        className="rounded border border-black/10 px-1.5 py-0.5 text-[9px] text-black/55 hover:bg-black/5"
                        onClick={() => openCycleEvidence(d.cycleRunId)}
                        title="Open related cycle evidence"
                      >
                        Evidence
                      </button>
                      {cycleRunMap.get(d.cycleRunId) ? (
                        <span className="text-[9px] text-black/40">
                          {cycleRunMap.get(d.cycleRunId)?.status}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-black/60">{d.why}</div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  )
}
