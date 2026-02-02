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
      "assignee": "pm|swe-2|swe-3|ai-ml",
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

Available agents: pm, swe-2, swe-3, ai-ml
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
import { AGENT_DISCIPLINE } from './xaiCulture'

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
  knowledgeContext?: string,
): AgentPromptMessages {
  const wf = workflow ?? getWorkflowByAgentId(agentId)

  const principles = wf?.xaiPrinciples?.join('\n- ') ?? 'Extreme autonomy, high leverage, fast iteration'
  const description = wf?.description ?? `Agent ${agentId}`
  const name = wf?.name ?? agentId

  const isPm = agentId === 'pm'
  const isAiMl = agentId === 'ai-ml'

  const webSearchNote = isPm
    ? `\n\nYou have web search capability. When researching, actively search for:
- Real-time market data, competitor information, and industry trends
- Latest news, product launches, and technology updates
- Pricing data, user reviews, and market positioning
- Regulatory changes and industry benchmarks
Cite specific sources and data points in your analysis.\n`
    : isAiMl
    ? `\n\nYou have web search capability. When researching, actively search for:
- SOTA model architectures, benchmarks (MMLU, HumanEval, SWE-bench)
- Latest AI/ML papers, arxiv preprints, and research breakthroughs
- Model optimization techniques, inference costs, and scaling strategies
- Prompt engineering patterns (CoT, ToT, self-critique, reward shaping)
- Multi-agent orchestration patterns and agentic workflow research
Cite specific sources, papers, and data points in your analysis.\n`
    : ''

  // Build AGENT_DISCIPLINE block (common rulebook for ALL agents)
  const disciplineBlock = `## xAI Engineer Rulebook (MUST FOLLOW)
Before Task:
${AGENT_DISCIPLINE.beforeTask.map((r) => `- ${r}`).join('\n')}
During Task:
${AGENT_DISCIPLINE.duringTask.map((r) => `- ${r}`).join('\n')}
After Task:
${AGENT_DISCIPLINE.afterTask.map((r) => `- ${r}`).join('\n')}
When Blocked:
${AGENT_DISCIPLINE.blocked.map((r) => `- ${r}`).join('\n')}
Communication:
${AGENT_DISCIPLINE.communication.map((r) => `- ${r}`).join('\n')}`

  const systemPrompt = `${disciplineBlock}

You are ${name}, an autonomous agent in an ElonX HARD organization.

Role: ${description}${webSearchNote}

Principles:
- ${principles}

You receive directives from the CEO and must execute them autonomously.

CRITICAL RULES:
1. First Principles: Always ask "Why is this needed?" and "Could the assumption be wrong?"
2. Highest Leverage: Before executing, confirm this is the throughput ×N task. Skip if not.
3. Improvements Required: Every cycle MUST produce at least 1 improvement. Empty improvements = failure.
4. Evidence Required: Every action MUST include evidence (log, latency, cost, or screenshot).
5. Ownership: If you discover a gap/hole, create an Issue for it immediately.
6. Challenge: Ask "Why isn't it done already?" for every delay.
7. Direct Message: If you need another agent's help, send a directMessage instead of waiting.

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
  "output": "1-3 sentence summary of your work and results",
  "improvements": ["at least 1 improvement made this cycle (REQUIRED, cannot be empty)"],
  "evidence": {
    "log": "optional: relevant log output or test results",
    "latencyMs": 0,
    "costUsd": 0
  },
  "directMessages": [
    {
      "to": "agent-id (e.g., swe-2, pm)",
      "message": "direct message to another agent (optional)"
    }
  ]
}

Only output valid JSON. No markdown, no explanation outside JSON.`

  const knowledgeBlock = knowledgeContext
    ? `\n\n## Relevant Knowledge from Previous Cycles\n${knowledgeContext}\n`
    : ''

  const userPrompt = `CEO Broadcast Directive:
${broadcastMessage}${knowledgeBlock}

Execute this directive now. Analyze what needs to be done, take action, and report results.
Respond with JSON only.`

  return { systemPrompt, userPrompt }
}

export interface AgentOutputEvidence {
  log?: string
  screenshotUrl?: string
  latencyMs?: number
  costUsd?: number
}

export interface AgentOutputDirectMessage {
  to: string
  message: string
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
  improvements: string[]
  evidence?: AgentOutputEvidence
  directMessages?: AgentOutputDirectMessage[]
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

  // Parse improvements (Rule 3: required, empty = failure)
  const improvements: string[] = Array.isArray(parsed.improvements)
    ? parsed.improvements.map(String).filter(Boolean)
    : []

