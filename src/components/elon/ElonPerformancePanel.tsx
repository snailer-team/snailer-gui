import { useMemo, useState } from 'react'
import { ELON_AGENTS } from '../../lib/elonOrg'
import {
  type AgentPerformanceState,
  getRankColor,
  getRankIcon,
  getRankLabel,
  getPIPStatusColor,
  getPIPStatusLabel,
  createDemoPerformanceState,
  stackRankAgents,
  calculateOverallScore,
} from '../../lib/elonPerformance'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function getAgentName(agentId: string): string {
  const agent = ELON_AGENTS.find((a) => a.id === agentId)
  return agent?.title.split('/')[0].split('Agent')[0].trim() ?? agentId.toUpperCase()
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const percentage = (score / max) * 100
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-black/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage >= 80 ? 'bg-emerald-500' :
            percentage >= 60 ? 'bg-blue-500' :
            percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-black/50">{score}/{max}</span>
    </div>
  )
}

function PerformanceCard({
  agentId,
  state,
  stackRank,
  totalAgents,
  isSelected,
  onSelect,
}: {
  agentId: string
  state: AgentPerformanceState
  stackRank: number
  totalAgents: number
  isSelected: boolean
  onSelect: () => void
}) {
  const percentile = Math.round(((totalAgents - stackRank + 1) / totalAgents) * 100)
  const overallScore = calculateOverallScore(state.currentMetrics)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-3 text-left transition ${
        isSelected ? 'ring-2 ring-black/20 shadow-sm' : 'hover:bg-white/50'
      } ${getRankColor(state.currentRank)}`}
    >
      <div className="flex items-start gap-3">
        {/* Stack Rank */}
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
          stackRank <= 3 ? 'bg-emerald-500/20 text-emerald-700' :
          stackRank <= Math.ceil(totalAgents * 0.2) ? 'bg-blue-500/20 text-blue-700' :
          stackRank >= totalAgents - 2 ? 'bg-red-500/20 text-red-700' :
          'bg-black/5 text-black/50'
        }`}>
          #{stackRank}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{getAgentName(agentId)}</span>
            <span className="text-base">{getRankIcon(state.currentRank)}</span>
          </div>

          {/* Score & Percentile */}
          <div className="flex items-center gap-3 mt-1">
            <ScoreBar score={overallScore} />
            <span className="text-[10px] font-medium text-black/50">P{percentile}</span>
          </div>

          {/* PIP Status */}
          {state.pipStatus !== 'none' && (
            <div className={`mt-1.5 text-[10px] font-semibold ${getPIPStatusColor(state.pipStatus)}`}>
              {getPIPStatusLabel(state.pipStatus)}
              {state.pipProgress !== undefined && (
                <span className="ml-1 font-normal">({state.pipProgress}% progress)</span>
              )}
            </div>
          )}
        </div>

        {/* Metrics Summary */}
        <div className="shrink-0 text-right">
          <div className="text-[10px] text-black/40">Tasks</div>
          <div className="text-sm font-semibold text-black/70">
            {state.currentMetrics.tasksCompleted}
          </div>
          <div className="text-[9px] text-emerald-600 font-medium mt-0.5">
            {state.currentMetrics.highLeverageTasks} high leverage
          </div>
        </div>
      </div>
    </button>
  )
}

