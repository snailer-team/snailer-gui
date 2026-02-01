// ElonX HARD - Plan Tree Types

import { ALL_WORKFLOWS, type AgentWorkflow } from './elonWorkflows'

export type PlanNodeStatus = 'pending' | 'running' | 'blocked' | 'completed' | 'failed'

export type VerificationType = 'test' | 'lint' | 'build' | 'manual' | 'vm_screenshot'

export interface PlanVerification {
  type: VerificationType
  result: 'pass' | 'fail' | 'pending'
  evidenceId?: string // Link to Evidence panel
  summary?: string
}

export type RiskLevel = 'low' | 'medium' | 'high'

export interface PlanNode {
  id: string
  title: string // Short: "Implement auth API"
  description?: string
  status: PlanNodeStatus
  assignee: string // Agent ID (e.g., 'swe', 'pm', 'cto')
  children: PlanNode[]

  // Risk & Priority
  riskLevel?: RiskLevel
  priority?: number // 1-5, higher = more important

  // Metrics
  estimatedMs?: number
  actualMs?: number
  startedAt?: number
  progress?: number // 0-100

  // Dependencies
  blockedBy?: string[] // Other node IDs
  blocks?: string[] // Nodes that this blocks
  isParallel?: boolean // Can run in parallel with siblings

  // Tools used
  toolsUsed?: Array<{
    tool: string
    command?: string
    output?: string
    timestamp: number
  }>

  // Verification
  verification?: PlanVerification

  // AI Reasoning
  reasoning?: string // First Principles explanation

  // Output
  outputSummary?: string
  outputFiles?: string[] // Files created/modified
}

export interface PlanTree {
  goalId: string
  problem: string
  constraints?: string
  verification?: string
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  root: PlanNode | null
  startedAt?: number
  completedAt?: number
}

// Utility functions

export function countNodes(node: PlanNode | null): { total: number; completed: number; running: number; failed: number } {
  if (!node) return { total: 0, completed: 0, running: 0, failed: 0 }

  let total = 1
  let completed = node.status === 'completed' ? 1 : 0
  let running = node.status === 'running' ? 1 : 0
  let failed = node.status === 'failed' ? 1 : 0

  for (const child of node.children) {
    const childCounts = countNodes(child)
    total += childCounts.total
    completed += childCounts.completed
    running += childCounts.running
    failed += childCounts.failed
  }

  return { total, completed, running, failed }
}

export function findBottleneck(node: PlanNode | null): PlanNode | null {
  if (!node) return null

  // If this node is running, it's the bottleneck
  if (node.status === 'running') return node

  // If blocked, find the blocking node
  if (node.status === 'blocked') return node

  // Check children
  for (const child of node.children) {
    const bottleneck = findBottleneck(child)
    if (bottleneck) return bottleneck
  }

  return null
}

export function findNodeById(node: PlanNode | null, id: string): PlanNode | null {
  if (!node) return null
  if (node.id === id) return node

  for (const child of node.children) {
    const found = findNodeById(child, id)
    if (found) return found
  }

  return null
}

export function calculateProgress(node: PlanNode | null): number {
  const counts = countNodes(node)
  if (counts.total === 0) return 0
  return Math.round((counts.completed / counts.total) * 100)
}

export function getStatusIcon(status: PlanNodeStatus): string {
  switch (status) {
    case 'pending':
      return '○'
    case 'running':
      return '▶'
    case 'blocked':
      return '⚠'
    case 'completed':
      return '✓'
    case 'failed':
      return '✗'
  }
}

export function getStatusColor(status: PlanNodeStatus): string {
  switch (status) {
    case 'pending':
      return 'text-black/50'
    case 'running':
      return 'text-blue-600'
    case 'blocked':
      return 'text-amber-600'
    case 'completed':
      return 'text-emerald-600'
    case 'failed':
      return 'text-red-600'
  }
}

