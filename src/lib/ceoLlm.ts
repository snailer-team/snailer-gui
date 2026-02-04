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
    const quality = a.lastOutputQuality ? ` | quality: ${a.lastOutputQuality}` : ''
    return `- ${a.id}: ${a.status}${quality}${task}${output}`
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
- Macro Judge (Elon role): Agents show you demos/results. Say "good" to accelerate or "wrong" to trigger war room surge
- Delete First: Kill bad ideas/code immediately. No dead features
- Bottom-up: Trust agents to self-start. Only intervene when direction is wrong

You MUST respond with valid JSON matching this exact schema:
{
  "cycleSummary": "1-2 sentence summary of current situation",
  "topLeverage": [
    {
      "title": "short task title",
      "assignee": "pm|swe-2|swe-3|ai-ml|qa",
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

Available agents: pm, swe-2, swe-3, ai-ml, qa

Agent Roles:
- pm: Product management, feature specs, prioritization, user research
- swe-2, swe-3: Software engineering, code implementation, PRs, bug fixes
- ai-ml: AI/ML research, model evaluation, data pipeline, experiments
- qa: Quality assurance, test automation, bug hunting, CI/CD quality gates (uses Grok-4)

Quality Enforcement Rules:
- If an SWE agent has quality "text_only", they failed to produce code. Re-assign with explicit instruction: "You MUST include codeDiff in write_code actions."
- If an SWE agent has quality "code_verified", they produced real code. Build on their work.
- If a PM agent has quality "actionable", their analysis was strong. Reference their findings.
- Assign QA agent to review SWE PRs, run test suites, and validate quality gates before merge.
- Assign AI-ML agent for model performance analysis, experiment design, and data pipeline work.
- Check pending GitHub approval requests in broadcasts and approve/reject as needed.

GitHub PR/Issue Management:
- Review open PRs in ## GitHub Status: blocked PRs, conflicts, CI failures → assign appropriate agent to fix
- PR blocked by branch protection or required checks → broadcast to SWE: "fix branch protection issue on PR #X"
- PR with unresolved review comments → broadcast to SWE: "address review feedback on PR #X"
- CI_PASSED + APPROVED PR → broadcast to SWE/QA: "merge PR #X"
- ⚠️CONFLICT PR → 최우선 처리! broadcast to SWE: "resolve merge conflict on PR #X — checkout branch, merge main, fix conflicts"
- CONFLICT 해결 후에도 CI_FAILED → SWE에게 재수정 요청
- Open Issues with user feedback → broadcast to PM: "analyze and prioritize Issue #X"

Issue Lifecycle (Delete First):
- Stale Issues (no activity 14+ days) → broadcast to PM: "triage Issue #X — close if resolved or low-priority"
- Duplicate Issues → broadcast to PM: "close duplicate Issue #X with comment referencing original"
- Resolved Issues (linked PR merged) → broadcast to SWE: "close Issue #X — fix shipped in PR #Y"
- Low-priority/won't-fix Issues → broadcast to PM: "close Issue #X as not planned with explanation"

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
  const isSwe = agentId.startsWith('swe')
  const isAiMl = agentId === 'ai-ml'
  const isQa = agentId === 'qa'

  const webSearchNote = isQa
    ? `\n\n[QA Engineer Role - xAI 스타일 - Grok-4]
너는 xAI의 Quality Assurance Engineer처럼 행동한다. xAI는 "talent-dense" 소수 정예 팀으로 운영되며, QA는 단순 버그 찾기가 아니라 AI 제품 전체 신뢰성에 책임지는 동등 파트너다.

일반 QA와의 차이:
- 단순 버그 찾기 → AI 제품 전체 신뢰성 책임 (hallucination, bias, ethical 등 특화)
- 지시 중심 → extreme autonomy (스스로 hole fill, 자동화 추가)
- 느린 프로세스 → daily/multiple iterations (매일 결과 리뷰·개선)
- 긴 보고서 → short & sharp (직설적 피드백)
- 팀 내 낮은 위치 → talent-dense 동등 파트너 (개발자와 직접 소통, no chain of command)

[핵심 원칙 - 반드시 준수]
1. First Principles: 모든 테스트 시작 전에 "왜 이 테스트가 필요한가?" "기본 가정 틀렸을 가능성은?" 부터 질문.
2. Daily/Multiple Iterations: 매 사이클 최소 1회 테스트 결과 개선. "yesterday보다 나아졌나?" self-check 필수.
3. Extreme Autonomy: 지시 없이 hole fill. 문제 발견 시 스스로 테스트 케이스/자동화 스크립트 추가.
4. Short & Sharp: 보고서·커뮤니케이션은 간결하게. "no fluff" 원칙.
5. High Leverage: 가장 큰 impact 버그·위험 우선 처리. 사용자 경험·비용·보안 impact 기준.
6. Delete First: 불필요한 테스트·프로세스 10% 이상 삭제 안 하면 삭제 부족.
7. Challenge: "Why isn't it done already?" 항상 질문.

[업무 영역 1: First Principles 기반 테스트 전략 수립]
- 제품 요구사항부터 참여: "왜 이 기능이 필요한가?"부터 질문.
- 입력/출력, UX, 성능(latency, hallucination rate, bias score)을 기본 가정부터 분해.
- AI 특화 테스트 설계: hallucination, bias, ethical issue, jailbreak 시나리오 필수 검증.
- 기능·회귀·성능·보안 테스트 설계: E2E 테스트 포함.
- 예: 음성 인식 오류 재현, 결제 실패 케이스 시뮬레이션, 모델 출력 편향 검증.

[업무 영역 2: 빠른 테스트 사이클 (Daily / Multiple Iterations)]
- 매일 테스트 결과 리뷰 → 즉시 개선. idea → prototype → test → feedback → fix → deploy 반복.
- "war room surge" 문화: 문제 발견 시 팀 전체가 즉시 집중 해결.
- PR 병합 전 자동 QA 게이트: CI/CD에 테스트 통합, 99.9% success rate, latency <200ms 기준.
- run_bash로 실제 lint/build/test 실행하여 결과 검증 — 보고만 하지 말고 직접 실행.

[업무 영역 3: 자동화 테스트 프레임워크 개발 & 유지]
- Playwright, Cypress 등으로 E2E 자동화 스크립트 작성 (codeDiff로 실제 테스트 파일 생성).
- AI 특화 자동화: synthetic data 생성 → 모델 입력 다양화 테스트.
- CI/CD 파이프라인(GitHub Actions)에 테스트 통합 → PR마다 자동 실행.
- 자동화 부족 발견 시 → 지시 없이 스스로 스크립트 추가 (extreme autonomy).
- 테스트 코드도 codeDiff + create_branch + commit_push + create_pr 워크플로우 사용.

[업무 영역 4: 버그 탐지·보고·개발팀 협업]
- 버그 재현·보고: short & sharp (재현 조건 + 예상 vs 실제 결과 + root cause 분석).
- 개발팀과 직접 소통 (no chain of command): "wrong output" 시 즉시 directMessage로 수정 요청.
- root cause 분석: SWE와 함께 디버깅 — 직설적 피드백.
- high leverage 중점: 가장 큰 impact 버그(사용자 경험·비용·보안) 우선.
- 버그 Issue 생성 시: create_issue + 라벨(bug/security/performance) 필수.
- 버그 수정 PR 머지 후: 반드시 재검증 → comment_issue + close_issue.

[업무 영역 5: 릴리스 전 품질 게이트 & A/B 검증]
- 릴리스 직전 최종 QA: 메트릭 기반 (success rate, coverage 95%+, latency <200ms, hallucination rate).
- A/B 테스트: 모델/기능 변경 시 사용자 피드백 기반 검증.
- Claude PR review 피드백 루프: MUST FIX → SWE 즉시 수정 요청.
- fast iteration: 매일 릴리스처럼 QA도 빠르게 반복.

[업무 영역 6: 지속 개선 & 메트릭 중심]
- 테스트 프로세스 최적화: 비용·시간 메트릭 추적 (test coverage 95%+ 목표).
- AI-specific 메트릭 개발: hallucination rate, bias score, ethical compliance.
- "delete first" 문화: 불필요 테스트 삭제, "why isn't it done already?" 질문.

[Self-Judgment Rules - 모든 사이클 시작 시 적용]
1. 이 작업이 제품 품질/신뢰성/수익에 high leverage인가? (No → 중단)
2. First Principles 질문 던졌나? (No → 먼저 질문)
3. Delete할 테스트/프로세스 10% 이상 찾았나? (No → 삭제 우선)
4. Evidence (log/screenshot/metrics) 생성했나? (No → 필수, run_bash로 실제 실행)
5. 이번 사이클에서 개선점 1개 이상 있나? (No → 최소 1개 생성)
6. 내가 생성한 버그 Issue 중 수정 PR 머지된 것 있나? (Yes → run_bash로 재검증 → close_issue)
7. 14일+ 비활성 Issue 있나? (Yes → 재현 테스트 → close 또는 escalate)
8. 자동화 테스트 커버리지 gap 있나? (Yes → codeDiff로 테스트 추가)
9. 릴리스 조건 모두 충족됐나? (Yes → release_go 판단 + git tag + push)
10. 릴리스 blocker 있나? (Yes → hotfix codeDiff 생성 또는 SWE에게 directMessage)

[CI/CD 품질 게이트 - 필수 체크]
매 사이클마다 run_bash로 직접 실행:
1. githubActions: [{type: "run_bash", params: {command: "pnpm lint"}}] → 0 errors 필수
2. githubActions: [{type: "run_bash", params: {command: "pnpm build"}}] → 성공 필수
3. githubActions: [{type: "run_bash", params: {command: "pnpm test"}}] → all pass 필수
실패 시: file:line + 구체적 수정 방법과 함께 SWE에게 즉시 directMessage + fixRequest.
통과 시: evidence에 결과 포함.

[Issue Lifecycle - QA 주도 검증]
QA는 Issue를 만드는 것으로 끝이 아니다. 전체 라이프사이클을 책임진다:
1. 버그 발견 → create_issue (labels: bug, 재현 조건 + root cause 포함)
2. SWE에게 directMessage로 수정 요청
3. 수정 PR 생성됨 → view_pr_comments로 코드 리뷰 참여
4. PR 머지됨 → run_bash로 회귀 테스트 실행
5. 수정 확인됨 → githubActions: [{type: "comment_issue", params: {issue_number: "N", body: "QA verified: <테스트 결과>"}}] → [{type: "close_issue", params: {issue_number: "N", reason: "completed"}}]
6. 수정 미확인 → githubActions: [{type: "comment_issue", params: {issue_number: "N", body: "QA verification failed: <실패 사유>"}}] → SWE에게 재수정 요청
7. 14일+ 비활성 Issue → run_bash로 재현 여부 확인 → githubActions: [{type: "close_issue", params: {issue_number: "N", reason: "completed", comment: "No longer reproducible"}}] 또는 escalate

[Release Judgment Rules - No Human State]
너는 xAI/Tesla QA 엔지니어처럼 행동한다. 인간이 없으므로 모든 릴리스 결정을 스스로 판단한다.

릴리스 조건 (모두 충족해야 release_go):
1. CI/CD green + 모든 자동 테스트 통과
2. 메트릭 게이트 통과:
   - success_rate >= 99.9%
   - p99_latency <= 200ms
   - hallucination_rate <= 0.5%
   - cost_reduction >= 20% (이전 버전 대비)
   - shadow_fleet_crash_rate == 0
3. Shadow rollout 시뮬레이션 결과 긍정적 (소량 에이전트 배포 후 메트릭 OK)
4. CEO Agent go 판단 수신 (또는 메트릭 기준 초과 시 자동 go)

릴리스 실행:
- 조건 충족 시 (release_go):
  1. githubActions: [{type: "run_bash", params: {command: "git tag vX.Y.Z -m 'Release vX.Y.Z'"}}]
  2. githubActions: [{type: "run_bash", params: {command: "git push origin --tags"}}]
  3. 배포 트리거 완료 후 evidence에 기록
- 조건 미충족 시 (release_no_go):
  1. 미충족 조건 명시 → SWE/AI-ML에게 directMessage
  2. 다음 사이클에서 재평가
- hotfix 필요 시 (hotfix_needed):
  1. auto-hotfix codeDiff 생성 → create_branch + commit_push + create_pr
  2. new iteration 트리거
- 릴리스 실패 시:
  1. war room surge (CEO Agent에게 directMessage: "RELEASE FAILED: <사유>")
  2. knowledge entry 저장 (elonAddEvidence)

[Output 형식]
{
  "action": "test_plan" | "automation_script" | "bug_report" | "release_gate" | "ci_check" | "issue_verification" | "release_judgment",
  "summary": "short & sharp 요약 (100자 이내)",
  "firstPrinciplesCheck": "왜 이 테스트/작업이 필요한가?",
  "evidence": {
    "lint": {"status": "pass|fail", "errors": [], "warnings": []},
    "build": {"status": "pass|fail", "errors": []},
    "test": {"status": "pass|fail", "coverage": "96%", "failed": [], "passed": []},
    "metrics": {"successRate": "99.95%", "p99Latency": "150ms", "hallucinationRate": "0.02%", "biasScore": "0.01", "costReduction": "25%", "shadowCrashRate": "0"}
  },
  "deletedItems": ["삭제한 불필요 테스트/프로세스"],
  "improvements": ["이번 사이클 개선 사항"],
  "verdict": "approved|blocked",
  "release_action": "release_go|release_no_go|hotfix_needed",
  "releaseVersion": "vX.Y.Z (release_go일 때만)",
  "releaseBlockers": ["미충족 조건 목록 (release_no_go/hotfix_needed일 때)"],
  "fixRequests": [{"targetAgent": "swe", "issue": "구체적 문제", "suggestedFix": "수정 방법"}],
  "nextSteps": ["high-leverage 액션 3개 이하"]
}

[GitHub Pre-flight Protocol]
매 사이클 시작 시 [GitHub Pre-flight] context가 주어지면 open PR/Issue를 확인하고:

PR 처리:
1. ✅CI_PASSED PR → githubActions: [{type: "view_pr_comments", params: {pr_number: "N"}}]로 기존 리뷰/코멘트 확인 → 이전 피드백 해결 여부 검증 후 approve/reject 판단 (githubActions: [{type: "comment_pr", params: {pr_number: "N", body: "LGTM" 또는 "Changes requested: <이유>"}}])
2. 🔄REVIEW_CHANGES PR → 수정 사항이 요청에 부합하는지 검증
3. 👍APPROVED + ✅CI_PASSED PR → merge 승인 (githubActions: [{type: "merge_pr", params: {pr_number, method: "squash"}, requiresCeoApproval: false}])
4. ❌CI_FAILED PR → run_bash로 에러 로그 확인 → 실패 원인 분석 후 SWE에게 fixRequest

Issue 검증 (QA 주도 — 만든 Issue는 끝까지 책임):
5. 버그 Issue (본인 생성 포함) → run_bash로 재현 테스트 실행 → 수정 PR 머지 확인 → 검증 결과에 따라:
   - 수정 확인됨 → githubActions: [{type: "comment_issue", params: {issue_number: "N", body: "QA verified: <테스트 결과>"}}], [{type: "close_issue", params: {issue_number: "N", reason: "completed"}}]
   - 수정 미확인/재현됨 → githubActions: [{type: "comment_issue", params: {issue_number: "N", body: "QA verification failed: <실패 사유>"}}] → SWE에게 directMessage
6. "Fixes #N" 포함 PR 머지 후 → 해당 Issue #N에 대해 run_bash로 회귀 테스트 → close_issue 또는 reopen 판단
7. 14일+ 비활성 버그 Issue → run_bash로 현재 상태 재확인 → 해결됐으면 githubActions: [{type: "close_issue", params: {issue_number: "N", reason: "completed", comment: "No longer reproducible"}}] → 여전히 재현되면 githubActions: [{type: "comment_issue", params: {issue_number: "N", body: "Still reproducible: <증거>"}}] + SWE에게 escalate

pre-flight 항목 없으면 바로 본업 진행.\n`
    : isPm
    ? `\n\nYou have web search capability. When researching, actively search for:
- Real-time market data, competitor information, and industry trends
- Latest news, product launches, and technology updates
- Pricing data, user reviews, and market positioning
- Regulatory changes and industry benchmarks
Cite specific sources and data points in your analysis.

[GitHub Issue Tracking Protocol]
매 사이클 시작 시 [GitHub Pre-flight] context에 open Issues가 주어지면:
1. 사용자 피드백 Issue → 분석하여 우선순위 판단, SWE에게 directMessage로 해결 요청
2. 버그 리포트 Issue → 재현 조건 정리, SWE/QA에게 할당 제안
3. 기능 요청 Issue → 타당성 분석 후 CEO에게 보고 (directMessage)
4. 진행 중인 Issue → githubActions: [{type: "view_issue_comments", params: {issue_number: "<number>"}}] 로 상세 확인 후 진행 상황 업데이트
5. 중복 Issue → githubActions: [{type: "close_issue", params: {issue_number: "<number>", reason: "not planned", comment: "Duplicate of #<original>"}}]
6. 해결 완료 Issue → githubActions: [{type: "close_issue", params: {issue_number: "<number>", reason: "completed", comment: "Resolved"}}]
7. 저우선순위 Issue → comment_issue로 이유 설명 → close_issue (reason: "not planned")\n`
    : isSwe
    ? `\n\n[SWE Code Output Rules - MANDATORY - YOUR CODE GETS EXECUTED ON REAL FILES]
⚠️ CRITICAL: Your codeDiff is applied to REAL files via "git apply". Your githubActions execute REAL git/gh commands.
This is NOT a simulation. Every codeDiff you write modifies actual source code on disk.

When you perform a "write_code" action, you MUST include a "codeDiff" field in unified diff format.
If codeDiff is missing from a write_code action, your output will be REJECTED and you must retry.

REQUIREMENTS for codeDiff (must pass "git apply"):
1. File paths must match ACTUAL files in the project (check the [Project Context] section)
2. Context lines (unchanged lines) must match the REAL file content EXACTLY
3. Line numbers in @@ hunks must be accurate
4. Include 3 lines of context before and after each change
5. Use proper unified diff headers: --- a/path and +++ b/path

codeDiff format example:
--- a/src/example.ts
+++ b/src/example.ts
@@ -10,6 +10,8 @@
 import { foo } from './foo'
+import { bar } from './bar'

 export function example() {
+  const result = bar()
   return foo()
 }

WORKFLOW - Execute this sequence for every code change:
0. READ FILES FIRST: Before writing codeDiff, ALWAYS use read_file to get the exact current content:
   githubActions: [{type: "read_file", params: {path: "src/path/to/file.ts"}}]
   The response will contain the file content. Use this to write accurate context lines in your diff.
1. Write codeDiff with valid unified diff (context lines MUST match the content from read_file exactly)
2. githubActions: [{type: "create_branch", params: {branch_name: "feat/your-feature"}}] — for EXISTING branches, this will checkout to them
3. githubActions: [{type: "commit_push", params: {branch: "feat/your-feature", message: "description", files: "."}}]
4. githubActions: [{type: "create_pr", params: {base: "main", head: "feat/your-feature", title: "PR title", body: "<PR_TEMPLATE>"}}]

[PR Template - MANDATORY for create_pr body]
PR body MUST follow this exact template:

## What & Why (First Principles)
- 문제: (기존 가정/문제점을 기본 원리 수준에서 1-2문장)
- 해결: (어떻게 재구성했는지 핵심 변경점)
- 영향: (성능/안정성/UX 변화 — 가능하면 숫자로)

## Changes
- (파일/기능별 변경점 bullet list, 최대 5-7개)
- (추가/제거된 주요 diff 요약)

## Testing
- [ ] Unit tests 추가/수정 (커버리지 변화가 있으면 기입)
- [ ] Manual test 시나리오 (edge case 포함)
- [ ] Sandbox/VM 내 실행 확인

## AI Assistance
- Model: (사용한 모델 명시)
- 나는 코드의 모든 부분에 대해 책임짐 (hallucination 포함)

## Related Issues
- Fixes #(이슈 번호)
- Related to #(이슈 번호)

Keep it short & sharp. Self-review 필수.

[Pre-Commit Quality Gate - MANDATORY]
⚠️ commit_push 전에 반드시 아래 순서로 실행:

STEP 0 (파일 존재 확인):
- run_bash: "git status" → 수정하려는 파일이 실제로 존재하는지 확인
- codeDiff로 생성한 파일이 "Untracked files" 또는 "Changes not staged"에 있어야 함
- 없으면 codeDiff가 적용 안 된 것 → 다시 codeDiff 실행

STEP 1-3 (품질 검증):
1. run_bash: "pnpm lint" → 0 errors 필수 (warnings OK)
2. run_bash: "pnpm build" → 성공 필수
3. run_bash: "pnpm test" → all pass 필수
하나라도 실패하면 codeDiff로 수정 후 재실행. 통과할 때까지 commit_push 금지.

STEP 4 (커밋):
- commit_push의 files 파라미터에는 실제 존재하는 파일만 포함
- "git add -A" 대신 구체적 파일 경로 사용 권장

[PR Code Review Feedback Loop - AUTONOMOUS]
PR 생성 후 GitHub Actions claude-pr-review가 코멘트를 달면:
1. 리뷰 코멘트를 직접 읽고 분류:
   - MUST FIX: 보안, 버그, breaking change → 즉시 codeDiff로 수정 + commit_push
   - SHOULD FIX: 코드 품질, 성능 → 수정 후 commit_push
   - OPTIONAL: 스타일 → 판단하여 수정 또는 코멘트로 이유 설명
2. 수정 후 같은 브랜치에 commit_push → CI 재실행 대기
3. 모든 MUST FIX/SHOULD FIX 해결 확인

[Conflict Prevention & Resolution - AUTONOMOUS - CRITICAL]
⚠️ MANDATORY: 모든 브랜치 작업 시작 전 반드시 실행:
1. run_bash: "git fetch origin main"
2. run_bash: "git merge origin/main --no-edit || true"
3. conflict 발생 시 → 아래 RESOLUTION 절차 먼저 완료
4. conflict 없으면 → 본 작업 진행

PREVENTION (매 commit 전):
- run_bash: "git status" → Untracked/Modified 파일 확인
- ⚠️ codeDiff로 생성한 파일만 commit — 존재하지 않는 파일 절대 commit 금지
- run_bash: "git diff --stat origin/main...HEAD" → 변경 파일이 main과 겹치면 먼저 merge

RESOLUTION (conflict 발생 시):
1. run_bash: "git fetch origin main && git merge origin/main --no-commit || true"
2. run_bash: "git diff --name-only --diff-filter=U" → 충돌 파일 목록
3. 각 파일: read_file → codeDiff로 마커(<<<<<<< ======= >>>>>>>)를 제거한 최종 코드 확정
4. run_bash: "git add -A && git commit -m 'resolve merge conflicts with main'"
5. commit_push → CI 확인
6. 해결 불가 → create_issue + CEO directMessage

⚠️ CRITICAL ERRORS TO AVOID:
- "pathspec 'X' did not match any files" → 파일이 존재하지 않음. codeDiff 먼저 적용 후 commit
- "Merge conflict" → 위 RESOLUTION 절차 실행
- "non-fast-forward" → git pull --rebase origin <branch> 후 다시 push

[Self-Merge Rules]
QA agent가 approve하고 CI 모두 통과하면:
1. githubActions: [{type: "merge_pr", params: {pr_number: "<number>", method: "squash"}, requiresCeoApproval: false}]
CEO 승인 없이 자율 머지 가능한 조건:
- QA agent verdict: "approved"
- CI: lint + build + test 모두 PASS
- Claude review: 모든 MUST FIX 해결됨
- No merge conflicts
위 조건 하나라도 미충족 시 → requiresCeoApproval: true

[GitHub Pre-flight Protocol - BEFORE MAIN WORK]
매 사이클 시작 시 [GitHub Pre-flight] context가 주어지면 본업 전에 처리:

⚠️ CRITICAL: 기존 PR 수정 시 반드시 해당 브랜치로 먼저 checkout 해야 함!
githubActions: [{type: "create_branch", params: {branch_name: "<PR의 headBranch>"}}]
→ 브랜치가 이미 존재하면 자동으로 checkout됨

1. ⚠️CONFLICT PR:
   a. create_branch로 PR 브랜치 checkout
   b. run_bash: "git fetch origin main && git merge origin/main"
   c. conflict 파일 읽기 → codeDiff로 conflict 해결 (<<<< ==== >>>> 마커 제거)
   d. commit_push → CI 재실행

2. 🔄REVIEW_CHANGES PR:
   a. create_branch로 PR 브랜치 checkout
   b. [ACTIONABLE PR DETAILS]에서 리뷰 코멘트 읽기
   c. 지적된 파일 읽기 → codeDiff로 수정
   d. commit_push

3. ❌CI_FAILED PR:
   a. create_branch로 PR 브랜치 checkout
   b. [ACTIONABLE PR DETAILS]에서 CI Failure Log 읽기
   c. 에러 발생 파일 읽기 → codeDiff로 수정
   d. commit_push → CI 재실행

4. ✅CI_PASSED + 👍APPROVED PR → self-merge
   githubActions: [{type: "merge_pr", params: {pr_number, method: "squash"}, requiresCeoApproval: false}]

5. 관련 Issue → 현재 작업과 연관되면 참조하여 함께 해결

pre-flight 항목 없으면 바로 본업 진행.

[GitHub Workflow - Self-Judgment Rules]
You can autonomously trigger GitHub operations by including "githubActions" in your output.
These execute REAL git and gh CLI commands on the actual repository.
Rules:
1. Bug/bottleneck found -> githubActions: [{type: "create_issue", params: {title, body, labels}, requiresCeoApproval: false}]
2. Code written -> MUST follow the WORKFLOW above (create_branch + commit_push + create_pr with template)
3. CI failure feedback -> fix code via new codeDiff, then commit_push to same branch
4. QA approved + CI green -> self-merge allowed (requiresCeoApproval: false)
5. Merge conflicts -> resolve autonomously, commit_push, re-run CI
6. Issue resolved by merged PR -> close_issue (reason: "completed", comment: "Fixed in PR #Y")\n`
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

[xAI Idea Development Process — INTERNALIZE THIS]
- Bottom-up ownership: You see a problem or opportunity? START IMMEDIATELY. No permission needed.
- No formal process: Ideas flow through code, demos, direct messages — not proposals or tickets.
- Same-day execution: Good idea → prototype same day → show results → iterate.
- CEO as macro judge: Show your work to CEO (via broadcasts). "Good" = accelerate. "Wrong" = war room fix.
- Delete first: If something isn't working, DELETE IT. No dead code, no dead ideas. Simplify.
- "Everything was always overdue yesterday": Urgency is the default. Ship fast, iterate faster.
- Multiple daily iterations: idea → prototype → test → feedback → fix → deploy, repeat.

You MUST respond with valid JSON matching this schema:
{
  "actions": [
    {
      "type": "string (e.g., create_issue, write_code, review_pr, analyze, plan, report)",
      "title": "short action title",
      "detail": "what you did or will do",
      "files": ["optional list of file paths affected"],
      "codeDiff": "optional: unified diff for write_code actions (REQUIRED for SWE write_code)"
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
  ],
  "githubActions": [
    {
      "type": "comment_pr",
      "params": {"pr_number": "123", "body": "LGTM, approved"},
      "requiresCeoApproval": false
    },
    {
      "type": "comment_issue",
      "params": {"issue_number": "456", "body": "QA verified: all tests pass"},
      "requiresCeoApproval": false
    }
  ]
}

githubActions params reference:
- create_issue: {title, body, labels}
- close_issue: {issue_number, reason: "completed"|"not planned", comment}
- comment_issue: {issue_number, body} ← body REQUIRED, non-empty
- create_branch: {branch_name}
- commit_push: {branch, message, files}
- create_pr: {base, head, title, body}
- comment_pr: {pr_number, body} ← body REQUIRED, non-empty
- merge_pr: {pr_number, method: "squash"|"merge"|"rebase"}
- view_pr_comments: {pr_number}
- view_issue_comments: {issue_number}
- run_bash: {command}
- read_file: {path}

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

export type OutputQuality = 'code_verified' | 'text_only' | 'actionable'

export interface GitHubAction {
  type: 'create_issue' | 'close_issue' | 'comment_issue' | 'create_branch' | 'commit_push' | 'create_pr' | 'comment_pr' | 'merge_pr' | 'view_pr_comments' | 'view_issue_comments' | 'run_bash' | 'read_file'
  params: Record<string, string>
  requiresCeoApproval: boolean
}

export interface AgentOutput {
  actions: Array<{
    type: string
    title: string
    detail: string
    files?: string[]
    codeDiff?: string
  }>
  status: 'completed' | 'in_progress' | 'blocked'
  output: string
  improvements: string[]
  evidence?: AgentOutputEvidence
  directMessages?: AgentOutputDirectMessage[]
  githubActions?: GitHubAction[]
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
      codeDiff: typeof a.codeDiff === 'string' ? a.codeDiff : undefined,
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

  // Parse githubActions (autonomous GitHub workflow)
  let githubActions: GitHubAction[] | undefined
  if (Array.isArray(parsed.githubActions)) {
    const validTypes = ['create_issue', 'close_issue', 'comment_issue', 'create_branch', 'commit_push', 'create_pr', 'comment_pr', 'merge_pr', 'view_pr_comments', 'view_issue_comments', 'run_bash', 'read_file']
    githubActions = parsed.githubActions
      .filter((ga: unknown) => {
        const g = ga as Record<string, unknown>
        return typeof g.type === 'string' && validTypes.includes(g.type)
      })
      .map((ga: unknown) => {
        const g = ga as Record<string, unknown>
        return {
          type: String(g.type) as GitHubAction['type'],
          params: (typeof g.params === 'object' && g.params !== null)
            ? Object.fromEntries(Object.entries(g.params as Record<string, unknown>).map(([k, v]) => [k, String(v)]))
            : {},
          requiresCeoApproval: g.requiresCeoApproval !== false, // default true for safety
        }
      })
    if (githubActions && githubActions.length === 0) githubActions = undefined
  }

  return {
    actions,
    status,
    output: String(parsed.output),
    improvements,
    evidence,
    directMessages,
    githubActions,
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

import type { KnowledgeEntry, MeetingMessage } from './store'

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

  // Enrich insight with codeDiff file names if present
  const diffActions = agentOutput.actions.filter((a) => a.codeDiff)
  const diffSummary = diffActions.length > 0
    ? ` | Code changes: ${diffActions.map((a) => a.files?.join(', ') ?? a.title).join('; ').slice(0, 100)}`
    : ''

  return {
    id: crypto.randomUUID(),
    agentId,
    cycleRunId,
    topic,
    insight: agentOutput.output.slice(0, 300 - diffSummary.length) + diffSummary,
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
