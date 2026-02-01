import { useMemo, useState } from 'react'

import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'
import { ELON_AGENTS, ELON_CATEGORIES, type ElonAgent, type ElonControl } from '../lib/elonOrg'
import { useAppStore } from '../lib/store'

function controlLabel(c: ElonControl) {
  switch (c) {
    case 'browser':
      return 'Browser'
    case 'terminal':
      return 'Terminal'
    case 'db':
      return 'DB'
    case 'api':
      return 'API'
    case 'repo':
      return 'Repo'
    case 'vm':
      return 'VM'
    case 'cursor':
      return 'Cursor'
    case 'analytics':
      return 'Analytics'
    case 'payments':
      return 'Payments'
    case 'figma':
      return 'Figma'
    case 'photoshop':
      return 'Photoshop'
    case 'illustrator':
      return 'Illustrator'
    case 'aftereffects':
      return 'After Effects'
  }
}

function controlColor(c: ElonControl) {
  switch (c) {
    case 'browser':
      return 'bg-sky-500/10 text-sky-900 border-sky-500/15'
    case 'terminal':
      return 'bg-neutral-900/5 text-neutral-900 border-black/10'
    case 'db':
      return 'bg-emerald-500/10 text-emerald-900 border-emerald-500/15'
    case 'api':
      return 'bg-indigo-500/10 text-indigo-900 border-indigo-500/15'
    case 'repo':
      return 'bg-amber-500/10 text-amber-900 border-amber-500/15'
    case 'vm':
      return 'bg-violet-500/10 text-violet-900 border-violet-500/15'
    case 'cursor':
      return 'bg-pink-500/10 text-pink-900 border-pink-500/15'
    case 'analytics':
      return 'bg-cyan-500/10 text-cyan-900 border-cyan-500/15'
    case 'payments':
      return 'bg-lime-500/10 text-lime-900 border-lime-500/15'
    case 'figma':
      return 'bg-orange-500/10 text-orange-900 border-orange-500/15'
    case 'photoshop':
      return 'bg-blue-500/10 text-blue-900 border-blue-500/15'
    case 'illustrator':
      return 'bg-amber-500/10 text-amber-900 border-amber-500/15'
    case 'aftereffects':
      return 'bg-violet-500/10 text-violet-900 border-violet-500/15'
  }
}

function StagePill({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={[
        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
        active ? 'border-black/15 bg-black/5 text-black/80' : 'border-black/10 bg-white/50 text-black/45',
      ].join(' ')}
    >
      {label}
    </div>
  )
}

function AgentRow({
  agent,
  active,
  onSelect,
}: {
  agent: ElonAgent
  active: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full rounded-2xl border px-3 py-2 text-left transition',
        active
          ? 'border-black/15 bg-white shadow-sm'
          : 'border-black/10 bg-white/60 hover:bg-white hover:border-black/15',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-black/80">{agent.title}</div>
          <div className="mt-0.5 truncate text-xs text-black/45">{agent.subtitle}</div>
        </div>
        <div className="shrink-0 flex flex-wrap justify-end gap-1">
          {agent.controls.slice(0, 3).map((c) => (
            <span
              key={c}
              className={['rounded-full border px-2 py-0.5 text-[10px] font-semibold', controlColor(c)].join(' ')}
            >
              {controlLabel(c)}
            </span>
          ))}
          {agent.controls.length > 3 ? (
            <span className="rounded-full border border-black/10 bg-white/50 px-2 py-0.5 text-[10px] font-semibold text-black/45">
              +{agent.controls.length - 3}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}

export function ElonOrgPanel() {
  const { currentRunStatus } = useAppStore()
  const [selectedId, setSelectedId] = useState<string>(() => ELON_AGENTS[0]?.id ?? 'ceo')
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ELON_CATEGORIES.map((c) => [c, c === 'Leadership'])),
  )

  const selected = useMemo(() => ELON_AGENTS.find((a) => a.id === selectedId) ?? ELON_AGENTS[0], [selectedId])

  const loopStage = useMemo<'Observe' | 'Plan' | 'Act' | 'Evaluate'>(() => {
    if (currentRunStatus === 'running' || currentRunStatus === 'queued' || currentRunStatus === 'awaiting_approval')
      return 'Act'
    if (currentRunStatus === 'completed') return 'Evaluate'
    return 'Plan'
  }, [currentRunStatus])

  const grouped = useMemo(() => {
    const m = new Map<string, ElonAgent[]>()
    for (const c of ELON_CATEGORIES) m.set(c, [])
    for (const a of ELON_AGENTS) m.get(a.category)?.push(a)
    return m
  }, [])

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-1 py-2">
        <div className="text-sm font-semibold text-black/80">Org (ElonX HARD)</div>
        <div className="flex items-center gap-1.5">
          <StagePill label="Observe" active={loopStage === 'Observe'} />
          <StagePill label="Plan" active={loopStage === 'Plan'} />
          <StagePill label="Act" active={loopStage === 'Act'} />
          <StagePill label="Evaluate" active={loopStage === 'Evaluate'} />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1.25fr_1fr]">
        {/* Left: roster */}
        <div className="min-h-0 rounded-2xl border border-black/10 bg-white/50 p-2">
          <ScrollArea className="h-full">
            <ScrollAreaViewport className="h-full">
              <div className="space-y-3 p-1">
                {ELON_CATEGORIES.map((cat) => {
                  const open = openCats[cat] ?? true
                  const agents = grouped.get(cat) ?? []
                  return (
                    <div key={cat} className="rounded-2xl border border-black/10 bg-white/60">
                      <button
                        type="button"
                        onClick={() => setOpenCats((s) => ({ ...s, [cat]: !open }))}
                        className="flex w-full items-center justify-between px-3 py-2 text-left"
                      >
                        <div className="text-xs font-semibold tracking-wide text-black/60">{cat}</div>
                        <div className="text-[11px] font-medium text-black/40">{open ? 'Hide' : 'Show'}</div>
                      </button>
                      {!open ? null : (
                        <div className="space-y-2 px-2 pb-2">
                          {agents.map((a) => (
                            <AgentRow
                              key={a.id}
                              agent={a}
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
        </div>

        {/* Right: details */}
        <div className="min-h-0 rounded-2xl border border-black/10 bg-white/50 p-4">
          {!selected ? null : (
            <div className="h-full min-h-0 flex flex-col">
              <div className="min-w-0">
                <div className="text-base font-semibold tracking-tight text-black/85">{selected.title}</div>
                <div className="mt-1 text-xs text-black/50">{selected.subtitle}</div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-black/45">Controls</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.controls.map((c) => (
                    <span
                      key={c}
                      className={['rounded-full border px-2.5 py-1 text-[11px] font-semibold', controlColor(c)].join(
                        ' ',
                      )}
                      title="Required control"
                    >
                      {controlLabel(c)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-black/45">Loop</div>
                <div className="mt-2 space-y-1 text-[12px] text-black/70">
                  {selected.loop.map((l) => (
                    <div key={l} className="rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5">
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex-1 min-h-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-black/45">Snailer Notes</div>
                <div className="mt-2 space-y-1 text-[12px] text-black/65">
                  {selected.snailerNotes.map((n) => (
                    <div key={n} className="rounded-lg border border-black/10 bg-white/60 px-2.5 py-1.5">
                      {n}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 text-[11px] text-black/35">
                UI-only in v0: permissions are informational; execution wiring comes next.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