function AgentDetailView({ state }: { state: AgentPerformanceState }) {
  const m = state.currentMetrics
  const overallScore = calculateOverallScore(m)

  return (
    <div className="p-3 space-y-3 border-t border-black/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{getAgentName(state.agentId)}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getRankColor(state.currentRank)}`}>
          {getRankIcon(state.currentRank)} {getRankLabel(state.currentRank)}
        </span>
      </div>

      {/* CEO Feedback */}
      {state.lastCEOFeedback && (
        <div className={`rounded-lg p-2.5 border ${
          state.lastCEOFeedback.isWarRoom
            ? 'bg-red-500/10 border-red-500/20'
            : state.lastCEOFeedback.isPositive
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/20'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">👑</span>
            <span className="text-[10px] font-semibold text-black/60">CEO (Elon) Feedback</span>
            {state.lastCEOFeedback.isWarRoom && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white">WAR ROOM</span>
            )}
          </div>
          <div className="text-[11px] text-black/70 italic">"{state.lastCEOFeedback.message}"</div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/60 p-2">
          <div className="text-[9px] font-semibold text-black/40 uppercase">Impact</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-black/60">High Leverage</span>
            <span className="text-sm font-semibold text-emerald-600">{m.highLeverageTasks}</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-black/60">Bottlenecks Fixed</span>
            <span className="text-sm font-semibold text-blue-600">{m.bottlenecksResolved}</span>
          </div>
        </div>

        <div className="rounded-lg bg-white/60 p-2">
          <div className="text-[9px] font-semibold text-black/40 uppercase">Ownership</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-black/60">Self-Assigned</span>
            <span className="text-sm font-semibold text-violet-600">{m.selfAssignedTasks}</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-black/60">Autonomy</span>
            <span className="text-sm font-semibold text-black/70">{m.autonomyScore}%</span>
          </div>
        </div>

        <div className="rounded-lg bg-white/60 p-2">
          <div className="text-[9px] font-semibold text-black/40 uppercase">Iteration</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-black/60">Per Day</span>
            <span className={`text-sm font-semibold ${
              m.iterationsPerDay >= 5 ? 'text-emerald-600' :
              m.iterationsPerDay >= 2 ? 'text-blue-600' : 'text-amber-600'
            }`}>{m.iterationsPerDay}</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-black/60">Pass Rate</span>
            <span className="text-sm font-semibold text-black/70">{m.verificationPassRate}%</span>
          </div>
        </div>

        <div className="rounded-lg bg-white/60 p-2">
          <div className="text-[9px] font-semibold text-black/40 uppercase">Communication</div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-black/60">Feedback Given</span>
            <span className="text-sm font-semibold text-black/70">{m.feedbackGiven}</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-xs text-black/60">Meeting Efficiency</span>
            <span className="text-sm font-semibold text-black/70">{m.meetingEfficiency}%</span>
          </div>
        </div>
      </div>

      {/* Overall Score */}
      <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-blue-500/10 p-2.5 border border-violet-500/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-black/50">Overall Performance Score</span>
          <div className="flex items-center gap-2">
            <ScoreBar score={overallScore} />
          </div>
        </div>
      </div>

      {/* PIP Section */}
      {state.pipStatus !== 'none' && (
        <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm">⚠️</span>
            <span className={`text-[10px] font-semibold ${getPIPStatusColor(state.pipStatus)}`}>
              {getPIPStatusLabel(state.pipStatus)}
            </span>
          </div>
          <div className="text-[10px] text-black/60">
            Performance Improvement Plan active. 6 months to show improvement or face exit.
          </div>
          {state.pipProgress !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[9px] text-black/50 mb-1">
                <span>Progress toward goals</span>
                <span>{state.pipProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    state.pipProgress >= 70 ? 'bg-emerald-500' :
                    state.pipProgress >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${state.pipProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Streak & Warnings */}
      <div className="flex items-center gap-4 text-[10px]">
        {state.streakDays > 0 && (
          <div className="flex items-center gap-1 text-emerald-600">
            <span>🔥</span>
            <span>{state.streakDays} day streak</span>
          </div>
        )}
        {state.warningCount > 0 && (
          <div className="flex items-center gap-1 text-red-600">
            <span>⚠️</span>
            <span>{state.warningCount} warnings</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function ElonPerformancePanel() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // Generate demo performance data for all agents (except CEO)
  const performanceData = useMemo(() => {
    const map = new Map<string, AgentPerformanceState>()
    ELON_AGENTS.forEach((agent, index) => {
      if (agent.id !== 'ceo') {
        map.set(agent.id, createDemoPerformanceState(agent.id, index))
      }
    })
    return map
  }, [])

  const rankedAgents = useMemo(() => stackRankAgents(performanceData), [performanceData])

  const selectedState = selectedAgentId ? performanceData.get(selectedAgentId) : null

  // Stats summary
  const stats = useMemo(() => {
    const agents = Array.from(performanceData.values())
    const exceptional = agents.filter(a => a.currentRank === 'exceptional').length
    const lowPerformers = agents.filter(a => a.currentRank === 'low_performer').length
    const onPIP = agents.filter(a => a.pipStatus === 'active').length
    return { exceptional, lowPerformers, onPIP, total: agents.length }
  }, [performanceData])

  return (
    <div className="h-full flex flex-col rounded-2xl border border-black/10 bg-white/50">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <span className="text-sm font-semibold text-black/80">Stack Ranking</span>
          </div>
          <span className="text-[10px] text-black/40">Musk Performance System</span>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-emerald-600">🚀</span>
            <span className="text-[10px] font-semibold text-emerald-600">{stats.exceptional} Top</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-600">🔻</span>
            <span className="text-[10px] font-semibold text-red-600">{stats.lowPerformers} Low</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-amber-600">⚠️</span>
            <span className="text-[10px] font-semibold text-amber-600">{stats.onPIP} PIP</span>
          </div>
          <span className="text-[10px] text-black/40">of {stats.total} agents</span>
        </div>
      </div>

      {/* CEO Note */}
      <div className="shrink-0 px-4 py-2 border-b border-black/5 bg-gradient-to-r from-violet-500/5 to-amber-500/5">
        <div className="flex items-center gap-2">
          <span className="text-base">👑</span>
          <span className="text-[10px] font-semibold text-black/60">CEO (Elon Musk)</span>
          <span className="text-[10px] text-black/40">— Evaluator, not evaluated</span>
        </div>
        <div className="text-[10px] text-black/50 mt-0.5 italic">
          "If people kick ass, tell them right away. Lowest 3-5% go on PIP."
        </div>
      </div>

      {/* Agent List */}
      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          <div className="p-2 space-y-2">
            {rankedAgents.map(({ agentId, state, stackRank }) => (
              <PerformanceCard
                key={agentId}
                agentId={agentId}
                state={state}
                stackRank={stackRank}
                totalAgents={rankedAgents.length}
                isSelected={selectedAgentId === agentId}
                onSelect={() => setSelectedAgentId(agentId === selectedAgentId ? null : agentId)}
              />
            ))}
          </div>
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Selected Agent Detail */}
      {selectedState && <AgentDetailView state={selectedState} />}

      {/* Footer */}
      <div className="shrink-0 border-t border-black/5 px-4 py-2 bg-white/30">
        <div className="flex items-center gap-3 text-[9px] text-black/40">
          <span>Stack Rank:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/20 text-center text-[8px] font-bold text-emerald-700">T</span>
            Top 5%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-500/20 text-center text-[8px] font-bold text-blue-700">E</span>
            Top 20%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500/20 text-center text-[8px] font-bold text-red-700">L</span>
            Bottom 5%
          </span>
        </div>
      </div>
    </div>
  )
}
