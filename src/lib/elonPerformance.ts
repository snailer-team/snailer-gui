// Elon Musk Performance Evaluation System
// Based on Tesla/SpaceX/xAI evaluation patterns

// ==================== Types ====================

export type PerformanceScore = 1 | 2 | 3 | 4 | 5 // 1 = lowest, 5 = exceptional

export type PerformanceRank =
  | 'exceptional'    // Top 5% - equity/promotion boost
  | 'exceeds'        // Top 20% - strong performer
  | 'meets'          // Middle 60% - solid contributor
  | 'needs_improvement' // Bottom 15% - warning zone
  | 'low_performer'  // Bottom 3-5% - PIP candidate

export type PIPStatus =
  | 'none'           // No PIP
  | 'warning'        // Pre-PIP warning
  | 'active'         // On PIP (6 month clock)
  | 'extended'       // PIP extended
  | 'completed'      // Improved, PIP removed
  | 'failed'         // Failed PIP → exit

export interface PerformanceMetrics {
  // Impact Metrics (First Principles: "How much did you move the needle?")
  tasksCompleted: number
  highLeverageTasks: number // Tasks identified as critical path
  bottlenecksResolved: number
  iterationsPerDay: number

  // Quality Metrics
  verificationPassRate: number // 0-100
  reworkRate: number // Lower is better
  codeCommits?: number

  // Ownership Metrics (xAI: "No one tells me no")
  selfAssignedTasks: number
  crossTeamContributions: number
  blockedTime: number // ms spent blocked (lower is better)
  autonomyScore: number // 0-100

  // Communication (Sharp & Direct)
  feedbackGiven: number
  feedbackReceived: number
  meetingEfficiency: number // 0-100
}

export interface PeerFeedback {
  fromAgentId: string
  score: PerformanceScore
  strengths: string[]
  improvements: string[]
  timestamp: number
}

export interface CEOFeedback {
  // Elon-style direct feedback
  message: string
  isPositive: boolean
  isWarRoom: boolean // "Fix this NOW" urgency
  timestamp: number
}

export interface PerformanceReview {
  agentId: string
  reviewPeriod: string // e.g., "2026-H1"

  // Scores (1-5)
  impactScore: PerformanceScore
  ownershipScore: PerformanceScore
  iterationScore: PerformanceScore
  communicationScore: PerformanceScore
  overallScore: PerformanceScore

  // Rankings
  rank: PerformanceRank
  percentile: number // 0-100

  // Feedback
  managerFeedback: string
  peerFeedbacks: PeerFeedback[]
  selfAssessment: string
  ceoFeedbacks: CEOFeedback[]

  // Metrics snapshot
  metrics: PerformanceMetrics

  // Actions
  pipStatus: PIPStatus
  pipStartDate?: number
  pipDeadline?: number
  pipGoals?: string[]

  // Rewards (Top performers)
  equityBonus?: number
  promotionEligible?: boolean
  specialRecognition?: string[]
}

export interface AgentPerformanceState {
  agentId: string
  currentMetrics: PerformanceMetrics
  historicalReviews: PerformanceReview[]
  currentRank: PerformanceRank
  pipStatus: PIPStatus
  pipProgress?: number // 0-100
  lastCEOFeedback?: CEOFeedback
  streakDays: number // Consecutive days of high performance
  warningCount: number
}

// ==================== Calculation Functions ====================

export function calculateOverallScore(metrics: PerformanceMetrics): PerformanceScore {
  // Weighted scoring based on Musk priorities
  const impactWeight = 0.35 // High leverage work is king
  const ownershipWeight = 0.25 // "No one tells me no"
  const iterationWeight = 0.25 // Speed matters
  const qualityWeight = 0.15 // But quality too

  const impactScore = Math.min(5, Math.max(1,
    (metrics.highLeverageTasks * 2 + metrics.bottlenecksResolved * 3) / 10
  ))

  const ownershipScore = Math.min(5, Math.max(1,
    (metrics.autonomyScore / 20) + (metrics.selfAssignedTasks / metrics.tasksCompleted || 0) * 2
  ))

  const iterationScore = Math.min(5, Math.max(1,
    metrics.iterationsPerDay >= 5 ? 5 :
    metrics.iterationsPerDay >= 3 ? 4 :
    metrics.iterationsPerDay >= 1 ? 3 :
    metrics.iterationsPerDay >= 0.5 ? 2 : 1
  ))

  const qualityScore = Math.min(5, Math.max(1,
    (metrics.verificationPassRate / 20) - (metrics.reworkRate / 10)
  ))

  const weighted =
    impactScore * impactWeight +
    ownershipScore * ownershipWeight +
    iterationScore * iterationWeight +
    qualityScore * qualityWeight

  return Math.round(weighted) as PerformanceScore
}

export function calculateRank(percentile: number): PerformanceRank {
  // Stack ranking based on Musk company patterns
  if (percentile >= 95) return 'exceptional'      // Top 5%
  if (percentile >= 80) return 'exceeds'          // Top 20%
  if (percentile >= 20) return 'meets'            // Middle 60%
  if (percentile >= 5) return 'needs_improvement' // Bottom 15%
  return 'low_performer'                          // Bottom 5%
}

export function getRankColor(rank: PerformanceRank): string {
  switch (rank) {
    case 'exceptional': return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
    case 'exceeds': return 'text-blue-600 bg-blue-500/10 border-blue-500/20'
    case 'meets': return 'text-black/60 bg-black/5 border-black/10'
    case 'needs_improvement': return 'text-amber-600 bg-amber-500/10 border-amber-500/20'
    case 'low_performer': return 'text-red-600 bg-red-500/10 border-red-500/20'
  }
}