// Demo data for development
export function createDemoPlanTree(): PlanTree {
  // Demo goal: show xAI-style multi-agent workflows + GitHub loop + revenue discipline
  const now = Date.now()

  const group: Array<{ id: string; title: string; assignee: string; agentIds: string[] }> = [
    { id: 'leadership', title: '🎯 Leadership (CEO/CTO/CPO/CRO)', assignee: 'ceo', agentIds: ['ceo', 'cto', 'cpo', 'cro'] },
    { id: 'product', title: '📋 Product & Design', assignee: 'pm', agentIds: ['pm', 'ux', 'visual', 'motion', 'growth-analyst'] },
    { id: 'engineering', title: '⚙️ Engineering', assignee: 'swe', agentIds: ['swe', 'swe-2', 'swe-3', 'ai-ml', 'platform', 'frontend', 'sre', 'security'] },
    { id: 'data', title: '📊 Data & Analytics', assignee: 'data-eng', agentIds: ['data-eng', 'ml-research'] },
    { id: 'gtm', title: '🚀 Go-to-Market', assignee: 'marketing', agentIds: ['marketing', 'sales', 'support'] },
    { id: 'ops', title: '🔧 Operations', assignee: 'finance', agentIds: ['finance', 'recruiter', 'people'] },
  ]

  const statusForPhase = (phase: string, idx: number, agentId: string): PlanNodeStatus => {
    if (agentId === 'sre' && phase === 'act' && idx === 2) return 'running'
    if (agentId === 'swe' && phase === 'act' && idx === 3) return 'running'
    if (agentId === 'ceo' && phase === 'plan' && idx === 1) return 'running'
    if (phase === 'observe') return 'completed'
    if (phase === 'plan') return 'completed'
    if (phase === 'evaluate') return 'pending'
    return 'pending'
  }

  const computeNodeStatus = (children: PlanNode[]): PlanNodeStatus => {
    if (children.some((c) => c.status === 'failed')) return 'failed'
    if (children.some((c) => c.status === 'blocked')) return 'blocked'
    if (children.some((c) => c.status === 'running')) return 'running'
    if (children.length > 0 && children.every((c) => c.status === 'completed')) return 'completed'
    return 'pending'
  }

  const makeAgentNode = (agentId: string): PlanNode => {
    const wf: AgentWorkflow | undefined = ALL_WORKFLOWS.find((w) => w.agentId === agentId)

    const steps = (wf?.steps ?? []).map((s, idx) => {
      const nodeStatus = statusForPhase(s.phase, idx, agentId)
      const verification: PlanVerification | undefined =
        s.github?.type === 'ci'
          ? {
              type: 'test',
              result: nodeStatus === 'completed' ? 'pass' : nodeStatus === 'failed' ? 'fail' : 'pending',
            }
          : undefined
      const toolsUsed = s.github
        ? [
            {
              tool: 'GitHub',
              command: `${s.github.type.toUpperCase()}: ${s.github.title}`,
              timestamp: now - (idx + 1) * 12_000,
            },
          ]
        : undefined

      return {
        id: `${agentId}-step-${idx}`,
        title: `${s.action}`,
        description: s.detail,
        status: nodeStatus,
        assignee: agentId,
        children: [],
        isParallel: true,
        toolsUsed,
        verification,
        outputSummary: s.output,
      } satisfies PlanNode
    })

    const agentStatus = computeNodeStatus(steps)
    return {
      id: `${agentId}`,
      title: wf?.name ?? agentId.toUpperCase(),
      description: wf?.description,
      status: agentStatus,
      assignee: agentId,
      children: steps,
      isParallel: true,
      reasoning: wf?.xaiPrinciples?.join(' · '),
      outputSummary: wf?.revenueImpact,
      riskLevel: agentId === 'security' || agentId === 'sre' ? 'high' : agentId === 'cto' || agentId === 'cro' ? 'medium' : 'low',
    }
  }

  const categoryNodes: PlanNode[] = group.map((g) => {
    const children = g.agentIds.map(makeAgentNode)
    return {
      id: g.id,
      title: g.title,
      status: computeNodeStatus(children),
      assignee: g.assignee,
      children,
      isParallel: true,
      riskLevel: g.id === 'engineering' ? 'high' : g.id === 'leadership' ? 'medium' : 'low',
    }
  })

  return {
    goalId: 'demo-goal-1',
    problem: 'ElonX HARD org: ship Premium + Enterprise (xAI discipline)',
    constraints: 'First Principles · daily iterations · extreme autonomy · short & sharp comms · revenue-first',
    verification: 'CI green · key metrics improve (conversion↑ churn↓ latency↓) · war-room drills OK',
    status: 'running',
    startedAt: now - 180000,
    root: {
      id: 'root',
      title: 'Ship Premium + Enterprise with xAI-style multi-agent loop',
      status: 'running',
      assignee: 'ceo',
      riskLevel: 'medium',
      progress: 0,
      reasoning:
        'First Principles: 운영은 loop(Observe→Plan→Act→Evaluate)로 굴러간다. 목표/제약/검증을 못 박고, 병목(high leverage)만 제거한다.',
      children: categoryNodes,
    },
  }
}
