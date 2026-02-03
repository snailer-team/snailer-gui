import { useMemo, useState } from 'react'
import { useAppStore, type Broadcast, type CycleRun, type ElonAgentStatus, type AgentActivityLog } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

function getStatusIcon(status: ElonAgentStatus): string {
  switch (status) {
    case 'observing': return '👁'
    case 'planning': return '📋'
    case 'acting': return '⚡'
    case 'evaluating': return '✓'
    case 'blocked': return '🚫'
    case 'idle': return '💤'
  }
}

function getStatusColor(status: ElonAgentStatus): string {
  switch (status) {
    case 'observing': return 'text-blue-600 bg-blue-500/10 border-blue-500/20'
    case 'planning': return 'text-amber-600 bg-amber-500/10 border-amber-500/20'
    case 'acting': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
    case 'evaluating': return 'text-violet-600 bg-violet-500/10 border-violet-500/20'
    case 'blocked': return 'text-red-600 bg-red-500/10 border-red-500/20'
    case 'idle': return 'text-black/40 bg-black/5 border-black/10'
  }
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  if (seconds > 10) return `${seconds}s ago`
  return 'just now'
}

function getLogIcon(type: AgentActivityLog['type']): string {
  switch (type) {
    case 'thinking': return '🧠'
    case 'action': return '⚡'
    case 'ceo_feedback': return '👔'
    case 'error': return '❌'
    case 'success': return '✅'
    case 'github': return '🔗'
  }
}

function getLogColor(type: AgentActivityLog['type']): string {
  switch (type) {
    case 'thinking': return 'text-blue-600'
    case 'action': return 'text-amber-600'
    case 'ceo_feedback': return 'text-violet-600'
    case 'error': return 'text-red-600'
    case 'success': return 'text-emerald-600'
    case 'github': return 'text-purple-600'
  }
}

