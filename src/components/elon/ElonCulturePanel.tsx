import { useState } from 'react'
import { XAI_CULTURE, AGENT_DISCIPLINE, type CulturePrinciple } from '../../lib/xaiCulture'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function PrincipleCard({
  principle,
  expanded,
  onToggle,
}: {
  principle: CulturePrinciple
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/60 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-black/5 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">
            {principle.id === 'first-principles' && '🎯'}
            {principle.id === 'autonomy-ownership' && '⚡'}
            {principle.id === 'communication' && '💬'}
            {principle.id === 'iteration' && '🔄'}
            {principle.id === 'environment' && '🏠'}
            {principle.id === 'hiring' && '🌟'}
          </span>
          <span className="text-[11px] font-semibold text-black/70">{principle.title}</span>
        </div>
        <span className="text-[11px] text-black/40">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-[10px] text-black/50">{principle.description}</div>

          <div className="space-y-1">
            <div className="text-[9px] font-semibold text-black/40 uppercase tracking-wide">Enforcement</div>
            {principle.enforcement.map((rule, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-black/60">
                <span className="text-emerald-500 shrink-0">•</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>

          {principle.metrics && principle.metrics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {principle.metrics.map((metric, i) => (
                <span
                  key={i}
                  className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[9px] font-medium text-violet-600"
                >
                  {metric}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DisciplineSection({
  title,
  icon,
  rules,
  color,
}: {
  title: string
  icon: string
  rules: string[]
  color: string
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/60 p-2.5">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <span className={`text-[10px] font-semibold ${color}`}>{title}</span>
      </div>
      <div className="space-y-1">
        {rules.map((rule, i) => (
          <div key={i} className="flex items-start gap-1.5 text-[10px] text-black/60">
            <span className="text-black/30 shrink-0">{i + 1}.</span>
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ElonCulturePanel() {
  const [expandedId, setExpandedId] = useState<string | null>('first-principles')
  const [activeTab, setActiveTab] = useState<'principles' | 'discipline'>('principles')

  return (
    <div className="h-full flex flex-col rounded-2xl border border-black/10 bg-white/50">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <span className="text-sm font-semibold text-black/80">xAI Culture</span>
          </div>
          <span className="text-[10px] text-black/40">Company Discipline</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('principles')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition ${
              activeTab === 'principles'
                ? 'bg-black/10 text-black/80'
                : 'text-black/40 hover:bg-black/5'
            }`}
          >
            Principles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('discipline')}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition ${
              activeTab === 'discipline'
                ? 'bg-black/10 text-black/80'
                : 'text-black/40 hover:bg-black/5'
            }`}
          >
            Agent Discipline
          </button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          <div className="p-3 space-y-2">
            {activeTab === 'principles' ? (
              <>
                {/* Culture Principles */}
                {XAI_CULTURE.map((principle) => (
                  <PrincipleCard
                    key={principle.id}
                    principle={principle}
                    expanded={expandedId === principle.id}
                    onToggle={() => setExpandedId(expandedId === principle.id ? null : principle.id)}
                  />
                ))}
              </>
            ) : (
              <>
                {/* Agent Discipline Rules */}
                <DisciplineSection
                  title="Before Task"
                  icon="🎯"
                  rules={AGENT_DISCIPLINE.beforeTask}
                  color="text-blue-600"
                />
                <DisciplineSection
                  title="During Task"
                  icon="⚡"
                  rules={AGENT_DISCIPLINE.duringTask}
                  color="text-emerald-600"
                />
                <DisciplineSection
                  title="After Task"
                  icon="✓"
                  rules={AGENT_DISCIPLINE.afterTask}
                  color="text-violet-600"
                />
                <DisciplineSection
                  title="When Blocked"
                  icon="🚨"
                  rules={AGENT_DISCIPLINE.blocked}
                  color="text-red-600"
                />
                <DisciplineSection
                  title="Communication"
                  icon="💬"
                  rules={AGENT_DISCIPLINE.communication}
                  color="text-amber-600"
                />
              </>
            )}
          </div>
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Footer Quote */}
      <div className="shrink-0 border-t border-black/5 px-4 py-2 bg-gradient-to-r from-violet-500/5 to-blue-500/5">
        <div className="text-[10px] text-black/50 italic text-center">
          "No one tells me no" — xAI Engineer Culture
        </div>
      </div>
    </div>
  )
}
