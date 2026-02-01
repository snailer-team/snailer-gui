import { useMemo, useState } from 'react'
import { useAppStore, type ElonAgentStatus } from '../../lib/store'
import { ELON_AGENTS, ELON_CATEGORIES, type ElonAgent, type ElonControl, type AutonomyLevel, type TriadRole } from '../../lib/elonOrg'
import { getRandomStatusMessage } from '../../lib/xaiCulture'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function controlLabel(c: ElonControl) {
  const labels: Record<ElonControl, string> = {
    browser: 'Browser',
    terminal: 'Terminal',
    db: 'DB',
    api: 'API',
    repo: 'Repo',
    vm: 'VM',
    cursor: 'Cursor',
    analytics: 'Analytics',
    payments: 'Payments',
    figma: 'Figma',
    photoshop: 'Photoshop',
    illustrator: 'Illustrator',
    aftereffects: 'After Effects',
  }
  return labels[c]
}

function controlColor(c: ElonControl) {
  const colors: Record<ElonControl, string> = {
    browser: 'bg-sky-500/10 text-sky-900 border-sky-500/15',
    terminal: 'bg-neutral-900/5 text-neutral-900 border-black/10',
    db: 'bg-emerald-500/10 text-emerald-900 border-emerald-500/15',
    api: 'bg-indigo-500/10 text-indigo-900 border-indigo-500/15',
    repo: 'bg-amber-500/10 text-amber-900 border-amber-500/15',
    vm: 'bg-violet-500/10 text-violet-900 border-violet-500/15',
    cursor: 'bg-pink-500/10 text-pink-900 border-pink-500/15',
    analytics: 'bg-cyan-500/10 text-cyan-900 border-cyan-500/15',
    payments: 'bg-lime-500/10 text-lime-900 border-lime-500/15',
    figma: 'bg-orange-500/10 text-orange-900 border-orange-500/15',
    photoshop: 'bg-blue-500/10 text-blue-900 border-blue-500/15',
    illustrator: 'bg-amber-500/10 text-amber-900 border-amber-500/15',
    aftereffects: 'bg-violet-500/10 text-violet-900 border-violet-500/15',
  }
  return colors[c]
}

function autonomyColor(level: AutonomyLevel): string {
  const colors: Record<AutonomyLevel, string> = {
    full: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/20',
    high: 'bg-blue-500/15 text-blue-700 border-blue-500/20',
    medium: 'bg-amber-500/15 text-amber-700 border-amber-500/20',
    supervised: 'bg-red-500/15 text-red-700 border-red-500/20',
  }
  return colors[level]
}

function triadIcon(role?: TriadRole): string {
  if (!role) return ''
  const icons: Record<TriadRole, string> = {
    pm: '📋',
    designer: '🎨',
    engineer: '⚙️',
    lead: '👑',
    analyst: '📊',
    ops: '🔧',
  }
  return icons[role]
}

function statusIcon(status: ElonAgentStatus): string {
  const icons: Record<ElonAgentStatus, string> = {
    idle: '○',
    observing: '👁',
    planning: '📋',
    acting: '▶',
    evaluating: '✓',
    blocked: '⚠',
  }
  return icons[status]
}

function statusColor(status: ElonAgentStatus): string {
  const colors: Record<ElonAgentStatus, string> = {
    idle: 'text-black/40 bg-black/5 border-black/10',
    observing: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
    planning: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
    acting: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 animate-pulse',
    evaluating: 'text-violet-600 bg-violet-500/10 border-violet-500/20',
    blocked: 'text-red-600 bg-red-500/10 border-red-500/20',
  }
  return colors[status]
}

function statusLabel(status: ElonAgentStatus): string {
  const labels: Record<ElonAgentStatus, string> = {
    idle: 'idle',
    observing: 'observing',
    planning: 'planning',
    acting: 'acting',
    evaluating: 'evaluating',
    blocked: 'blocked',
  }
  return labels[status]
}

