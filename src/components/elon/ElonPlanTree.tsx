import { useMemo, useState, useEffect } from 'react'
import { useAppStore } from '../../lib/store'
import { type PlanNode, type RiskLevel, getStatusIcon, getStatusColor, findBottleneck, calculateProgress, countNodes } from '../../lib/elonPlan'
import { ELON_AGENTS } from '../../lib/elonOrg'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

// ==================== Helper Functions ====================

function getAgentInfo(assignee: string) {
  const agent = ELON_AGENTS.find((a) => a.id === assignee)
  return {
    name: agent?.title.split('/')[0].split('Agent')[0].trim() ?? assignee.toUpperCase(),
    category: agent?.category ?? 'Unknown',
    autonomyLevel: agent?.autonomyLevel ?? 'medium',
    iterationCycle: agent?.iterationCycle ?? '24h',
    triadRole: agent?.triadRole,
  }
}

function getAutonomyIcon(level: string): string {
  switch (level) {
    case 'full':
      return '⚡'
    case 'high':
      return '●'
    case 'medium':
      return '◐'
    case 'supervised':
      return '○'
    default:
      return '○'
  }
}

function getTriadIcon(role?: string): string {
  if (!role) return ''
  const icons: Record<string, string> = {
    pm: '📋',
    designer: '🎨',
    engineer: '⚙️',
    lead: '👑',
    analyst: '📊',
    ops: '🔧',
  }
  return icons[role] ?? ''
}

function getRiskColor(risk?: RiskLevel): string {
  if (!risk) return 'bg-black/5 text-black/40 border-black/10'
  switch (risk) {
    case 'low':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
    case 'high':
      return 'bg-red-500/10 text-red-700 border-red-500/20'
  }
}

function getRiskLabel(risk?: RiskLevel): string {
  if (!risk) return '-'
  return risk.charAt(0).toUpperCase()
}

// ==================== Sub Components ====================

