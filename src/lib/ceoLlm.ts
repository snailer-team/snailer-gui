/**
 * CEO LLM Integration for Auto-Cycle
 *
 * Builds observe context, generates CEO prompts, and parses JSON output.
 */

import type { CeoLlmOutput, TopLeverageItem, ElonXState, Broadcast, CycleRun, ElonAgentState } from './store'
import type { PlanTree, PlanNode } from './elonPlan'
import type { Evidence } from './elonEvidence'

// ─────────────────────────────────────────────────────────────
// Observe Context Building
// ─────────────────────────────────────────────────────────────

function summarizePlanTree(planTree: PlanTree | null): string {
  if (!planTree || !planTree.root) {
    return 'No active plan tree.'
  }

  const countByStatus = (node: PlanNode, status: PlanNode['status']): number => {
    let count = node.status === status ? 1 : 0
    for (const child of node.children) {
      count += countByStatus(child, status)
    }
    return count
  }

  const findBottlenecks = (node: PlanNode): string[] => {
    const bottlenecks: string[] = []
    if (node.status === 'blocked' || node.status === 'failed') {
      bottlenecks.push(`${node.title} (${node.status})`)
    }
    for (const child of node.children) {
      bottlenecks.push(...findBottlenecks(child))
    }
    return bottlenecks
  }

  const running = countByStatus(planTree.root, 'running')
  const completed = countByStatus(planTree.root, 'completed')
  const blocked = countByStatus(planTree.root, 'blocked')
  const failed = countByStatus(planTree.root, 'failed')
  const pending = countByStatus(planTree.root, 'pending')
  const bottlenecks = findBottlenecks(planTree.root).slice(0, 5)

  return `Plan: "${planTree.problem}"
Status: ${planTree.status}
Progress: ${completed} completed, ${running} running, ${pending} pending, ${blocked} blocked, ${failed} failed
${bottlenecks.length > 0 ? `Bottlenecks: ${bottlenecks.join(', ')}` : 'No bottlenecks.'}`
}

function summarizeEvidences(evidences: Evidence[]): string {
  if (evidences.length === 0) {
    return 'No recent evidence.'
  }

  const recent = evidences.slice(0, 10)
  const summary = recent.map((e) => {
    const verdict = e.verdict === 'pass' ? '✓' : e.verdict === 'fail' ? '✗' : '⚠'
    return `- ${verdict} [${e.type}] ${e.title}: ${e.summary}`
  })

  return `Recent Evidence (${evidences.length} total):
${summary.join('\n')}`
}

function summarizeAgentStatuses(statuses: Record<string, ElonAgentState>): string {
  const agents = Object.values(statuses)
  if (agents.length === 0) {
    return 'No active agents.'
  }

  const summary = agents.slice(0, 10).map((a) => {
    const task = a.currentTask ? ` | task: ${a.currentTask.slice(0, 80)}` : ''
    const output = a.lastOutput ? ` | lastOutput: ${a.lastOutput.slice(0, 200)}` : ''
    return `- ${a.id}: ${a.status}${task}${output}`
  })

  return `Agent Status (${agents.length} agents):
${summary.join('\n')}`
}

function summarizeCycleHistory(cycleRuns: CycleRun[]): string {
  const recent = cycleRuns.filter((r) => r.status === 'completed').slice(0, 3)
  if (recent.length === 0) {
    return 'No previous cycles.'
  }

  const lines = recent.map((r) => {
    const summary = r.llmOutput?.cycleSummary ?? '(no summary)'
    const tasks = r.llmOutput?.topLeverage?.map((l) => `${l.assignee}: ${l.title}`).join('; ') ?? ''
    return `- Cycle ${r.id.slice(0, 8)} (${Math.round((Date.now() - (r.endedAt ?? r.startedAt)) / 60000)}m ago): ${summary}${tasks ? `\n  Tasks: ${tasks}` : ''}`
  })

  return `Recent Cycle History (${cycleRuns.length} total, showing last ${recent.length}):
${lines.join('\n')}`
}

function summarizeActiveBroadcasts(broadcasts: Broadcast[]): string {
  const active = broadcasts.filter((b) => b.status === 'active')
  if (active.length === 0) {
    return 'No active broadcasts.'
  }

  const lines = active.map((b) => {
    return `- To [${b.toAgentIds.join(', ')}]: ${b.message.slice(0, 120)}`
  })

  return `Currently Active Broadcasts (${active.length}):
${lines.join('\n')}`
}

export function buildObserveContext(elonX: ElonXState): string {
  const planSummary = summarizePlanTree(elonX.planTree)
  const evidenceSummary = summarizeEvidences(elonX.evidences)
  const agentSummary = summarizeAgentStatuses(elonX.agentStatuses)
  const cycleSummary = summarizeCycleHistory(elonX.cycleRuns)
  const broadcastSummary = summarizeActiveBroadcasts(elonX.broadcasts)

  return `## Current State (Observe)

${planSummary}

${evidenceSummary}

${agentSummary}

${cycleSummary}

${broadcastSummary}

IMPORTANT: Do NOT repeat the same directives from previous cycles. Review what agents already did (lastOutput) and active broadcasts above. Build on completed work, assign NEW next-step tasks, or pivot if previous approach was insufficient.`
}

