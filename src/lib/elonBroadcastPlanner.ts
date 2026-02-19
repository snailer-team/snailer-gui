import type { CeoLlmOutput } from './store'

export interface PlannedBroadcastInput {
  objective: string
  constraints: string
  activeAgentIds: string[]
  factorySelectedAgentIds: string[]
  factoryReason: string
  llmOutput: CeoLlmOutput
  sanitizedBroadcasts: Array<{ to: string; message: string; expiresMins: number }>
}

export interface PlannedBroadcastDirective {
  to: string
  message: string
  why: string
  expiresMins: number
}

export interface PlannedBroadcastResult {
  directives: PlannedBroadcastDirective[]
  usedFallback: boolean
  fallbackReason?: string
}

function compactText(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return ''
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

export function planCycleBroadcasts(input: PlannedBroadcastInput): PlannedBroadcastResult {
  const active = new Set(input.activeAgentIds)
  const byAgent = new Map<string, { to: string; message: string; expiresMins: number }>()

  for (const b of input.sanitizedBroadcasts) {
    if (!active.has(b.to)) continue
    if (!b.message.trim()) continue
    if (!byAgent.has(b.to)) {
      byAgent.set(b.to, b)
    }
  }

  if (byAgent.size > 0) {
    const directives = Array.from(byAgent.values()).map((b) => {
      const leverage = input.llmOutput.topLeverage.find((l) => l.assignee === b.to)
      return {
        to: b.to,
        message: b.message,
        why: leverage?.why || 'Top leverage item',
        expiresMins: b.expiresMins,
      }
    })
    return { directives, usedFallback: false }
  }

  const fallbackCandidates =
    input.factorySelectedAgentIds.length > 0 ? input.factorySelectedAgentIds : input.activeAgentIds
  const fallbackTargets = Array.from(new Set(fallbackCandidates)).slice(0, 8)
  if (fallbackTargets.length === 0) {
    return { directives: [], usedFallback: true, fallbackReason: 'No active agents available for fallback.' }
  }

  const objective = compactText(input.objective, 180) || 'Advance current autonomous goal'
  const constraints = compactText(input.constraints, 120)
  const message = constraints
    ? `[Factory fallback] Execute highest-leverage step for: ${objective}. Respect constraints: ${constraints}. Return actionable output and at least one improvement.`
    : `[Factory fallback] Execute highest-leverage step for: ${objective}. Return actionable output and at least one improvement.`

  return {
    directives: fallbackTargets.map((agentId) => ({
      to: agentId,
      message,
      why: `Fallback assignment from factory: ${input.factoryReason}`,
      expiresMins: 90,
    })),
    usedFallback: true,
    fallbackReason: 'No valid CEO broadcasts after norms/filtering. Assigned by factory fallback.',
  }
}

