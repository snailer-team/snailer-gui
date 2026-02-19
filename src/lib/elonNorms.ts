export type NormDecisionType = 'allow' | 'deny' | 'revise'

export type NormRuleId =
  | 'frame_lock_required'
  | 'active_agent_required'
  | 'max_cost_per_cycle'
  | 'broadcast_target_active'
  | 'broadcast_message_required'
  | 'broadcast_ttl_range'
  | 'no_secret_commit'
  | 'test_before_merge'
  | 'write_code_diff_required'

export interface NormDecision {
  ruleId: NormRuleId
  decision: NormDecisionType
  reason: string
  requiredPatch?: string
}

export interface PreCycleNormInput {
  frameLocked: boolean
  goal: string
  activeAgentIds: string[]
  budgetCapUsd?: number
  estimatedCycleCostUsd?: number
}

export interface BroadcastLike {
  to: string
  message: string
  expiresMins: number
}

export interface BroadcastNormResult {
  broadcasts: BroadcastLike[]
  decisions: NormDecision[]
}

export interface AgentOutputNormInput {
  agentId: string
  normProfile?: string
  output: string
  actions: Array<{ type: string; detail?: string; codeDiff?: string }>
  improvements: string[]
  githubActions?: Array<{ type: string; params?: Record<string, string> }>
}

export interface AgentOutputNormResult {
  allowed: boolean
  decisions: NormDecision[]
}

export function isNormAllowed(decisions: NormDecision[]): boolean {
  return !decisions.some((d) => d.decision === 'deny')
}

export function runPreCycleNorms(input: PreCycleNormInput): NormDecision[] {
  const decisions: NormDecision[] = []

  if (!input.frameLocked || input.goal.trim().length === 0) {
    decisions.push({
      ruleId: 'frame_lock_required',
      decision: 'deny',
      reason: 'Frame lock with a non-empty goal is required for autonomous cycle.',
      requiredPatch: 'Lock Frame and set goal before running auto-cycle.',
    })
  } else {
    decisions.push({
      ruleId: 'frame_lock_required',
      decision: 'allow',
      reason: 'Frame lock is active.',
    })
  }

  if (input.activeAgentIds.length === 0) {
    decisions.push({
      ruleId: 'active_agent_required',
      decision: 'deny',
      reason: 'No active agent employees available.',
      requiredPatch: 'Activate at least one employee in Settings > Agent Employees.',
    })
  } else {
    decisions.push({
      ruleId: 'active_agent_required',
      decision: 'allow',
      reason: `${input.activeAgentIds.length} active agents available.`,
    })
  }

  if (
    typeof input.budgetCapUsd === 'number' &&
    input.budgetCapUsd > 0 &&
    typeof input.estimatedCycleCostUsd === 'number'
  ) {
    if (input.estimatedCycleCostUsd > input.budgetCapUsd) {
      decisions.push({
        ruleId: 'max_cost_per_cycle',
        decision: 'deny',
        reason: `Estimated cycle cost $${input.estimatedCycleCostUsd.toFixed(2)} exceeds cap $${input.budgetCapUsd.toFixed(2)}.`,
        requiredPatch: 'Reduce scope or lower parallelism before next cycle.',
      })
    } else {
      decisions.push({
        ruleId: 'max_cost_per_cycle',
        decision: 'allow',
        reason: `Estimated cost within cap ($${input.estimatedCycleCostUsd.toFixed(2)} / $${input.budgetCapUsd.toFixed(2)}).`,
      })
    }
  }

  return decisions
}

export function runBroadcastNorms(
  broadcasts: BroadcastLike[],
  activeAgentIds: string[],
): BroadcastNormResult {
  const active = new Set(activeAgentIds)
  const decisions: NormDecision[] = []
  const sanitized: BroadcastLike[] = []

  for (const b of broadcasts) {
    if (!active.has(b.to)) {
      decisions.push({
        ruleId: 'broadcast_target_active',
        decision: 'revise',
        reason: `Removed broadcast target "${b.to}" (not active).`,
      })
      continue
    }

    const msg = b.message.trim()
    if (!msg) {
      decisions.push({
        ruleId: 'broadcast_message_required',
        decision: 'revise',
        reason: `Removed empty broadcast for "${b.to}".`,
      })
      continue
    }

    const expiresRaw = Number.isFinite(b.expiresMins) ? b.expiresMins : 60
    const expiresMins = Math.max(5, Math.min(240, Math.round(expiresRaw)))
    if (expiresMins !== b.expiresMins) {
      decisions.push({
        ruleId: 'broadcast_ttl_range',
        decision: 'revise',
        reason: `Adjusted expiresMins for "${b.to}" to ${expiresMins}.`,
      })
    }

    decisions.push({
      ruleId: 'broadcast_target_active',
      decision: 'allow',
      reason: `Broadcast target "${b.to}" is active.`,
    })

    sanitized.push({
      to: b.to,
      message: msg,
      expiresMins,
    })
  }

  return { broadcasts: sanitized, decisions }
}