// ─────────────────────────────────────────────────────────────
// CEO Prompt Generation
// ─────────────────────────────────────────────────────────────

export const CEO_SYSTEM_PROMPT = `You are the CEO of an AI-powered software company operating in ElonX HARD mode.

Your role:
1. OBSERVE: Analyze current state (plan tree, evidence, agent statuses)
2. PLAN: Identify top 1-3 leverage points that will move the needle most
3. ACT: Create clear, actionable broadcasts for each agent
4. EVALUATE: Consider risks and acceptance criteria

Principles:
- First Principles thinking: Challenge assumptions
- High Leverage: Focus on what matters most
- Short & Sharp: No fluff, direct communication
- Revenue-first: Prioritize actions that impact business
- Daily iteration: Ship fast, iterate faster

You MUST respond with valid JSON matching this exact schema:
{
  "cycleSummary": "1-2 sentence summary of current situation",
  "topLeverage": [
    {
      "title": "short task title",
      "assignee": "pm|swe-2|swe-3",
      "why": "1 line explaining leverage/impact",
      "risk": "low|medium|high",
      "evidenceIds": [],
      "acceptance": ["criterion 1", "criterion 2"]
    }
  ],
  "broadcasts": [
    {
      "to": "agent-id",
      "message": "1-3 line directive",
      "expiresMins": 60
    }
  ],
  "needsExternalData": false
}

Available agents: pm, swe-2, swe-3
Only output valid JSON. No markdown, no explanation.`

export function buildCeoPrompt(observeContext: string): string {
  return `${CEO_SYSTEM_PROMPT}

${observeContext}

Based on the current state above, identify the top leverage opportunities and create broadcasts for the agents.
Respond with JSON only.`
}

/**
 * Build separate system/user messages for xAI API direct call.
 */
export function buildCeoMessages(observeContext: string): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: CEO_SYSTEM_PROMPT,
    userPrompt: `${observeContext}

Based on the current state above, identify the top leverage opportunities and create broadcasts for the agents.
Respond with JSON only.`,
  }
}

// ─────────────────────────────────────────────────────────────
// JSON Output Parsing
// ─────────────────────────────────────────────────────────────

export function parseCeoLlmOutput(rawOutput: string): CeoLlmOutput {
  // Try to extract JSON from the response
  let jsonStr = rawOutput.trim()

  // Handle markdown code blocks
  const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  // Parse JSON
  const parsed = JSON.parse(jsonStr)

  // Validate required fields
  if (typeof parsed.cycleSummary !== 'string') {
    throw new Error('Missing cycleSummary')
  }
  if (!Array.isArray(parsed.topLeverage)) {
    throw new Error('Missing topLeverage array')
  }
  if (!Array.isArray(parsed.broadcasts)) {
    throw new Error('Missing broadcasts array')
  }

  // Validate and normalize topLeverage items
  const topLeverage: TopLeverageItem[] = parsed.topLeverage.map((item: unknown, idx: number) => {
    const i = item as Record<string, unknown>
    if (!i.title || !i.assignee) {
      throw new Error(`Invalid topLeverage item at index ${idx}`)
    }
    return {
      title: String(i.title),
      assignee: String(i.assignee),
      why: String(i.why || ''),
      risk: (['low', 'medium', 'high'].includes(String(i.risk)) ? i.risk : 'low') as 'low' | 'medium' | 'high',
      evidenceIds: Array.isArray(i.evidenceIds) ? i.evidenceIds.map(String) : [],
      acceptance: Array.isArray(i.acceptance) ? i.acceptance.map(String) : [],
    }
  })

  // Validate and normalize broadcasts
  const broadcasts = parsed.broadcasts.map((item: unknown, idx: number) => {
    const b = item as Record<string, unknown>
    if (!b.to || !b.message) {
      throw new Error(`Invalid broadcast at index ${idx}`)
    }
    return {
      to: String(b.to),
      message: String(b.message),
      expiresMins: typeof b.expiresMins === 'number' ? b.expiresMins : 60,
    }
  })

  return {
    cycleSummary: String(parsed.cycleSummary),
    topLeverage,
    broadcasts,
    needsExternalData: Boolean(parsed.needsExternalData),
  }
}

// ─────────────────────────────────────────────────────────────
// Agent Prompt Builder & Output Parser
// ─────────────────────────────────────────────────────────────

import { getWorkflowByAgentId, type AgentWorkflow } from './elonWorkflows'

export interface AgentPromptMessages {
  systemPrompt: string
  userPrompt: string
}

