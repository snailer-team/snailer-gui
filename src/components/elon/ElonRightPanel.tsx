import { useState, useMemo } from 'react'
import { BroadcastTimeline } from './BroadcastTimeline'
import { AgentInputRequestTimeline } from './AgentInputRequestTimeline'
import { SelfCorrectionPanel } from './SelfCorrectionPanel'
import { KnowledgeBasePanel } from './KnowledgeBasePanel'
import { MeetingSessionPanel } from './MeetingSessionPanel'

export function ElonRightPanel() {
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'evidence' | 'culture' | 'setup' | 'requests' | 'corrections' | 'knowledge' | 'meetings'>('broadcasts')
  const pendingRequestCount = useAppStore((s) => s.elonX.agentInputRequests.filter((r) => r.status === 'pending').length)

  return (
    <div className="h-full flex flex-col rounded-2xl border border-black/10 bg-white/50 overflow-hidden">
      {/* Tab Header */}
      <div
        className="shrink-0 flex items-center border-b border-black/5 px-2 pt-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('broadcasts')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'broadcasts'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>📢</span>
          Broadcasts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'requests'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>📋</span>
          Requests
          {pendingRequestCount > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
              {pendingRequestCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('corrections')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'corrections'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>🔄</span>
          Corrections
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('knowledge')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'knowledge'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>🧠</span>
          Knowledge
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'meetings'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>🤝</span>
          Meetings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('evidence')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'evidence'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>📊</span>
          Evidence
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('culture')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'culture'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>🚀</span>
          xAI Culture
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'setup'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>🔧</span>
          Setup
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'broadcasts' ? <BroadcastTimeline /> : null}
        {activeTab === 'requests' ? <AgentInputRequestTimeline /> : null}
        {activeTab === 'corrections' ? <SelfCorrectionPanel /> : null}
        {activeTab === 'knowledge' ? <KnowledgeBasePanel /> : null}
        {activeTab === 'meetings' ? <MeetingSessionPanel /> : null}
        {activeTab === 'evidence' ? <ElonEvidencePanelContent /> : null}
        {activeTab === 'culture' ? <ElonCulturePanelContent /> : null}
        {activeTab === 'setup' ? <ElonSetupPanelContent /> : null}
      </div>
    </div>
  )
}

// Internal components without their own borders
import { useAppStore } from '../../lib/store'
import {
  type Evidence,
  getVerdictColor,
  getVerdictIcon,
  getTypeIcon,
  formatTimestamp,
} from '../../lib/elonEvidence'
import { ELON_AGENTS } from '../../lib/elonOrg'
import { XAI_CULTURE, AGENT_DISCIPLINE, SWE_COLLAB_RULES, type CulturePrinciple } from '../../lib/xaiCulture'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'
import { ElonSetupPanelContent } from './ElonSetupPanel'

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
        <span className="text-base shrink-0">{getTypeIcon(evidence.type)}</span>
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

function ElonEvidencePanelContent() {
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

  const filterButtons: Array<{ key: typeof evidenceFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pass', label: 'Pass' },
    { key: 'fail', label: 'Fail' },
    { key: 'warning', label: 'Warn' },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Filter Bar */}
      <div className="shrink-0 flex items-center justify-end px-3 py-2 border-b border-black/5">
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
    </div>
  )
}

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
            {principle.id === 'swe-collaboration' && '🤝'}
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

function ElonCulturePanelContent() {
  const [expandedId, setExpandedId] = useState<string | null>('first-principles')
  const [activeSubTab, setActiveSubTab] = useState<'principles' | 'discipline'>('principles')

  return (
    <div className="h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-black/5">
        <button
          type="button"
          onClick={() => setActiveSubTab('principles')}
          className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition ${
            activeSubTab === 'principles'
              ? 'bg-black/10 text-black/80'
              : 'text-black/40 hover:bg-black/5'
          }`}
        >
          Principles
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('discipline')}
          className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition ${
            activeSubTab === 'discipline'
              ? 'bg-black/10 text-black/80'
              : 'text-black/40 hover:bg-black/5'
          }`}
        >
          Agent Discipline
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          <div className="p-3 space-y-2">
            {activeSubTab === 'principles' ? (
              <>
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
                <DisciplineSection
                  title="SWE Collaboration"
                  icon="🤝"
                  rules={[
                    ...SWE_COLLAB_RULES.ownership,
                    ...SWE_COLLAB_RULES.collaboration,
                    ...SWE_COLLAB_RULES.reviews,
                    ...SWE_COLLAB_RULES.warRoom,
                    ...SWE_COLLAB_RULES.safety,
                  ]}
                  color="text-slate-700"
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
          "No one tells me no" — xAI Culture
        </div>
      </div>
    </div>
  )
}