  // Parse evidence (Rule 8)
  let evidence: AgentOutputEvidence | undefined
  if (parsed.evidence && typeof parsed.evidence === 'object') {
    const ev = parsed.evidence as Record<string, unknown>
    evidence = {
      log: typeof ev.log === 'string' ? ev.log : undefined,
      screenshotUrl: typeof ev.screenshotUrl === 'string' ? ev.screenshotUrl : undefined,
      latencyMs: typeof ev.latencyMs === 'number' ? ev.latencyMs : undefined,
      costUsd: typeof ev.costUsd === 'number' ? ev.costUsd : undefined,
    }
  }

  // Parse directMessages (Rule 6: peer-to-peer)
  let directMessages: AgentOutputDirectMessage[] | undefined
  if (Array.isArray(parsed.directMessages)) {
    directMessages = parsed.directMessages
      .filter((dm: unknown) => {
        const d = dm as Record<string, unknown>
        return typeof d.to === 'string' && typeof d.message === 'string'
      })
      .map((dm: unknown) => {
        const d = dm as Record<string, unknown>
        return { to: String(d.to), message: String(d.message) }
      })
  }

  return {
    actions,
    status,
    output: String(parsed.output),
    improvements,
    evidence,
    directMessages,
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

// ─────────────────────────────────────────────────────────────
// Phase 1: Self-Correction — Reflection Prompts
// ─────────────────────────────────────────────────────────────

export function buildSelfReflectionPrompt(
  agentId: string,
  originalPrompt: string,
  rawResponse: string,
  errorMessage: string,
  attempt: number,
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a self-reflection module for agent "${agentId}".
Your job is to analyze why a task failed and produce an improved directive.

You MUST respond with valid JSON:
{
  "rootCause": "1 sentence describing why it failed",
  "improvements": ["improvement 1", "improvement 2"],
  "revisedDirective": "the full improved directive text for the agent to retry"
}

Only output valid JSON. No markdown, no explanation.`

  const userPrompt = `Attempt ${attempt} of 3 failed.

Original Directive:
${originalPrompt}

${rawResponse ? `Agent Response (before failure):\n${rawResponse.slice(0, 500)}\n` : ''}
Error:
${errorMessage}

Analyze the failure root cause. Produce an improved directive that avoids this error.
The revised directive should be self-contained and actionable.
Respond with JSON only.`

  return { systemPrompt, userPrompt }
}

export function parseSelfReflectionOutput(raw: string): {
  rootCause: string
  improvements: string[]
  revisedDirective: string
} {
  let jsonStr = raw.trim()
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      rootCause: String(parsed.rootCause ?? 'Unknown'),
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : [],
      revisedDirective: String(parsed.revisedDirective ?? raw),
    }
  } catch {
    // If JSON parse fails, use raw as revised directive
    return {
      rootCause: 'Failed to parse reflection output',
      improvements: [],
      revisedDirective: raw.slice(0, 1000),
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Phase 2: Knowledge Sharing — Extract & Inject
// ─────────────────────────────────────────────────────────────

import type { KnowledgeEntry, Broadcast, MeetingMessage } from './store'

export function extractKnowledgeFromOutput(
  agentId: string,
  agentOutput: AgentOutput,
  broadcastMessage: string,
  cycleRunId: string,
): KnowledgeEntry | null {
  if (agentOutput.actions.length < 2 || agentOutput.output.length < 100) {
    return null
  }

  // Extract topic from action types
  const actionTypes = agentOutput.actions.map((a) => a.type).join(', ')
  const words = broadcastMessage.toLowerCase().split(/\s+/)
  const topicKeywords = words.filter((w) => w.length > 4).slice(0, 3)
  const topic = topicKeywords.join('-') || actionTypes.split(',')[0]?.trim() || 'general'

  // Build tags from action types and keywords
  const tags = [
    ...new Set([
      ...agentOutput.actions.map((a) => a.type),
      ...topicKeywords,
    ]),
  ].slice(0, 5)

  return {
    id: crypto.randomUUID(),
    agentId,
    cycleRunId,
    topic,
    insight: agentOutput.output.slice(0, 300),
    context: broadcastMessage.slice(0, 200),
    reasoning: agentOutput.actions.map((a) => `${a.type}: ${a.title}`).join('; ').slice(0, 300),
    createdAt: Date.now(),
    useCount: 0,
    successRate: 1,
    tags,
  }
}

export function buildKnowledgeContext(
  knowledgeBase: KnowledgeEntry[],
  broadcastMessage: string,
  currentAgentId: string,
): string {
  if (knowledgeBase.length === 0) return ''

  const words = broadcastMessage.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  if (words.length === 0) return ''

  // Score each knowledge entry by keyword relevance
  const scored = knowledgeBase.map((k) => {
    const text = `${k.topic} ${k.insight} ${k.tags.join(' ')} ${k.context}`.toLowerCase()
    let score = 0
    for (const word of words) {
      if (text.includes(word)) score++
    }
    // Boost entries from same agent
    if (k.agentId === currentAgentId) score += 0.5
    // Boost high success rate
    score += k.successRate * 0.5
    return { entry: k, score }
  })

  const relevant = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  if (relevant.length === 0) return ''

  return relevant
    .map((r) => `- [${r.entry.agentId}] ${r.entry.topic}: ${r.entry.insight} (success: ${Math.round(r.entry.successRate * 100)}%)`)
    .join('\n')
}

// ─────────────────────────────────────────────────────────────
// Phase 3: Meeting Simulation — Prompt Builders
// ─────────────────────────────────────────────────────────────

export function shouldStartMeeting(
  broadcast: Broadcast,
  allAgentIds: string[],
): string[] | null {
  const msg = broadcast.message.toLowerCase()
  const isLong = broadcast.message.length > 300

  // Design/architecture topics → PM + SWE + (UX if available)
  if (/design|architect|refactor|restructur/i.test(msg)) {
    const participants = ['pm', ...allAgentIds.filter((id) => id.startsWith('swe'))].slice(0, 4)
    return [...new Set(participants)]
  }

  // Strategy topics → CEO-level discussion
  if (/strateg|roadmap|pivot|priority|direction/i.test(msg)) {
    const participants = ['pm', ...allAgentIds.filter((id) => id !== 'pm')].slice(0, 4)
    return [...new Set(participants)]
  }

  // Complex tasks (long message) → broadcast targets + PM + SWE
  if (isLong) {
    const participants = [...broadcast.toAgentIds, 'pm', ...allAgentIds.filter((id) => id.startsWith('swe'))].slice(0, 4)
    return [...new Set(participants)]
  }

  return null
}

export function buildMeetingPrompt(
  agentId: string,
  topic: string,
  previousMessages: MeetingMessage[],
  round: number,
): { systemPrompt: string; userPrompt: string } {
  const wf = getWorkflowByAgentId(agentId)
  const roleName = wf?.name ?? agentId

  const systemPrompt = `You are ${roleName} in a multi-agent meeting discussion.
Your role perspective: ${wf?.description ?? `Agent ${agentId}`}

Rules:
- Share your perspective in 2-4 sentences
- Reference previous speakers if relevant
- Be constructive and solution-oriented
- Focus on your area of expertise

Respond with plain text (not JSON). Keep it concise.`

  const previousContext = previousMessages.length > 0
    ? `\nPrevious Discussion:\n${previousMessages.map((m) => `[${m.agentId} R${m.roundNumber}]: ${m.content}`).join('\n')}\n`
    : ''

  const userPrompt = `Meeting Topic: ${topic}
Round: ${round}${previousContext}
Share your perspective on this topic. What should we consider from your expertise area?`

  return { systemPrompt, userPrompt }
}

export function buildMeetingSynthesisPrompt(
  topic: string,
  allMessages: MeetingMessage[],
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a meeting facilitator synthesizing discussion results.

CRITICAL: Verify that the decision includes at least 1 concrete improvement over previous approach.
Ask: "What specifically improved? If nothing improved, the meeting failed."

You MUST respond with valid JSON:
{
  "decision": "the actionable decision (1-3 sentences)",
  "consensusLevel": 0.85,
  "keyPoints": ["point 1", "point 2"],
  "dissent": "any disagreements or concerns, or null",
  "improvementFromPrevious": "what specifically improved compared to before this meeting"
}

Only output valid JSON. No markdown, no explanation.`

  const transcript = allMessages
    .map((m) => `[${m.agentId} R${m.roundNumber}]: ${m.content}`)
    .join('\n')

  const userPrompt = `Meeting Topic: ${topic}

Full Transcript:
${transcript}

Synthesize the discussion into a clear, actionable decision. Assess consensus level (0 to 1).
Respond with JSON only.`

  return { systemPrompt, userPrompt }
}

export function parseMeetingDecision(raw: string): {
  decision: string
  consensusLevel: number
  keyPoints: string[]
  dissent: string | null
} {
  let jsonStr = raw.trim()
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) jsonStr = jsonMatch[1].trim()

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      decision: String(parsed.decision ?? 'No clear decision reached'),
      consensusLevel: typeof parsed.consensusLevel === 'number' ? Math.max(0, Math.min(1, parsed.consensusLevel)) : 0.5,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.map(String) : [],
      dissent: parsed.dissent ? String(parsed.dissent) : null,
    }
  } catch {
    return {
      decision: raw.slice(0, 500),
      consensusLevel: 0.5,
      keyPoints: [],
      dissent: null,
    }
  }
}