function AgentCard({
  agentId,
  status,
  currentTask,
  startedAt,
  activeBroadcast,
  liveActivity,
  activityLogs,
  ceoFeedback,
}: {
  agentId: string
  status: ElonAgentStatus
  currentTask?: string
  startedAt?: number
  activeBroadcast?: Broadcast
  liveActivity?: string
  activityLogs?: AgentActivityLog[]
  ceoFeedback?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const recentLogs = activityLogs?.slice(0, 5) || []

  return (
    <div className={`rounded-xl border p-3 ${getStatusColor(status)} transition-all`}>
      <div className="flex items-start gap-2">
        {/* Status icon */}
        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base bg-white/50">
          {getStatusIcon(status)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Agent ID & Status */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs uppercase tracking-wide">
              {agentId}
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/50 font-medium">
              {status}
            </span>
            {recentLogs.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-black/10 hover:bg-black/20 transition"
              >
                {expanded ? '▼' : '▶'} {recentLogs.length} logs
              </button>
            )}
          </div>

          {/* Current Task */}
          {currentTask && (
            <div className="text-[11px] mt-1 opacity-80 line-clamp-2">
              {currentTask}
            </div>
          )}

          {/* Broadcast info */}
          {activeBroadcast && (
            <div className="mt-2 text-[10px] opacity-60">
              <span className="font-medium">Why:</span> {activeBroadcast.why}
            </div>
          )}

          {/* CEO Feedback - prominently displayed */}
          {ceoFeedback && (
            <div className="mt-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center gap-1 text-[9px] font-medium text-violet-600">
                <span>👔</span> CEO Feedback
              </div>
              <div className="mt-0.5 text-[10px] text-violet-800">{ceoFeedback}</div>
            </div>
          )}

          {/* Live Activity - real-time status */}
          {liveActivity && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-600 font-medium">
              <span className="animate-pulse">●</span>
              <span className="truncate">{liveActivity}</span>
            </div>
          )}

          {/* Activity Logs - expandable */}
          {expanded && recentLogs.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-black/10 pt-2">
              <div className="text-[9px] font-medium opacity-50 uppercase">Activity Log</div>
              {recentLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[10px]">
                  <span>{getLogIcon(log.type)}</span>
                  <div className="flex-1 min-w-0">
                    <span className={getLogColor(log.type)}>{log.message}</span>
                    {log.detail && (
                      <div className="text-[9px] opacity-50 truncate">{log.detail}</div>
                    )}
                  </div>
                  <span className="text-[8px] opacity-40 shrink-0">
                    {formatTimeAgo(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Started time */}
          {startedAt && (
            <div className="mt-1 text-[9px] opacity-50">
              Started {formatTimeAgo(startedAt)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CycleRunCard({ run }: { run: CycleRun }) {
  const statusColors: Record<CycleRun['status'], string> = {
    running: 'border-blue-500/30 bg-blue-500/5',
    completed: 'border-emerald-500/30 bg-emerald-500/5',
    failed: 'border-red-500/30 bg-red-500/5',
    aborted: 'border-black/20 bg-black/5',
  }

  const statusIcons: Record<CycleRun['status'], string> = {
    running: '⏳',
    completed: '✓',
    failed: '✗',
    aborted: '⏹',
  }

  return (
    <div className={`rounded-lg border p-2 ${statusColors[run.status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{statusIcons[run.status]}</span>
          <span className="text-[10px] font-medium text-black/70">
            Cycle {run.id.slice(0, 8)}
          </span>
        </div>
        <span className="text-[9px] text-black/50">
          {formatTimeAgo(run.startedAt)}
        </span>
      </div>

      {run.llmOutput && (
        <div className="mt-1.5 text-[10px] text-black/60 line-clamp-2">
          {run.llmOutput.cycleSummary}
        </div>
      )}

      {run.errorMessage && (
        <div className="mt-1.5 text-[10px] text-red-600">
          {run.errorMessage}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-2 text-[9px] text-black/40">
        <span>{run.broadcastIds.length} broadcasts</span>
        {run.endedAt && (
          <>
            <span>·</span>
            <span>{Math.round((run.endedAt - run.startedAt) / 1000)}s</span>
          </>
        )}
      </div>
    </div>
  )
}

export function ElonWorkflowPanel() {
  const { elonX, autoCycleRunNow } = useAppStore()
  const { agentStatuses, broadcasts, cycleRuns, autoCycle } = elonX

  // Get active broadcasts by agent
  const activeBroadcastsByAgent = useMemo(() => {
    const map = new Map<string, Broadcast>()
    broadcasts
      .filter(b => b.status === 'active')
      .forEach(b => {
        b.toAgentIds.forEach(agentId => {
          if (!map.has(agentId)) {
            map.set(agentId, b)
          }
        })
      })
    return map
  }, [broadcasts])

  // Get agents with activity (from broadcasts or statuses)
  const activeAgents = useMemo(() => {
    const agentIds = new Set<string>()

    // From agent statuses
    Object.keys(agentStatuses).forEach(id => agentIds.add(id))

    // From active broadcasts
    broadcasts
      .filter(b => b.status === 'active')
      .forEach(b => b.toAgentIds.forEach(id => agentIds.add(id)))

    return Array.from(agentIds).map(id => ({
      id,
      status: agentStatuses[id]?.status || 'idle' as ElonAgentStatus,
      currentTask: agentStatuses[id]?.currentTask,
      startedAt: agentStatuses[id]?.startedAt,
      activeBroadcast: activeBroadcastsByAgent.get(id),
      liveActivity: agentStatuses[id]?.liveActivity,
      activityLogs: agentStatuses[id]?.activityLogs,
      ceoFeedback: agentStatuses[id]?.ceoFeedback,
    }))
  }, [agentStatuses, broadcasts, activeBroadcastsByAgent])

  // Stats
  const stats = useMemo(() => {
    const acting = activeAgents.filter(a => a.status === 'acting').length
    const planning = activeAgents.filter(a => a.status === 'planning').length
    const observing = activeAgents.filter(a => a.status === 'observing').length
    const blocked = activeAgents.filter(a => a.status === 'blocked').length
    return { acting, planning, observing, blocked, total: activeAgents.length }
  }, [activeAgents])

  const recentCycles = cycleRuns.slice(0, 10)
  const isRunning = autoCycle.status === 'running'

  return (
    <div className="h-full flex flex-col rounded-2xl border border-black/10 bg-white/50 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <span className="text-sm font-semibold text-black/80">Live Workflows</span>
            {isRunning && (
              <span className="animate-pulse text-[10px] text-blue-600 font-medium">
                ● Running
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void autoCycleRunNow()}
              disabled={isRunning}
              className="rounded-lg px-2.5 py-1 text-[10px] font-semibold bg-black text-white hover:bg-black/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ▶ Run Cycle
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-2">
          {stats.acting > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-emerald-600">⚡</span>
              <span className="text-[10px] font-semibold text-emerald-600">{stats.acting} acting</span>
            </div>
          )}
          {stats.planning > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-amber-600">📋</span>
              <span className="text-[10px] font-semibold text-amber-600">{stats.planning} planning</span>
            </div>
          )}
          {stats.observing > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-blue-600">👁</span>
              <span className="text-[10px] font-semibold text-blue-600">{stats.observing} observing</span>
            </div>
          )}
          {stats.blocked > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-red-600">🚫</span>
              <span className="text-[10px] font-semibold text-red-600">{stats.blocked} blocked</span>
            </div>
          )}
          <span className="text-[10px] text-black/40">| {cycleRuns.length} cycles total</span>
        </div>
      </div>

      {/* Main Content: Split View */}
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_220px] gap-2 p-2">
        {/* Agent List */}
        <ScrollArea className="min-h-0">
          <ScrollAreaViewport className="h-full">
            {activeAgents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="text-3xl mb-3 opacity-30">🤖</div>
                <div className="text-sm font-medium text-black/40">No active agents</div>
                <div className="text-xs text-black/30 mt-1">
                  Run a CEO cycle to assign work to agents
                </div>
                <button
                  type="button"
                  onClick={() => void autoCycleRunNow()}
                  disabled={isRunning}
                  className="mt-4 rounded-lg px-3 py-1.5 text-xs font-medium bg-black text-white hover:bg-black/80 transition disabled:opacity-40"
                >
                  Run Cycle Now
                </button>
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {activeAgents.map(agent => (
                  <AgentCard
                    key={agent.id}
                    agentId={agent.id}
                    status={agent.status}
                    currentTask={agent.currentTask}
                    startedAt={agent.startedAt}
                    activeBroadcast={agent.activeBroadcast}
                    liveActivity={agent.liveActivity}
                    activityLogs={agent.activityLogs}
                    ceoFeedback={agent.ceoFeedback}
                  />
                ))}
              </div>
            )}
          </ScrollAreaViewport>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* Cycle History */}
        <div className="flex flex-col rounded-xl border border-black/10 bg-white/40 overflow-hidden">
          <div className="shrink-0 px-2 py-1.5 border-b border-black/5 bg-white/50">
            <div className="flex items-center gap-1">
              <span className="text-xs">📜</span>
              <span className="text-[10px] font-semibold text-black/60">Cycle History</span>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <ScrollAreaViewport className="h-full">
              <div className="p-1.5 space-y-1.5">
                {recentCycles.length === 0 ? (
                  <div className="text-center py-4 text-[10px] text-black/40">
                    No cycles yet
                  </div>
                ) : (
                  recentCycles.map(run => (
                    <CycleRunCard key={run.id} run={run} />
                  ))
                )}
              </div>
            </ScrollAreaViewport>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
