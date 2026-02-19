import type { AgentEmployee } from './elonAgentRegistry'

export interface AgentFactorySelection {
  complexityScore: number
  targetHeadcount: number
  selectedAgentIds: string[]
  reason: string
}

export interface AgentFactoryInput {
  objective: string
  constraints: string
  verification: string
  activeEmployees: AgentEmployee[]
}

function calculateComplexityScore(input: AgentFactoryInput): number {
  const text = `${input.objective}\n${input.constraints}\n${input.verification}`.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean).length
  const keywordWeights: Array<[RegExp, number]> = [
    [/\b(migrate|refactor|rewrite)\b/g, 8],
    [/\b(security|auth|permission|compliance)\b/g, 7],
    [/\b(performance|latency|scale|scaling|throughput)\b/g, 6],
    [/\b(multi-agent|autonomous|orchestrator|workflow)\b/g, 6],
    [/\b(ci|test|build|deploy|release)\b/g, 5],
    [/\b(ui|ux|design|frontend)\b/g, 4],
    [/\b(api|backend|database|schema)\b/g, 4],
  ]

  let score = Math.min(60, Math.round(words * 0.45))
  for (const [rx, weight] of keywordWeights) {
    const matches = text.match(rx)
    if (matches) score += matches.length * weight
  }
  return Math.max(5, Math.min(100, score))
}

function headcountFromComplexity(score: number): number {
  if (score <= 20) return 4
  if (score <= 35) return 6
  if (score <= 50) return 10
  if (score <= 70) return 16
  return 24
}

const PRIORITY_AGENT_ORDER = [
  'pm',
  'swe',
  'swe-2',
  'frontend',
  'qa',
  'ai-ml',
  'platform',
  'sre',
  'security',
  'cto',
  'cpo',
  'cro',
]

function uniquePush(target: string[], value: string): void {
  if (!target.includes(value)) target.push(value)
}

export function selectAgentsForCycle(input: AgentFactoryInput): AgentFactorySelection {
  const active = input.activeEmployees.filter((e) => e.status === 'active')
  if (active.length === 0) {
    return {
      complexityScore: 0,
      targetHeadcount: 0,
      selectedAgentIds: [],
      reason: 'No active employees available.',
    }
  }

  const complexityScore = calculateComplexityScore(input)
  const requestedHeadcount = headcountFromComplexity(complexityScore)
  const targetHeadcount = Math.min(active.length, requestedHeadcount)

  const activeIds = active.map((e) => e.id)
  const selected: string[] = []
  for (const id of PRIORITY_AGENT_ORDER) {
    if (activeIds.includes(id)) uniquePush(selected, id)
    if (selected.length >= targetHeadcount) break
  }
  if (selected.length < targetHeadcount) {
    for (const id of activeIds) {
      uniquePush(selected, id)
      if (selected.length >= targetHeadcount) break
    }
  }

  return {
    complexityScore,
    targetHeadcount,
    selectedAgentIds: selected,
    reason: `Complexity ${complexityScore} → target ${targetHeadcount}/${active.length} agents`,
  }
}