function containsSecretLikeText(text: string): boolean {
  if (!text) return false
  const patterns: RegExp[] = [
    /sk-[a-z0-9\-_]{16,}/i,
    /api[_-]?key\s*[:=]/i,
    /BEGIN [A-Z ]*PRIVATE KEY/i,
    /xox[baprs]-[a-z0-9-]{10,}/i,
    /ghp_[a-z0-9]{20,}/i,
  ]
  return patterns.some((rx) => rx.test(text))
}

function hasRequiredTestCommands(
  githubActions: Array<{ type: string; params?: Record<string, string> }> | undefined,
): boolean {
  if (!githubActions || githubActions.length === 0) return false
  const cmds = githubActions
    .filter((a) => a.type === 'run_bash')
    .map((a) => String(a.params?.command ?? '').toLowerCase())
  const hasLint = cmds.some((c) => c.includes('lint'))
  const hasBuild = cmds.some((c) => c.includes('build'))
  const hasTest = cmds.some((c) => c.includes('test'))
  return hasLint && hasBuild && hasTest
}

function normalizeNormProfile(profile?: string): 'strict' | 'default' | 'fast' {
  const raw = String(profile ?? '').trim().toLowerCase()
  if (raw === 'strict') return 'strict'
  if (raw === 'fast') return 'fast'
  return 'default'
}

export function runAgentOutputNorms(input: AgentOutputNormInput): AgentOutputNormResult {
  const decisions: NormDecision[] = []
  const normProfile = normalizeNormProfile(input.normProfile)
  const payload = [
    input.output,
    ...input.improvements,
    ...input.actions.map((a) => `${a.type}\n${a.detail ?? ''}\n${a.codeDiff ?? ''}`),
  ].join('\n')

  if (containsSecretLikeText(payload)) {
    decisions.push({
      ruleId: 'no_secret_commit',
      decision: 'deny',
      reason: 'Potential secret/token detected in agent output payload.',
      requiredPatch: 'Remove secrets and use env references before continuing.',
    })
  } else {
    decisions.push({
      ruleId: 'no_secret_commit',
      decision: 'allow',
      reason: 'No secret-like payload found.',
    })
  }

  const isEngineeringAgent = input.agentId.startsWith('swe') || input.agentId === 'frontend'
  if (isEngineeringAgent) {
    const writeCodeActions = input.actions.filter((a) => a.type === 'write_code')
    const missingDiffCount = writeCodeActions.filter((a) => !a.codeDiff || !a.codeDiff.trim()).length
    if (missingDiffCount > 0) {
      decisions.push({
        ruleId: 'write_code_diff_required',
        decision: normProfile === 'fast' ? 'revise' : 'deny',
        reason: `${missingDiffCount} write_code action(s) missing codeDiff. (profile: ${normProfile})`,
        requiredPatch: 'Include unified diff in codeDiff for every write_code action.',
      })
    } else {
      decisions.push({
        ruleId: 'write_code_diff_required',
        decision: 'allow',
        reason: 'All write_code actions include codeDiff.',
      })
    }
  }

  const hasMergeAction = (input.githubActions ?? []).some((a) => a.type === 'merge_pr')
  if (hasMergeAction && !hasRequiredTestCommands(input.githubActions)) {
    decisions.push({
      ruleId: 'test_before_merge',
      decision: normProfile === 'fast' ? 'revise' : 'deny',
      reason: `merge_pr requested without lint/build/test command evidence. (profile: ${normProfile})`,
      requiredPatch: 'Run lint, build, and test before merge.',
    })
  } else if (hasMergeAction) {
    decisions.push({
      ruleId: 'test_before_merge',
      decision: 'allow',
      reason: 'merge_pr has lint/build/test command evidence.',
    })
  }

  if (normProfile === 'strict' && isEngineeringAgent) {
    const hasRunBash = (input.githubActions ?? []).some((a) => a.type === 'run_bash')
    if (!hasRunBash) {
      decisions.push({
        ruleId: 'test_before_merge',
        decision: 'revise',
        reason: 'Strict profile expects at least one run_bash verification command.',
        requiredPatch: 'Add at least one validation command (lint/build/test).',
      })
    }
  }

  return {
    allowed: isNormAllowed(decisions),
    decisions,
  }
}