function AgentRow({
  agent,
  agentState,
  active,
  onSelect,
}: {
  agent: ElonAgent
  agentState?: { status: ElonAgentStatus; currentTask?: string }
  active: boolean
  onSelect: () => void
}) {
  const status = agentState?.status ?? 'idle'
  const isCEO = agent.id === 'ceo'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full rounded-xl border px-2.5 py-2 text-left transition',
        active
          ? 'border-black/15 bg-white shadow-sm'
          : 'border-black/10 bg-white/60 hover:bg-white hover:border-black/15',
        isCEO ? 'ring-1 ring-amber-500/30' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2">
        {/* Agent Name & Status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {agent.triadRole && (
              <span className="shrink-0 text-[10px]" title={agent.triadRole}>
                {triadIcon(agent.triadRole)}
              </span>
            )}
            <span className="truncate text-[11px] font-semibold text-black/80 max-w-[90px]">
              {agent.title.split('/')[0].split('Agent')[0].trim()}
            </span>
            {isCEO && (
              <span className="shrink-0 rounded-full bg-amber-500/20 px-1 py-0.5 text-[7px] font-bold text-amber-700">
                ELON
              </span>
            )}
            <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold ${statusColor(status)}`}>
              {statusIcon(status)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className={`shrink-0 rounded-full border px-1 py-0.5 text-[7px] font-semibold ${autonomyColor(agent.autonomyLevel)}`}>
              {agent.autonomyLevel}
            </span>
            <span className="text-[9px] text-black/40">{agent.iterationCycle}</span>
          </div>
          {status !== 'idle' && (
            <div className="mt-0.5 truncate text-[10px] text-black/50 italic">
              {agentState?.currentTask || getRandomStatusMessage(status as 'observing' | 'planning' | 'acting' | 'evaluating' | 'blocked')}
            </div>
          )}
        </div>
        {/* Controls */}
        <div className="shrink-0 flex flex-wrap justify-end gap-0.5">
          {agent.controls.slice(0, 2).map((c) => (
            <span
              key={c}
              className={['rounded-full border px-1.5 py-0.5 text-[8px] font-semibold', controlColor(c)].join(' ')}
            >
              {controlLabel(c)}
            </span>
          ))}
          {agent.controls.length > 2 && (
            <span className="rounded-full border border-black/10 bg-white/50 px-1 py-0.5 text-[8px] font-semibold text-black/45">
              +{agent.controls.length - 2}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

export function ElonOrgPanelContent() {
  const { elonX } = useAppStore()
  const { agentStatuses } = elonX

  const [selectedId, setSelectedId] = useState<string>(() => ELON_AGENTS[0]?.id ?? 'ceo')
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ELON_CATEGORIES.map((c) => [c, c === 'Leadership' || c === 'Engineering'])),
  )

  const selected = useMemo(() => ELON_AGENTS.find((a) => a.id === selectedId) ?? ELON_AGENTS[0], [selectedId])
  const selectedState = agentStatuses[selectedId]

  const grouped = useMemo(() => {
    const m = new Map<string, ElonAgent[]>()
    for (const c of ELON_CATEGORIES) m.set(c, [])
    for (const a of ELON_AGENTS) m.get(a.category)?.push(a)
    return m
  }, [])

  // Count active agents per category
  const activeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const cat of ELON_CATEGORIES) {
      const agents = grouped.get(cat) ?? []
      counts[cat] = agents.filter((a) => {
        const state = agentStatuses[a.id]
        return state && state.status !== 'idle'
      }).length
    }
    return counts
  }, [grouped, agentStatuses])

  return (
    <div className="h-full flex flex-col">
      {/* Header Stats */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-black/5">
        <span className="text-[10px] text-black/40">
          {Object.values(agentStatuses).filter((s) => s.status !== 'idle').length} active
        </span>
        <span className="text-[10px] text-black/40">
          {ELON_AGENTS.length} total
        </span>
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-[1fr_auto]">
        {/* Agent List */}
        <ScrollArea className="min-h-0">
          <ScrollAreaViewport className="h-full">
            <div className="p-2 space-y-2">
              {ELON_CATEGORIES.map((cat) => {
                const open = openCats[cat] ?? false
                const agents = grouped.get(cat) ?? []
                const activeCount = activeCounts[cat] ?? 0

                return (
                  <div key={cat} className="rounded-xl border border-black/10 bg-white/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenCats((s) => ({ ...s, [cat]: !open }))}
                      className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-black/5 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold tracking-wide text-black/60">{cat}</span>
                        {activeCount > 0 && (
                          <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600">
                            {activeCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-black/40">{open ? '▾' : '▸'}</span>
                    </button>
                    {open && (
                      <div className="space-y-1 px-2 pb-2">
                        {agents.map((a) => (
                          <AgentRow
                            key={a.id}
                            agent={a}
                            agentState={agentStatuses[a.id]}
                            active={a.id === selectedId}
                            onSelect={() => setSelectedId(a.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollAreaViewport>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* Selected Agent Details */}
        {selected && (
          <div className="shrink-0 border-t border-black/5 p-3 bg-white/30 max-h-[280px] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                {selected.triadRole && (
                  <span className="text-sm">{triadIcon(selected.triadRole)}</span>
                )}
                <span className="text-xs font-semibold text-black/70">{selected.title}</span>
                {selected.id === 'ceo' && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">
                    ELON
                  </span>
                )}
              </div>
              {selectedState && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor(selectedState.status)}`}>
                  {statusIcon(selectedState.status)} {statusLabel(selectedState.status)}
                </span>
              )}
            </div>
            <div className="text-[11px] text-black/50 mb-2">{selected.subtitle}</div>

            {/* CEO Special Note */}
            {selected.id === 'ceo' && (
              <div className="mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1.5 text-[10px] text-amber-700">
                <span className="font-semibold">CEO = Elon Musk:</span> Evaluates all agents. Not subject to stack ranking.
                "If people kick ass, tell them right away."
              </div>
            )}

            {/* Autonomy & Cycle */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${autonomyColor(selected.autonomyLevel)}`}>
                {selected.autonomyLevel} autonomy
              </span>
              <span className="rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-[9px] font-semibold text-black/60">
                {selected.iterationCycle} cycle
              </span>
            </div>

            {/* Controls */}
            <div className="mb-2">
              <div className="text-[9px] font-semibold text-black/40 mb-1">CONTROLS</div>
              <div className="flex flex-wrap gap-1">
                {selected.controls.map((c) => (
                  <span
                    key={c}
                    className={['rounded-full border px-2 py-0.5 text-[9px] font-semibold', controlColor(c)].join(' ')}
                  >
                    {controlLabel(c)}
                  </span>
                ))}
              </div>
            </div>

            {/* First Principles */}
            {selected.firstPrinciples && selected.firstPrinciples.length > 0 && (
              <div className="mb-2">
                <div className="text-[9px] font-semibold text-black/40 mb-1">FIRST PRINCIPLES</div>
                <div className="space-y-0.5">
                  {selected.firstPrinciples.map((fp, i) => (
                    <div key={i} className="text-[10px] text-black/60 flex items-start gap-1">
                      <span className="text-amber-500">•</span>
                      <span>{fp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ownership */}
            {selected.ownership && selected.ownership.length > 0 && (
              <div className="mb-2">
                <div className="text-[9px] font-semibold text-black/40 mb-1">OWNERSHIP</div>
                <div className="flex flex-wrap gap-1">
                  {selected.ownership.map((o, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-700"
                    >
                      {o}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Current Task */}
            {selectedState?.currentTask && (
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-2 py-1.5 text-[11px] text-blue-700">
                <span className="font-semibold">Active:</span> {selectedState.currentTask}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
