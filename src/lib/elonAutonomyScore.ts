export type LoaLevel = 'L3' | 'L4' | 'L5'

export interface AutonomyScoreInput {
  completedTasks: number
  totalTasks: number
  humanInterventionCount: number
  violationCount: number
  reworkCount: number
}

export interface AutonomyScoreCard {
  score: number
  loaLevel: LoaLevel
  humanInterventionCount: number
  autoCompletionRate: number
  violationCount: number
  reworkRate: number
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function clamp100(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export function computeAutonomyScore(input: AutonomyScoreInput): AutonomyScoreCard {
  const totalTasks = Math.max(1, input.totalTasks)
  const completedTasks = Math.max(0, Math.min(totalTasks, input.completedTasks))
  const autoCompletionRate = clamp01(completedTasks / totalTasks)
  const reworkRate = clamp01(input.reworkCount / totalTasks)
  const interventions = Math.max(0, input.humanInterventionCount)
  const violations = Math.max(0, input.violationCount)

  let score = 100
  score -= (1 - autoCompletionRate) * 40
  score -= interventions * 8
  score -= violations * 10
  score -= reworkRate * 18
  score = clamp100(score)

  let loaLevel: LoaLevel = 'L3'
  if (score >= 90 && interventions === 0 && violations === 0) loaLevel = 'L5'
  else if (score >= 75) loaLevel = 'L4'

  return {
    score: Math.round(score),
    loaLevel,
    humanInterventionCount: interventions,
    autoCompletionRate,
    violationCount: violations,
    reworkRate,
  }
}