export function getRankIcon(rank: PerformanceRank): string {
  switch (rank) {
    case 'exceptional': return '🚀'
    case 'exceeds': return '⭐'
    case 'meets': return '✓'
    case 'needs_improvement': return '⚠️'
    case 'low_performer': return '🔻'
  }
}

export function getRankLabel(rank: PerformanceRank): string {
  switch (rank) {
    case 'exceptional': return 'Exceptional (Top 5%)'
    case 'exceeds': return 'Exceeds (Top 20%)'
    case 'meets': return 'Meets Expectations'
    case 'needs_improvement': return 'Needs Improvement'
    case 'low_performer': return 'Low Performer (PIP)'
  }
}

export function getPIPStatusColor(status: PIPStatus): string {
  switch (status) {
    case 'none': return 'text-black/40'
    case 'warning': return 'text-amber-600'
    case 'active': return 'text-red-600'
    case 'extended': return 'text-red-700'
    case 'completed': return 'text-emerald-600'
    case 'failed': return 'text-red-800'
  }
}

export function getPIPStatusLabel(status: PIPStatus): string {
  switch (status) {
    case 'none': return '-'
    case 'warning': return 'Pre-PIP Warning'
    case 'active': return 'On PIP'
    case 'extended': return 'PIP Extended'
    case 'completed': return 'PIP Completed'
    case 'failed': return 'PIP Failed'
  }
}

// ==================== CEO (Elon) Feedback Generator ====================

export const CEO_POSITIVE_FEEDBACKS = [
  "This is exactly what high leverage work looks like. Keep pushing.",
  "Outstanding. You've removed a critical bottleneck.",
  "This iteration speed is exceptional. Tesla-level execution.",
  "First principles thinking at its best. More of this.",
  "You owned this end-to-end. No handoffs. That's the way.",
  "Shipping daily, iterating hourly. This is how we win.",
]

export const CEO_IMPROVEMENT_FEEDBACKS = [
  "Why is this taking so long? What's the bottleneck?",
  "This doesn't pass first principles. Break it down again.",
  "Stop waiting for permission. Own it.",
  "Too many iterations without shipping. Ship something.",
  "This is low leverage work. Focus on what matters.",
  "War room NOW. This needs to be fixed immediately.",
]

export function generateCEOFeedback(
  metrics: PerformanceMetrics,
  rank: PerformanceRank
): CEOFeedback {
  const isPositive = rank === 'exceptional' || rank === 'exceeds'
  const isWarRoom = rank === 'low_performer' || metrics.blockedTime > 3600000 // 1hr+ blocked

  const messages = isPositive ? CEO_POSITIVE_FEEDBACKS : CEO_IMPROVEMENT_FEEDBACKS
  const message = messages[Math.floor(Math.random() * messages.length)]

  return {
    message,
    isPositive,
    isWarRoom,
    timestamp: Date.now(),
  }
}

// ==================== Demo Data ====================

export function createDemoPerformanceState(agentId: string, seedOffset: number = 0): AgentPerformanceState {
  const seed = agentId.charCodeAt(0) + seedOffset
  const rand = (min: number, max: number) => min + ((seed * 17) % (max - min + 1))

  const metrics: PerformanceMetrics = {
    tasksCompleted: rand(5, 30),
    highLeverageTasks: rand(1, 10),
    bottlenecksResolved: rand(0, 5),
    iterationsPerDay: rand(1, 8),
    verificationPassRate: rand(60, 100),
    reworkRate: rand(0, 30),
    selfAssignedTasks: rand(2, 15),
    crossTeamContributions: rand(0, 5),
    blockedTime: rand(0, 7200000),
    autonomyScore: rand(50, 100),
    feedbackGiven: rand(1, 10),
    feedbackReceived: rand(1, 10),
    meetingEfficiency: rand(40, 100),
  }

  const percentile = rand(5, 98)
  const rank = calculateRank(percentile)
  const pipStatus: PIPStatus = rank === 'low_performer' ? 'active' :
                                rank === 'needs_improvement' ? 'warning' : 'none'

  return {
    agentId,
    currentMetrics: metrics,
    historicalReviews: [],
    currentRank: rank,
    pipStatus,
    pipProgress: pipStatus === 'active' ? rand(0, 60) : undefined,
    lastCEOFeedback: generateCEOFeedback(metrics, rank),
    streakDays: rank === 'exceptional' ? rand(5, 30) : rand(0, 5),
    warningCount: rank === 'low_performer' ? rand(1, 3) : rank === 'needs_improvement' ? rand(0, 2) : 0,
  }
}

// Stack rank all agents and return sorted by percentile
export function stackRankAgents(
  performances: Map<string, AgentPerformanceState>
): Array<{ agentId: string; state: AgentPerformanceState; stackRank: number }> {
  const agents = Array.from(performances.entries())
    .filter(([id]) => id !== 'ceo') // CEO is not evaluated
    .map(([agentId, state]) => {
      const score = calculateOverallScore(state.currentMetrics)
      return { agentId, state, score }
    })

  // Sort by score descending
  agents.sort((a, b) => b.score - a.score)

  // Assign stack rank
  return agents.map((agent, index) => ({
    agentId: agent.agentId,
    state: agent.state,
    stackRank: index + 1,
  }))
}
