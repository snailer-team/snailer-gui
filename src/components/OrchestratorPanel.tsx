import { useEffect, useState } from 'react'
import { useAppStore } from '../lib/store'
import type { AgentCardState, AgentStatus, TeamRole, VerifyStatus } from '../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'

// ==================== Helper Functions ====================

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
  return String(tokens)
}

function formatCost(cost: number): string {
  if (cost >= 1) return `$${cost.toFixed(2)}`
  if (cost >= 0.01) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(4)}`
}

function formatElapsed(ms: number): string {
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remainingSecs = secs % 60
  return `${mins}m ${remainingSecs}s`
}

function getStatusIcon(status: AgentStatus): string {
  switch (status) {
    case 'idle':
      return '○'
    case 'queued':
      return '◎'
    case 'running':
      return '◉'
    case 'review':
      return '◈'
    case 'done':
      return '●'
    case 'failed':
      return '✗'
    default:
      return '○'
  }
}

function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'idle':
      return 'text-gray-400'
    case 'queued':
      return 'text-blue-400'
    case 'running':
      return 'text-amber-400'
    case 'review':
      return 'text-purple-400'
    case 'done':
      return 'text-green-400'
    case 'failed':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

function getRoleDisplayName(role: TeamRole): string {
  switch (role) {
    case 'Oracle':
      return 'Oracle'
    case 'Explorer':
      return 'Explorer'
    case 'Librarian':
      return 'Librarian'
    case 'FrontendEngineer':
      return 'Frontend'
    case 'BackendEngineer':
      return 'Backend'
    case 'Debugger':
      return 'Debugger'
    case 'Tester':
      return 'Tester'
    default:
      return role
  }
}

function getRoleEmoji(role: TeamRole): string {
  switch (role) {
    case 'Oracle':
      return '🔮'
    case 'Explorer':
      return '🔍'
    case 'Librarian':
      return '📚'
    case 'FrontendEngineer':
      return '🎨'
    case 'BackendEngineer':
      return '⚙️'
    case 'Debugger':
      return '🐛'
    case 'Tester':
      return '🧪'
    default:
      return '🤖'
  }
}

function getVerifyStatusIcon(status: VerifyStatus['lint']): string {
  switch (status) {
    case 'idle':
      return '○'
    case 'running':
      return '◉'
    case 'passed':
      return '✓'
    case 'failed':
      return '✗'
    case 'skipped':
      return '—'
    default:
      return '○'
  }
}

function getVerifyStatusColor(status: VerifyStatus['lint']): string {
  switch (status) {
    case 'idle':
      return 'text-gray-400'
    case 'running':
      return 'text-amber-400'
    case 'passed':
      return 'text-green-400'
    case 'failed':
      return 'text-red-400'
    case 'skipped':
      return 'text-gray-500'
    default:
      return 'text-gray-400'
  }
}

// ==================== Components ====================

function AgentCard({ agent }: { agent: AgentCardState }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (agent.status !== 'running' || !agent.startedAt) {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => {
      setElapsed(Date.now() - agent.startedAt!)
    }, 1000)
    return () => clearInterval(interval)
  }, [agent.status, agent.startedAt])

  const isActive = agent.status === 'running' || agent.status === 'review'

  return (
    <div
      className={[
        'rounded-xl border p-3 transition-all',
        isActive ? 'border-amber-500/50 bg-amber-500/5' : 'border-black/5 bg-white/60',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{getRoleEmoji(agent.role)}</span>
          <span className="font-semibold text-sm">{getRoleDisplayName(agent.role)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm ${getStatusColor(agent.status)}`}>
            {agent.status === 'running' ? (
              <span className="inline-block animate-pulse">{getStatusIcon(agent.status)}</span>
            ) : (
              getStatusIcon(agent.status)
            )}
          </span>
          <span className="text-xs text-gray-500 capitalize">{agent.status}</span>
        </div>
      </div>

      {agent.current && (
        <div className="mt-2 text-xs text-gray-600 truncate">{agent.current}</div>
      )}

      {agent.progress !== undefined && agent.progress > 0 && (
        <div className="mt-2">
          <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${agent.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span className="font-mono">{agent.model}</span>
        </div>
        {isActive && elapsed > 0 && (
          <span className="text-amber-600">{formatElapsed(elapsed)}</span>
        )}
      </div>

      {(agent.inputTokens > 0 || agent.outputTokens > 0) && (
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {formatTokens(agent.inputTokens)} / {formatTokens(agent.outputTokens)}
          </span>
          <span className="text-gray-600 font-medium">{formatCost(agent.cost)}</span>
        </div>
      )}
    </div>
  )
}

function ContextBudgetBar() {
  const { contextBudget } = useAppStore((s) => s.orchestrator)

  const inputPct = Math.min(100, (contextBudget.inputTokens / contextBudget.inputLimit) * 100)
  const outputPct = Math.min(100, (contextBudget.outputTokens / contextBudget.outputLimit) * 100)
  const costPct = Math.min(100, (contextBudget.totalCost / contextBudget.costLimit) * 100)

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 70) return 'bg-amber-500'
    return 'bg-green-500'
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Context Budget</div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Input</span>
            <span className="text-gray-600 font-mono">
              {formatTokens(contextBudget.inputTokens)} / {formatTokens(contextBudget.inputLimit)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full ${getBarColor(inputPct)} transition-all`} style={{ width: `${inputPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Output</span>
            <span className="text-gray-600 font-mono">
              {formatTokens(contextBudget.outputTokens)} / {formatTokens(contextBudget.outputLimit)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full ${getBarColor(outputPct)} transition-all`} style={{ width: `${outputPct}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Cost</span>
            <span className="text-gray-600 font-mono">
              {formatCost(contextBudget.totalCost)} / {formatCost(contextBudget.costLimit)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div className={`h-full ${getBarColor(costPct)} transition-all`} style={{ width: `${costPct}%` }} />
          </div>
        </div>

        {contextBudget.tokensSaved > 0 && (
          <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
            <span className="text-green-600">Tokens saved</span>
            <span className="text-green-600 font-mono">{formatTokens(contextBudget.tokensSaved)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function VerifyStatusPanel() {
  const { verifyStatus } = useAppStore((s) => s.orchestrator)

  const steps = [
    { label: 'Lint', status: verifyStatus.lint, duration: verifyStatus.lintDuration },
    { label: 'Build', status: verifyStatus.build, duration: verifyStatus.buildDuration },
    { label: 'Test', status: verifyStatus.test, duration: verifyStatus.testDuration },
  ]

  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Verify Pipeline</div>
      <div className="space-y-1.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm ${getVerifyStatusColor(step.status)}`}>
                {step.status === 'running' ? (
                  <span className="inline-block animate-pulse">{getVerifyStatusIcon(step.status)}</span>
                ) : (
                  getVerifyStatusIcon(step.status)
                )}
              </span>
              <span className="text-sm text-gray-700">{step.label}</span>
            </div>
            {step.duration !== undefined && (
              <span className="text-xs text-gray-500">{step.duration}ms</span>
            )}
          </div>
        ))}
      </div>

      {(verifyStatus.lintOutput || verifyStatus.buildOutput || verifyStatus.testOutput) && (
        <div className="mt-3 space-y-2">
          {verifyStatus.lintOutput ? (
            <details className="rounded-lg border border-black/5 bg-white/70 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-gray-700">Lint output</summary>
              <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700">
                {verifyStatus.lintOutput}
              </pre>
            </details>
          ) : null}
          {verifyStatus.buildOutput ? (
            <details className="rounded-lg border border-black/5 bg-white/70 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-gray-700">Build output</summary>
              <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700">
                {verifyStatus.buildOutput}
              </pre>
            </details>
          ) : null}
          {verifyStatus.testOutput ? (
            <details className="rounded-lg border border-black/5 bg-white/70 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-gray-700">Test output</summary>
              <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700">
                {verifyStatus.testOutput}
              </pre>
            </details>
          ) : null}
        </div>
      )}
    </div>
  )
}

function TaskList() {
  const { tasks } = useAppStore((s) => s.orchestrator)

  if (tasks.length === 0) return null

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-amber-500'
      case 'needs_review':
        return 'text-purple-500'
      case 'verified':
      case 'merged':
        return 'text-green-500'
      case 'failed':
      case 'cancelled':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return '○'
      case 'running':
        return '◉'
      case 'needs_review':
        return '◈'
      case 'verified':
      case 'merged':
        return '●'
      case 'failed':
        return '✗'
      case 'cancelled':
        return '—'
      default:
        return '○'
    }
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Tasks ({tasks.length})</div>
      <div className="space-y-1.5 max-h-[200px] overflow-auto">
        {tasks.slice(0, 12).map((task) => (
          <div key={task.id} className="flex items-center gap-2">
            <span className={`text-sm ${getTaskStatusColor(task.status)}`}>
              {task.status === 'running' ? (
                <span className="inline-block animate-pulse">{getTaskStatusIcon(task.status)}</span>
              ) : (
                getTaskStatusIcon(task.status)
              )}
            </span>
            <span className="text-xs text-gray-700 truncate flex-1">{task.title}</span>
            {task.assignedTo && (
              <span className="text-xs text-gray-500">{getRoleEmoji(task.assignedTo)}</span>
            )}
            {task.progress !== undefined && (
              <span className="text-xs text-gray-500">{task.progress}%</span>
            )}
          </div>
        ))}
        {tasks.length > 12 && (
          <div className="text-xs text-gray-400 text-center">+{tasks.length - 12} more</div>
        )}
      </div>
    </div>
  )
}

function ContractInfo() {
  const { contract, contractStatus } = useAppStore((s) => s.orchestrator)

  if (!contract) return null

  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Contract</div>
      <div className="space-y-2 text-xs">
        {contractStatus ? (
          <div className="flex justify-between">
            <span className="text-gray-500">Status</span>
            <span className="text-gray-700 font-medium">{contractStatus}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span className="text-gray-500">Project</span>
          <span className="text-gray-700 font-medium">{contract.projectType}</span>
        </div>
        {contract.entrypoints.length > 0 && (
          <div>
            <span className="text-gray-500">Entrypoints</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {contract.entrypoints.slice(0, 3).map((e) => (
                <span key={e} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
        {contract.mustEdit.length > 0 && (
          <div>
            <span className="text-gray-500">Must Edit</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {contract.mustEdit.slice(0, 3).map((e) => (
                <span key={e} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
        {contract.forbiddenTargets.length > 0 && (
          <div>
            <span className="text-gray-500">Forbidden</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {contract.forbiddenTargets.slice(0, 3).map((e) => (
                <span key={e} className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConnectionsPanel() {
  const { mcpServers, lspClients } = useAppStore((s) => s.orchestrator)
  if (mcpServers.length === 0 && lspClients.length === 0) return null

  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Connections</div>

      {mcpServers.length > 0 ? (
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">MCP</div>
          <div className="space-y-1.5">
            {mcpServers.slice(0, 8).map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="truncate text-gray-700">{s.name}</span>
                  {s.version ? <span className="ml-2 text-gray-400 font-mono">{s.version}</span> : null}
                </div>
                <span className={s.connected ? 'text-green-600' : 'text-gray-400'}>{s.connected ? 'on' : 'off'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {lspClients.length > 0 ? (
        <div>
          <div className="text-xs text-gray-500 mb-1">LSP</div>
          <div className="space-y-1.5">
            {lspClients.slice(0, 10).map((c) => (
              <div key={`${c.name}:${c.language}`} className="flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="truncate text-gray-700">{c.name}</span>
                  <span className="ml-2 text-gray-400 font-mono">{c.language}</span>
                </div>
                <span className={c.active ? 'text-green-600' : 'text-gray-400'}>{c.active ? 'on' : 'off'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SkillsPanel() {
  const skillsState = useAppStore((s) => s.orchestrator.skills)
  if (!skillsState || skillsState.skills.length === 0) return null

  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Skills</div>
      <div className="text-xs text-gray-500">
        {skillsState.projectType ? `Detected: ${skillsState.projectType}` : 'Injected skills'}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {skillsState.skills.slice(0, 12).map((s) => (
          <span
            key={`${s.id}:${s.version}`}
            className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs"
            title={`${s.name} ${s.version} (${s.triggerType})`}
          >
            {s.name || s.id}
          </span>
        ))}
        {skillsState.skills.length > 12 ? (
          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
            +{skillsState.skills.length - 12}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function DynamicAgentsPanel() {
  const dynamicAgents = useAppStore((s) => s.orchestrator.dynamicAgents)
  if (dynamicAgents.length === 0) return null

  return (
    <div className="rounded-xl border border-black/5 bg-white/60 p-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">Dynamic Agents</div>
      <div className="space-y-1.5 text-xs">
        {dynamicAgents.slice(0, 10).map((a) => (
          <div key={a.agentId} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-gray-700">{a.agentType}</div>
              {a.reason ? <div className="truncate text-gray-400">{a.reason}</div> : null}
            </div>
            <div className="shrink-0 text-gray-500">
              {a.status}
              {a.durationSecs ? ` · ${a.durationSecs}s` : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function OrchestratorPanel() {
  const orchestrator = useAppStore((s) => s.orchestrator)
  const mode = useAppStore((s) => s.mode)

  const isOrchestratorMode = mode.toLowerCase().includes('orchestrator') || mode.toLowerCase().includes('team')
  const agents = Object.values(orchestrator.agents).filter((a): a is AgentCardState => a !== undefined)

  if (!isOrchestratorMode) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">🎭</div>
          <div className="text-sm">Switch to Team Orchestrator mode to see agent status</div>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <ScrollAreaViewport className="h-full">
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Team Orchestrator</div>
              <div className="text-xs text-gray-500">
                {orchestrator.preset} · Max {orchestrator.maxParallel} parallel
              </div>
            </div>
            {orchestrator.active && (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-green-600">Active</span>
              </div>
            )}
          </div>

          {/* Context Budget */}
          <ContextBudgetBar />

          {/* Agent Cards */}
          {agents.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-2">Agents ({agents.length})</div>
              <div className="space-y-2">
                {agents.map((agent) => (
                  <AgentCard key={agent.role} agent={agent} />
                ))}
              </div>
            </div>
          )}

          {agents.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <div className="text-gray-400 text-sm">No agents registered yet</div>
              <div className="text-gray-400 text-xs mt-1">Send a prompt to start the orchestrator</div>
            </div>
          )}

          {/* Verify Status */}
          <VerifyStatusPanel />

          {/* Tasks */}
          <TaskList />

          {/* Contract */}
          <ContractInfo />

          {/* Connections / Skills */}
          <ConnectionsPanel />
          <SkillsPanel />
          <DynamicAgentsPanel />
        </div>
      </ScrollAreaViewport>
      <ScrollBar />
    </ScrollArea>
  )
}