function ElapsedTime({ startedAt }: { startedAt?: number }) {
  const [nowMs, setNowMs] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    setNowMs(Date.now())
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  if (!startedAt || !nowMs) return null
  const elapsed = Math.floor((nowMs - startedAt) / 1000)
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return (
    <span className="text-[10px] text-black/40 tabular-nums font-mono">
      {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
    </span>
  )
}

function ProgressMini({ progress }: { progress?: number }) {
  if (progress === undefined) return null
  return (
    <div className="w-12 h-1 rounded-full bg-black/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-blue-500 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

function ToolsPopover({ tools }: { tools?: PlanNode['toolsUsed'] }) {
  const [open, setOpen] = useState(false)
  if (!tools || tools.length === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }}
        className="rounded-md border border-black/10 bg-white/60 px-1.5 py-0.5 text-[9px] font-medium text-black/50 hover:bg-white"
      >
        🔧 {tools.length}
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-64 rounded-xl border border-black/10 bg-white p-2 shadow-lg">
          <div className="text-[10px] font-semibold text-black/60 mb-1">Tools Used</div>
          <div className="space-y-1 max-h-32 overflow-auto">
            {tools.map((t, i) => (
              <div key={i} className="rounded-lg bg-black/5 px-2 py-1 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-black/70">{t.tool}</span>
                  {t.command && <span className="text-black/40 truncate">· {t.command}</span>}
                </div>
                {t.output && <div className="text-black/40 truncate mt-0.5">{t.output}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ReasoningTooltip({ reasoning }: { reasoning?: string }) {
  const [show, setShow] = useState(false)
  if (!reasoning) return null

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => e.stopPropagation()}
        className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-medium text-violet-600 hover:bg-violet-500/20"
      >
        💡
      </button>
      {show && (
        <div className="absolute left-0 top-6 z-50 w-56 rounded-xl border border-violet-500/20 bg-white p-2 shadow-lg">
          <div className="text-[10px] font-semibold text-violet-600 mb-1">First Principles</div>
          <div className="text-[10px] text-black/60 leading-relaxed">{reasoning}</div>
        </div>
      )}
    </div>
  )
}

// ==================== Plan Node Row ====================

function PlanNodeRow({
  node,
  level,
  selectedId,
  bottleneckId,
  searchQuery,
  onSelect,
  onRetry,
  onSkip,
}: {
  node: PlanNode
  level: number
  selectedId: string | null
  bottleneckId: string | null
  searchQuery: string
  onSelect: (id: string) => void
  onRetry: (id: string) => void
  onSkip: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasChildren = node.children.length > 0
  const isSelected = selectedId === node.id
  const isBottleneck = bottleneckId === node.id
  const matchesSearch = searchQuery && node.title.toLowerCase().includes(searchQuery.toLowerCase())
  const agent = getAgentInfo(node.assignee)

  const statusStyles: Record<PlanNode['status'], string> = {
    pending: 'bg-white/80 border-black/10',
    running: 'bg-blue-500/5 border-blue-500/30',
    blocked: 'bg-amber-500/5 border-amber-500/30',
    completed: 'bg-emerald-500/5 border-emerald-500/30',
    failed: 'bg-red-500/5 border-red-500/30',
  }

  // Running nodes get pulse animation
  const runningAnimation = node.status === 'running' ? 'animate-pulse' : ''

  return (
    <div className="relative">
      {/* Parallel indicator line */}
      {node.isParallel && level > 0 && (
        <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-violet-400/50 rounded" style={{ marginLeft: level * 16 - 8 }} />
      )}

      <div
        className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2 transition cursor-pointer ${statusStyles[node.status]} ${runningAnimation} ${isSelected ? 'ring-2 ring-blue-500/30 shadow-sm' : 'hover:shadow-sm'} ${isBottleneck ? 'ring-2 ring-amber-500/50' : ''} ${matchesSearch ? 'ring-2 ring-violet-500/50 bg-violet-500/5' : ''}`}
        style={{ marginLeft: level * 20 }}
        onClick={() => onSelect(node.id)}
        tabIndex={0}
        role="button"
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="w-5 h-5 flex items-center justify-center rounded-md text-black/40 hover:text-black/70 hover:bg-black/5"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Status Icon */}
        <div className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-full ${node.status === 'running' ? 'bg-blue-500/20' : ''}`}>
          <span className={`text-sm font-medium ${getStatusColor(node.status)}`}>
            {node.status === 'running' ? (
              <span className="inline-block animate-spin">◐</span>
            ) : (
              getStatusIcon(node.status)
            )}
          </span>
        </div>

        {/* Title & Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`truncate text-[13px] font-medium ${node.status === 'completed' ? 'text-black/50' : 'text-black/80'}`}>
              {node.title}
            </span>
            {node.isParallel && (
              <span className="shrink-0 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-semibold text-violet-600">
                ∥
              </span>
            )}
            <ReasoningTooltip reasoning={node.reasoning} />
          </div>

          {/* Sub info row */}
          <div className="flex items-center gap-2 mt-0.5">
            {node.status === 'running' && <ProgressMini progress={node.progress} />}
            {node.outputFiles && node.outputFiles.length > 0 && (
              <span className="text-[9px] text-black/40">
                📁 {node.outputFiles.length} files
              </span>
            )}
          </div>
        </div>

        {/* Agent Badge */}
        <div className="shrink-0 flex items-center gap-1">
          <span className="rounded-lg border border-black/10 bg-white/80 px-1.5 py-0.5 text-[9px] font-semibold text-black/60 flex items-center gap-1">
            {agent.triadRole && <span className="opacity-70">{getTriadIcon(agent.triadRole)}</span>}
            {agent.name}
            <span className="text-[8px] opacity-50" title={`${agent.autonomyLevel} autonomy · ${agent.iterationCycle}`}>
              {getAutonomyIcon(agent.autonomyLevel)}
            </span>
          </span>
        </div>

        {/* Risk Level */}
        <span className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-[9px] font-bold border ${getRiskColor(node.riskLevel)}`}>
          {getRiskLabel(node.riskLevel)}
        </span>

        {/* Tools */}
        <ToolsPopover tools={node.toolsUsed} />

        {/* Time/Duration */}
        {node.status === 'running' && <ElapsedTime startedAt={node.startedAt} />}
        {node.status === 'completed' && node.actualMs && (
          <span className="text-[10px] text-emerald-600 tabular-nums font-mono">
            {node.actualMs < 1000 ? `${node.actualMs}ms` : `${(node.actualMs / 1000).toFixed(1)}s`}
          </span>
        )}

        {/* Verification Badge */}
        {node.verification && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
              node.verification.result === 'pass'
                ? 'bg-emerald-500/10 text-emerald-600'
                : node.verification.result === 'fail'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-black/5 text-black/40'
            }`}
          >
            {node.verification.result === 'pass' ? '✓ Pass' : node.verification.result === 'fail' ? '✗ Fail' : '? Pending'}
          </span>
        )}

        {/* Action Buttons (Retry/Skip) */}
        {(node.status === 'failed' || node.status === 'blocked') && (
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRetry(node.id)
              }}
              className="rounded-lg border border-black/10 bg-white px-2 py-0.5 text-[9px] font-medium text-black/60 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/20"
              title="Retry"
            >
              ↻ Retry
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSkip(node.id)
              }}
              className="rounded-lg border border-black/10 bg-white px-2 py-0.5 text-[9px] font-medium text-black/60 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/20"
              title="Skip"
            >
              → Skip
            </button>
          </div>
        )}
      </div>

      {/* Blocked By Info */}
      {node.status === 'blocked' && node.blockedBy && node.blockedBy.length > 0 && (
        <div
          className="mt-1 text-[10px] text-amber-600 pl-7 flex items-center gap-1"
          style={{ marginLeft: level * 20 }}
        >
          <span className="animate-pulse">⏳</span>
          Waiting: {node.blockedBy.join(', ')}
        </div>
      )}

      {/* Bottleneck indicator */}
      {isBottleneck && (
        <div
          className="mt-1 text-[10px] text-blue-600 pl-7 flex items-center gap-1 font-medium"
          style={{ marginLeft: level * 20 }}
        >
          <span className="animate-bounce">⚡</span>
          Current bottleneck
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div className="mt-1.5 space-y-1.5">
          {node.children.map((child) => (
            <PlanNodeRow
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              bottleneckId={bottleneckId}
              searchQuery={searchQuery}
              onSelect={onSelect}
              onRetry={onRetry}
              onSkip={onSkip}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== Main Component ====================

export function ElonPlanTree() {
  const { elonX, elonSelectNode, elonRetryNode, elonSkipNode } = useAppStore()
  const { planTree, selectedNodeId } = elonX
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'blocked' | 'failed'>('all')

  const bottleneck = useMemo(() => {
    if (!planTree?.root) return null
    return findBottleneck(planTree.root)
  }, [planTree])

  const progress = useMemo(() => {
    if (!planTree?.root) return 0
    return calculateProgress(planTree.root)
  }, [planTree])

  const stats = useMemo(() => {
    if (!planTree?.root) return { total: 0, completed: 0, running: 0, failed: 0 }
    return countNodes(planTree.root)
  }, [planTree])

  if (!planTree || !planTree.root) {
    return (
      <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-6">
        <div className="text-4xl mb-3 opacity-30">📋</div>
        <div className="text-sm font-medium text-black/40">No active plan</div>
        <div className="text-xs text-black/30 mt-1">Enter a goal and execute to start</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border border-black/10 bg-white/50 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-black/5 bg-white/50">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-black/80">Plan Tree</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                {stats.completed}/{stats.total}
              </span>
              {stats.running > 0 && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 animate-pulse">
                  {stats.running} running
                </span>
              )}
              {stats.failed > 0 && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                  {stats.failed} failed
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 rounded-full bg-black/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${stats.running > 0 ? 'bg-blue-500' : progress === 100 ? 'bg-emerald-500' : 'bg-black/30'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-black/50">{progress}%</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-black/5">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 pl-8 text-xs outline-none focus:border-black/20 focus:ring-1 focus:ring-black/10"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/30 text-xs">🔍</span>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-1">
            {(['all', 'running', 'blocked', 'failed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                  filterStatus === status
                    ? 'bg-black/10 text-black/80'
                    : 'text-black/40 hover:bg-black/5'
                }`}
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* AI Generate Button */}
          <button
            type="button"
            className="flex items-center gap-1 rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-600 hover:bg-violet-500/20 transition"
            title="AI generates sub-tasks using First Principles"
          >
            <span>✨</span>
            <span>AI Generate</span>
          </button>
        </div>
      </div>

      {/* Goal Info */}
      <div className="shrink-0 px-4 py-2 border-b border-black/5 bg-gradient-to-r from-blue-500/5 to-violet-500/5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Goal</span>
          <span className="text-xs font-medium text-black/70">{planTree.problem}</span>
        </div>
        {planTree.constraints && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Constraints</span>
            <span className="text-[11px] text-black/50">{planTree.constraints}</span>
          </div>
        )}
      </div>

      {/* Tree */}
      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          <div className="p-3 space-y-1.5">
            <PlanNodeRow
              node={planTree.root}
              level={0}
              selectedId={selectedNodeId}
              bottleneckId={bottleneck?.id ?? null}
              searchQuery={searchQuery}
              onSelect={elonSelectNode}
              onRetry={elonRetryNode}
              onSkip={elonSkipNode}
            />
          </div>
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Bottleneck Footer */}
      {bottleneck && (
        <div className="shrink-0 border-t border-black/5 px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-amber-500">⚡</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Bottleneck</span>
            <span className="text-xs font-medium text-amber-800">{bottleneck.title}</span>
            {bottleneck.status === 'running' && <ElapsedTime startedAt={bottleneck.startedAt} />}
            <span className="text-[10px] text-amber-600">
              [{getAgentInfo(bottleneck.assignee).name}]
            </span>
          </div>
        </div>
      )}

      {/* Legend Footer */}
      <div className="shrink-0 border-t border-black/5 px-4 py-1.5 bg-white/30">
        <div className="flex items-center gap-3 text-[9px] text-black/40 flex-wrap">
          <span>Risk:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/20 text-center text-emerald-700 font-bold text-[8px]">L</span>
            Low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500/20 text-center text-amber-700 font-bold text-[8px]">M</span>
            Med
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500/20 text-center text-red-700 font-bold text-[8px]">H</span>
            High
          </span>
          <span className="mx-1">|</span>
          <span>Autonomy:</span>
          <span className="flex items-center gap-0.5" title="Full autonomy">⚡</span>
          <span className="flex items-center gap-0.5" title="High">●</span>
          <span className="flex items-center gap-0.5" title="Medium">◐</span>
          <span className="flex items-center gap-0.5" title="Supervised">○</span>
          <span className="mx-1">|</span>
          <span className="flex items-center gap-1">
            <span className="text-violet-600">∥</span>
            Parallel
          </span>
          <span className="flex items-center gap-1">
            <span>💡</span>
            Reasoning
          </span>
        </div>
      </div>
    </div>
  )
}