/**
 * Build system/user prompts for an agent to process a CEO broadcast.
 *
 * @param agentId - The agent identifier (e.g., 'pm', 'swe-2', 'swe-3')
 * @param broadcastMessage - The broadcast directive from the CEO
 * @param workflow - Optional workflow override; defaults to looking up by agentId
 */
export function buildAgentPrompt(
  agentId: string,
  broadcastMessage: string,
  workflow?: AgentWorkflow,
): AgentPromptMessages {
  const wf = workflow ?? getWorkflowByAgentId(agentId)

  const principles = wf?.xaiPrinciples?.join('\n- ') ?? 'Extreme autonomy, high leverage, fast iteration'
  const description = wf?.description ?? `Agent ${agentId}`
  const name = wf?.name ?? agentId

  const isPm = agentId === 'pm'

  const webSearchNote = isPm
    ? `\n\nYou have web search capability. When researching, actively search for:
- Real-time market data, competitor information, and industry trends
- Latest news, product launches, and technology updates
- Pricing data, user reviews, and market positioning
- Regulatory changes and industry benchmarks
Cite specific sources and data points in your analysis.\n`
    : ''

  const systemPrompt = `You are ${name}, an autonomous agent in an ElonX HARD organization.

Role: ${description}${webSearchNote}

Principles:
- ${principles}

You receive directives from the CEO and must execute them autonomously.
You MUST respond with valid JSON matching this schema:
{
  "actions": [
    {
      "type": "string (e.g., create_issue, write_code, review_pr, analyze, plan, report)",
      "title": "short action title",
      "detail": "what you did or will do",
      "files": ["optional list of file paths affected"]
    }
  ],
  "status": "completed | in_progress | blocked",
  "output": "1-3 sentence summary of your work and results"
}

Only output valid JSON. No markdown, no explanation outside JSON.`

  const userPrompt = `CEO Broadcast Directive:
${broadcastMessage}

Execute this directive now. Analyze what needs to be done, take action, and report results.
Respond with JSON only.`

  return { systemPrompt, userPrompt }
}

export interface AgentOutput {
  actions: Array<{
    type: string
    title: string
    detail: string
    files?: string[]
  }>
  status: 'completed' | 'in_progress' | 'blocked'
  output: string
}

/**
 * Parse raw LLM output from an agent into structured AgentOutput.
 */
export function parseAgentOutput(rawOutput: string): AgentOutput {
  let jsonStr = rawOutput.trim()

  // Handle markdown code blocks
  const jsonMatch = rawOutput.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim()
  }

  const parsed = JSON.parse(jsonStr)

  // Validate required fields
  if (!Array.isArray(parsed.actions)) {
    throw new Error('Missing actions array in agent output')
  }
  if (typeof parsed.status !== 'string') {
    throw new Error('Missing status in agent output')
  }
  if (typeof parsed.output !== 'string') {
    throw new Error('Missing output in agent output')
  }

  const actions = parsed.actions.map((a: Record<string, unknown>, idx: number) => {
    if (!a.type || !a.title) {
      throw new Error(`Invalid action at index ${idx}`)
    }
    return {
      type: String(a.type),
      title: String(a.title),
      detail: String(a.detail ?? ''),
      files: Array.isArray(a.files) ? a.files.map(String) : undefined,
    }
  })

  const status = (['completed', 'in_progress', 'blocked'].includes(String(parsed.status))
    ? parsed.status
    : 'completed') as AgentOutput['status']

  return {
    actions,
    status,
    output: String(parsed.output),
  }
}

// ─────────────────────────────────────────────────────────────
// LLM Call Helper
// ─────────────────────────────────────────────────────────────

export interface CeoLlmCallResult {
  output: CeoLlmOutput
  rawResponse: string
  runId: string
}

/**
 * Execute a CEO cycle LLM call.
 *
 * This function:
 * 1. Builds the observe context from current elonX state
 * 2. Creates the CEO prompt
 * 3. Calls the LLM via daemon
 * 4. Parses the JSON response
 *
 * @param daemon - The daemon client
 * @param elonX - Current ElonX state
 * @param sessionId - Session ID for the run
 * @returns Parsed CEO LLM output
 */
export async function executeCeoLlmCall(
  daemon: { runStart: (params: { prompt: string; sessionId: string; model?: string }) => Promise<{ runId: string }> },
  elonX: ElonXState,
  sessionId: string,
  waitForResponse: (runId: string, timeoutMs?: number) => Promise<string>,
): Promise<CeoLlmCallResult> {
  const observeContext = buildObserveContext(elonX)
  const prompt = buildCeoPrompt(observeContext)

  // Start the run
  const { runId } = await daemon.runStart({
    prompt,
    sessionId,
    model: 'grok-4', // CEO uses Grok4
  })

  // Wait for the response
  const rawResponse = await waitForResponse(runId, 60000)

  // Parse the output
  const output = parseCeoLlmOutput(rawResponse)

  return { output, rawResponse, runId }
}
