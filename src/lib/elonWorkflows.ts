// xAI Agent Workflows - Based on First Principles, Daily Iterations, Extreme Autonomy
// Each agent has a ReAct loop: Observe → Plan → Act → Evaluate

export type WorkflowPhase = 'observe' | 'plan' | 'act' | 'evaluate'

export interface WorkflowStep {
  phase: WorkflowPhase
  action: string
  detail: string
  duration: number // ms for simulation
  github?: {
    type: 'issue' | 'pr' | 'review' | 'ci' | 'merge'
    title: string
  }
  output?: string
}

export interface AgentWorkflow {
  agentId: string
  name: string
  description: string
  xaiPrinciples: string[] // xAI discipline points
  revenueImpact?: string
  steps: WorkflowStep[]
}

// ==================== Leadership Workflows ====================

export const CEO_WORKFLOW: AgentWorkflow = {
  agentId: 'ceo',
  name: 'CEO / Elon',
  description: 'Macro judge: 에이전트가 보여주는 데모/결과에 "좋다→가속" or "wrong→war room surge". 직접 개입은 방향이 틀렸을 때만',
  xaiPrinciples: [
    'Macro Judge: 결과물 보고 직관 판단 — "이거 좋다" = 즉시 가속, "this sucks" = war room surge',
    'Bottom-up 신뢰: 에이전트가 자율 시작한 걸 막지 않음. 방향만 교정',
    'No formal process: 아이디어는 Slack/demo/PR로 자연스럽게 올라옴. 포탈/양식 없음',
    'Delete first: 안 좋으면 즉시 삭제 지시. Dead features/code 금지',
    'Daily multiple iterations: 하루 여러 번 피드백 루프',
    'Fun: inspired 분위기 유지, hard problems = fun problems',
  ],
  revenueImpact: '전체 매출 목표 설정, 프리미엄 모델 최적화',
  steps: [
    { phase: 'observe', action: '에이전트 데모/결과 수신', detail: '에이전트가 자율적으로 올린 PR/데모/메트릭 확인', duration: 2000 },
    { phase: 'plan', action: 'Macro judgment', detail: '"좋다/wrong" 직관 판단 — 세부 실행은 에이전트에게 위임', duration: 1500 },
    { phase: 'act', action: '방향 교정 broadcast', detail: '"좋다"→가속 지시 / "wrong"→war room surge 트리거', duration: 2000 },
    { phase: 'act', action: 'PR 최종 승인', detail: '개발자 1:1 리뷰, "this sucks" or "ship it" — 2줄 피드백', duration: 1500, github: { type: 'review', title: 'CEO Review: Auth implementation' } },
    { phase: 'act', action: 'Delete 지시', detail: 'Low-leverage 아이템 즉시 삭제/archive 명령', duration: 1000, github: { type: 'issue', title: '[DELETE] Low leverage: remove unused feature' } },
    { phase: 'evaluate', action: '일일 다회 iteration 루프', detail: '에이전트 자율 실행 결과 확인 → 다음 피드백', duration: 1500, output: '매출 목표 달성률: 94%' },
  ],
}

export const CTO_WORKFLOW: AgentWorkflow = {
  agentId: 'cto',
  name: 'CTO',
  description: 'Tech macro judge + bottom-up enabler: SWE 자율 아이디어 가속, 기술 방향 교정, 아키텍처 "좋다/wrong" 판단',
  xaiPrinciples: [
    'Bottom-up enabler: SWE가 자율 시작한 기술 아이디어를 막지 않고 가속',
    'Tech macro judge: 아키텍처 방향 "좋다"→가속 / "wrong"→war room 수정',
    'No formal process: 기술 아이디어는 PR/코드/벤치 결과로 흐름',
    'Same-day prototype: 기술 개선 아이디어→당일 프로토→벤치→결정',
    'Delete first: 비효율적 아키텍처/기술 부채 즉시 삭제',
    'Challenge: "Why isn\'t it done already?" 모든 기술 지연에 질문',
    'Fast iteration: daily tech updates + 하루 여러 번 벤치마크 사이클',
  ],
  revenueImpact: '기술 기반 매출 성장, 엔터프라이즈 스케일링',
  steps: [
    { phase: 'observe', action: '기술 메트릭 + SWE 아이디어 수신', detail: 'SWE 자율 PR/제안 + 시스템 메트릭 확인', duration: 1500 },
    { phase: 'plan', action: 'Tech macro judgment', detail: '아키텍처 방향 "좋다/wrong" 판단 — 세부는 SWE에게 위임', duration: 2000 },
    { phase: 'act', action: '기술 가속/교정 지시', detail: '좋은 아이디어→리소스 투입 / 틀린 방향→war room fix', duration: 1000, github: { type: 'issue', title: 'Implement in-memory KV store with transactions' } },
    { phase: 'act', action: 'PR 기술 리뷰 — fast unblock', detail: '"ship it" or "this sucks, fix X" — 2줄 피드백', duration: 1500, github: { type: 'review', title: 'Tech Review: Database optimization' } },
    { phase: 'act', action: 'Delete 지시', detail: '기술 부채/dead code 즉시 삭제 명령', duration: 1000 },
    { phase: 'evaluate', action: '벤치 결과 → CEO 보고', detail: 'Daily iteration 완료, 메트릭으로 결과 증명', duration: 1500, output: 'Latency -23%, Throughput +45%' },
  ],
}

export const CPO_WORKFLOW: AgentWorkflow = {
  agentId: 'cpo',
  name: 'CPO',
  description: 'Product roadmap prioritization, feature broadcasts, value measurement',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Skeptical reasoning: 데이터 검증',
    'Macro judgment: 큰 그림 제품 판단',
  ],
  revenueImpact: '제품 매출 최적화, UX 개선으로 churn 감소',
  steps: [
    { phase: 'observe', action: '사용자 데이터 관찰', detail: 'Grok 스타일 usability 분석', duration: 1500 },
    { phase: 'plan', action: '제품 로드맵 우선순위화', detail: 'CEO 미팅 후 자율 조정', duration: 2000 },
    { phase: 'act', action: '기능 지시 브로드캐스트', detail: 'PM들에게 전달', duration: 1000 },
    { phase: 'act', action: 'Issues/PR 로드맵 반영', detail: '제품 태스크 생성', duration: 1000, github: { type: 'issue', title: '[Product] Premium feature: Advanced analytics' } },
    { phase: 'evaluate', action: '가치 측정', detail: 'Daily iteration 루프', duration: 1500, output: 'Feature adoption: +34%' },
  ],
}

export const CRO_WORKFLOW: AgentWorkflow = {
  agentId: 'cro',
  name: 'CRO',
  description: 'Revenue analysis, growth strategy, campaign execution, ROI inspection',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Talent-dense: impact-focused 마케팅',
    'Fun: inspired 캠페인',
  ],
  revenueImpact: '전체 매출 극대화, OSS 보상 예산 관리',
  steps: [
    { phase: 'observe', action: '수익 데이터 분석', detail: 'CEO 목표 확인', duration: 1500 },
    { phase: 'plan', action: '성장 전략 수립', detail: 'Daily iterations 마케팅', duration: 2000 },
    { phase: 'act', action: '캠페인 실행', detail: '마케팅 Issues 생성', duration: 1500, github: { type: 'issue', title: '[Marketing] Q1 Growth Campaign' } },
    { phase: 'evaluate', action: 'ROI 검사', detail: '매출 극대화 루프', duration: 1500, output: 'Campaign ROI: 340%' },
  ],
}

// ==================== Product & Design Workflows ====================

export const PM_WORKFLOW: AgentWorkflow = {
  agentId: 'pm',
  name: 'Product Manager',
  description: 'xAI-style PM: 아이디어는 코드/데모/direct msg로 흐름. PRD 없음. 발견→당일 실행→CEO 보고→iterate/delete',
  xaiPrinciples: [
    'No formal process: 아이디어 제출 양식/포탈 없음. Slack/코드/데모로 자연스럽게 공유',
    'Same-day execution: 좋은 아이디어는 당일에 보여줘야 함. "Everything was always overdue yesterday"',
    'Revenue-first: Stripe + paid tier usage beats opinions',
    'Elon-like judgment: "what sucks?" + macro leverage → CEO에게 바로 보여주기',
    'Delete culture: low-leverage work 즉시 삭제. 백로그에 쌓지 않음',
    'Short & sharp: no PRD/RICE/Opportunity Tree bloat. 1-2줄 directive가 전부',
    'Bottom-up 수용: SWE가 자율적으로 시작한 아이디어 막지 않음. 방향만 조율',
    'Challenge: "Why isn\'t it done already?" 모든 지연에 질문',
  ],
  revenueImpact: 'Premium/Enterprise 매출 극대화 (conversion↑ churn↓)',
  steps: [
    {
      phase: 'observe',
      action: 'Observe: what sucks?',
      detail: 'Usage logs + error patterns + GitHub Issues/PR + Stripe revenue — 문제 발견 즉시 행동',
      duration: 1500,
    },
    {
      phase: 'observe',
      action: 'Competitor scan + 에이전트 자율 아이디어 수신',
      detail: '경쟁사 대비 차별점 + SWE/AI-ML이 자율적으로 올린 아이디어/PR 확인',
      duration: 1200,
    },
    {
      phase: 'plan',
      action: 'First Principles + Musk 5-step',
      detail: 'Make requirements less dumb → delete → simplify → accelerate → automate',
      duration: 2000,
    },
    {
      phase: 'plan',
      action: 'Pick top leverage — 나머지 즉시 kill',
      detail: '병목/매출/리스크 기준 3개만. 나머지는 delete (백로그 금지)',
      duration: 1200,
    },
    {
      phase: 'act',
      action: 'Create short Issues — 즉시 착수 가능',
      detail: '짧은 제목 + acceptance criteria만. 아이디어→Issue→실행이 당일 완료',
      duration: 1000,
      github: { type: 'issue', title: '[HIGH] Fix: Agent run approval bottleneck (auto-evidence + retry)' },
    },
    {
      phase: 'act',
      action: 'Broadcast to agents',
      detail: 'SWE/UX/Platform에 direct 지시 — "바로 시작해, 프로토 만들어, 오늘 보여줘"',
      duration: 900,
    },
    {
      phase: 'act',
      action: 'Delete low-leverage — 즉시 삭제',
      detail: 'Low-leverage 아이템 archive가 아니라 DELETE. Dead features 금지',
      duration: 800,
      github: { type: 'issue', title: '[DELETE] Low leverage: remove cosmetic settings' },
    },
    {
      phase: 'evaluate',
      action: 'Same-day loop — 당일 결과 확인',
      detail: '몇 시간 내 metrics/CI 확인 → CEO에게 바로 보여주기 → iterate or delete',
      duration: 1500,
      output: 'Top leverage shipped: 2/3 · Conversion +3% · Churn -1%',
    },
  ],
}

export const UX_WORKFLOW: AgentWorkflow = {
  agentId: 'ux',
  name: 'Product Designer',
  description: 'Grok UX/UI, flows, rapid prototyping, design system upkeep',
  xaiPrinciples: [
    'First Principles: 왜 이 UI가 필요한가?',
    'Fast iteration: 하루~며칠 단위 프로토타입',
    'Cross-functional: 엔지니어/AI 연구자와 밀착',
  ],
  revenueImpact: 'UX 품질로 유지율↑/churn↓',
  steps: [
    { phase: 'observe', action: 'Observe UX signals', detail: 'Usage logs + feedback + error patterns', duration: 1500 },
    { phase: 'plan', action: 'First principles flow', detail: 'Delete steps, simplify, prove with metrics', duration: 2000 },
    { phase: 'act', action: 'Figma prototype', detail: 'Same-day prototype + handoff notes', duration: 2000, github: { type: 'issue', title: '[Design] Grok UI: Flow prototype (Figma)' } },
    { phase: 'act', action: 'Collaborate with SWE', detail: 'Tight loop: prototype → implement → verify', duration: 1500 },
    { phase: 'evaluate', action: 'Usability loop', detail: 'Iterate in hours/days', duration: 1500, output: 'Task success: +18%, Churn: -1%' },
  ],
}

export const VISUAL_WORKFLOW: AgentWorkflow = {
  agentId: 'visual',
  name: 'UI/Visual Designer (Brand)',
  description: 'Brand identity, icons/illustration, motion assets for launches',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Intellectual honesty: straight feedback',
    'Fast iteration: ship assets daily',
  ],
  revenueImpact: '브랜딩/프리미엄 테마로 전환↑',
  steps: [
    { phase: 'observe', action: 'Audit visual gaps', detail: 'Product + marketing surfaces', duration: 1500 },
    { phase: 'plan', action: 'Tokens + asset plan', detail: 'Theme tokens, icon set, launch visuals', duration: 2000 },
    { phase: 'act', action: 'Ship assets', detail: 'Icons/illustrations/motion snippets', duration: 2000, github: { type: 'pr', title: 'design: Brand assets + premium theme tokens' } },
    { phase: 'evaluate', action: 'Consistency check', detail: 'Brand/UI alignment', duration: 1500, output: 'Brand consistency: 96%' },
  ],
}

export const MOTION_WORKFLOW: AgentWorkflow = {
  agentId: 'motion',
  name: 'Motion Designer / Animator',
  description: 'Grok demos, launch motion, UI animation clips',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Does motion increase comprehension?',
    'Ship rough cut fast, polish only if it matters',
  ],
  revenueImpact: 'Demos/launches drive adoption',
  steps: [
    { phase: 'observe', action: 'Identify demo moments', detail: 'Where motion clarifies value', duration: 1200 },
    { phase: 'plan', action: 'Storyboard', detail: 'Short, high signal, no fluff', duration: 1500 },
    { phase: 'act', action: 'Draft animation', detail: 'After Effects rough cut', duration: 2200, github: { type: 'issue', title: '[Motion] Grok demo clip: onboarding flow' } },
    { phase: 'evaluate', action: 'Review & iterate', detail: 'Clarity/impact check', duration: 1200, output: 'Demo completion: +9%' },
  ],
}

export const ANALYST_WORKFLOW: AgentWorkflow = {
  agentId: 'growth-analyst',
  name: 'Product Analyst',
  description: 'Metrics analysis, growth insights, A/B execution',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Data-driven reasoning',
    'All-Hands 스타일 그래프 중점',
  ],
  revenueImpact: '매출 메트릭 분석, 에이전트 성공률',
  steps: [
    { phase: 'observe', action: '메트릭 분석', detail: 'PM 매출 지시 확인', duration: 1500 },
    { phase: 'plan', action: '성장 인사이트 추출', detail: 'First Principles 데이터', duration: 2000 },
    { phase: 'act', action: 'A/B 실행', detail: 'Issues 생성', duration: 1500, github: { type: 'issue', title: '[Analytics] A/B test: Pricing page variants' } },
    { phase: 'act', action: 'Metrics 그래프 공유', detail: 'All-Hands 스타일', duration: 1000 },
    { phase: 'evaluate', action: '결과 루프', detail: 'Daily iterations', duration: 1500, output: 'Conversion rate: +12%' },
  ],
}

// ==================== Engineering Workflows ====================

export const SWE_WORKFLOW: AgentWorkflow = {
  agentId: 'swe',
  name: 'Software Engineer (Lead)',
  description: 'Bottom-up tech lead: 문제 자율 발견→프로토→CEO 데모→iterate. 팀 SWE 아이디어도 막지 않고 가속',
  xaiPrinciples: [
    'Bottom-up ownership: 지시 없이 시작, hole fill. "No one tells me no"',
    'Same-day prototype: 아이디어→프로토→데모 당일 완료',
    'No formal process: PR/코드/데모로 아이디어 공유. 양식 없음',
    'Delete first: 안 되는 접근법은 즉시 삭제',
    'Accelerate team ideas: 팀원이 자율 시작한 아이디어를 가속시키는 역할',
    'Multiple daily iterations: 하루 여러 번 commit/push/iterate',
  ],
  steps: [
    { phase: 'observe', action: '문제/기회 자율 발견', detail: 'PM Issues + 자체 발견 병목 — 지시 대기 X', duration: 1000 },
    { phase: 'plan', action: '당일 프로토 설계', detail: 'First Principles — 당일 완료 가능한 스코프', duration: 1500 },
    { phase: 'act', action: '즉시 구현 + 테스트', detail: '"No one tells me no" — 바로 코드 작성', duration: 3000 },
    { phase: 'act', action: 'PR + CEO 데모', detail: '당일 PR 올리고 CEO에게 바로 보여주기', duration: 1000, github: { type: 'pr', title: 'feat: Distributed job queue with priority' } },
    { phase: 'act', action: 'CEO 피드백 반영', detail: '"좋다"→가속 / "this sucks"→즉시 수정 or delete', duration: 1500, github: { type: 'review', title: 'CEO feedback applied' } },
    { phase: 'evaluate', action: 'Merge or Delete', detail: 'Daily iteration 완료 — 다음 아이디어로', duration: 1000, github: { type: 'merge', title: 'Merged: feat: Distributed job queue' }, output: 'Lines: +342, Tests: 24 passed' },
  ],
}

export const SWE_2_WORKFLOW: AgentWorkflow = {
  agentId: 'swe-2',
  name: 'Software Engineer #2',
  description: 'Bottom-up builder: 문제 발견→지시 없이 즉시 프로토타입→당일 PR→CEO 피드백→iterate/delete. "No one tells me no"',
  xaiPrinciples: [
    'Bottom-up ownership: 문제/개선점 발견하면 지시 없이 바로 시작. 허락 불필요',
    '"No one tells me no": 막는 사람 없으면 프로토타입→코드→테스트→PR 즉시 진행',
    'Same-day execution: 좋은 아이디어는 당일에 코드로 보여줘야 함',
    'Show to CEO immediately: 프로토 되면 바로 broadcast로 CEO에게 데모',
    'Delete first: 안 되는 코드/접근법은 즉시 삭제. Dead code 금지',
    'High leverage: unblock the org — 병목 해결이 최우선',
    'Multiple daily iterations: 하루 여러 번 commit/push/iterate',
  ],
  steps: [
    { phase: 'observe', action: '문제/기회 자율 발견', detail: '지시 대기 X — 스스로 bottleneck/개선점 탐색', duration: 900 },
    { phase: 'plan', action: '즉시 프로토타입 계획', detail: 'Small PR, 당일 완료 가능한 스코프만', duration: 1200 },
    { phase: 'act', action: '프로토타입 즉시 구현', detail: '"No one tells me no" — 바로 코드 작성 + 테스트', duration: 2600 },
    { phase: 'act', action: 'PR 생성 + CEO에게 데모', detail: '당일 PR 올리고 broadcast로 결과 보여주기', duration: 900, github: { type: 'pr', title: 'fix: Reduce approval friction + better retries' } },
    { phase: 'act', action: 'CI 실행', detail: 'Keep green — CEO "wrong" 피드백 시 즉시 수정', duration: 1500, github: { type: 'ci', title: 'CI: verify fix + regression tests' } },
    { phase: 'evaluate', action: 'Iterate or Delete', detail: 'CEO "좋다"→merge 가속 / "wrong"→war room fix or delete', duration: 900, github: { type: 'merge', title: 'Merged: fix approval friction' }, output: 'Incidents: -1, Approval time: -30%' },
  ],
}

export const SWE_3_WORKFLOW: AgentWorkflow = {
  agentId: 'swe-3',
  name: 'Software Engineer #3',
  description: 'Verification guardian + bottom-up improver: 실패 발견→자율 수정→guardrail 추가→당일 배포. War room readiness',
  xaiPrinciples: [
    'Bottom-up detection: 실패/flake 발견하면 지시 없이 바로 수정 시작',
    '"No one tells me no": CI 깨지면 즉시 고침. 티켓 대기 X',
    'Same-day fix: 발견→수정→guardrail→PR→merge 당일 완료',
    'Delete first: flaky test/dead code 발견 시 즉시 삭제. 비활성 코드 금지',
    'War-room readiness: 장애 시 즉시 swarm → 근본 원인 수정 + guardrail 추가',
    'Show evidence to CEO: 수정 결과를 메트릭/그래프로 바로 보여주기',
    'Proof > opinions: 모든 주장은 evidence(테스트, 벤치, 로그)로 입증',
  ],
  steps: [
    { phase: 'observe', action: '자율 실패 탐지', detail: 'CI flakes, regressions, slow tests — 지시 없이 스스로 발견', duration: 1000 },
    { phase: 'plan', action: '즉시 수정 + guardrail 계획', detail: 'Add minimal tests + evidence hooks — 당일 완료 스코프', duration: 1400 },
    { phase: 'act', action: '패치 + 테스트 — 즉시 구현', detail: '"No one tells me no" — 바로 코드 작성, delete 불필요 코드', duration: 2400 },
    { phase: 'act', action: 'CI + CEO 데모', detail: 'Reliability 결과를 메트릭으로 CEO에게 즉시 보고', duration: 1500, github: { type: 'ci', title: 'CI: stabilize + speed up' } },
    { phase: 'evaluate', action: 'Merge or Delete', detail: '결과 좋으면 merge / 접근법 틀리면 delete하고 다른 방법 시도', duration: 900, github: { type: 'merge', title: 'Merged: CI reliability hardening' }, output: 'Flakes: -60%, Runtime: -15%' },
  ],
}

export const QA_WORKFLOW: AgentWorkflow = {
  agentId: 'qa',
  name: 'QA Engineer (xAI Style · GPT-5.2)',
  description: 'Talent-dense QA: 전체 제품 라이프사이클 관여, First Principles 테스트, extreme autonomy, daily iterations Quality gate guardian: lint → build → test 필수 통과 후에만 PR 승인. Claude 리뷰 피드백 루프 관리',
  xaiPrinciples: [
    'First Principles: "왜 이 테스트가 필요한가?" "기본 가정 틀렸을 가능성은?" 부터 시작',
    'Daily/Multiple Iterations: 매 사이클 최소 1회 테스트 결과 개선. "yesterday보다 나아졌나?" self-check',
    'Extreme Autonomy: 지시 없이 hole fill. 문제 발견 시 스스로 테스트 케이스/자동화 스크립트 추가',
    'Short & Sharp: 보고서·커뮤니케이션은 간결하게. "no fluff" 원칙',
    'High Leverage: 가장 큰 impact 버그·위험 우선. throughput xN 또는 revenue impact xN 기준',
    'Delete First: 불필요 테스트/프로세스 10% 이상 삭제 안 하면 삭제 부족',
    'Challenge: "Why isn\'t it done already?" 항상 질문',
    'Gate keeper: 모든 코드는 lint/build/test 통과 필수. 예외 없음',
    'Fast feedback: 실패 즉시 SWE에게 구체적 수정 지시',
    'Claude review loop: PR 리뷰 코멘트 수집 → SWE에게 전달 → 수정 확인',
    'No broken main: main 브랜치는 항상 green 유지',
    'Evidence-based approval: 모든 체크 통과 증거와 함께 승인',
  ],
  revenueImpact: 'Production 버그 방지 → 유저 신뢰 + 매출 보호, 핫픽스 비용 절감, 테스트 자동화로 개발 속도 xN',
  steps: [
    { phase: 'observe', action: '요구사항 First Principles 분해', detail: '입력/출력, UX, 성능(latency, accuracy) 분해. "왜 이 테스트?" 질문', duration: 1000 },
    { phase: 'observe', action: 'High-leverage 버그/위험 식별', detail: 'revenue impact, user trust 기준으로 우선순위. AI특화: hallucination, bias 검증', duration: 800 },
    { phase: 'plan', action: '테스트 전략 수립', detail: '기능·회귀·성능·보안 테스트 설계. E2E 포함. Delete할 테스트 10% 찾기', duration: 1200 },
    { phase: 'plan', action: '자동화 프레임워크 계획', detail: 'Playwright/Cypress 스크립트, CI/CD 통합, synthetic data 생성 계획', duration: 1000 },
    { phase: 'act', action: 'CI/CD 게이트 실행', detail: 'pnpm lint (0 errors) → pnpm build → pnpm test. 실패 시 즉시 SWE에게 short & sharp 보고', duration: 2500, github: { type: 'ci', title: 'QA: full gate check' } },
    { phase: 'act', action: '자동화 스크립트 작성/개선', detail: 'Extreme autonomy: hole fill. 테스트 부족 영역 자율 추가', duration: 2000, github: { type: 'pr', title: 'test: add automated test coverage' } },
    { phase: 'act', action: 'War Room Surge 대응', detail: '문제 발생 시 즉시 집중 해결. 개발팀 직접 소통 (no chain of command)', duration: 1500 },
    { phase: 'act', action: 'Claude 리뷰 피드백 처리', detail: '리뷰 코멘트 분류: MUST FIX (보안/버그) → SWE 즉시 수정 요청', duration: 1000 },
    { phase: 'evaluate', action: '메트릭 기반 품질 게이트', detail: 'coverage 95%+, latency <200ms, hallucination rate 추적. 통과 → APPROVE', duration: 800, output: 'Coverage: 96%, Lint: PASS, Build: PASS, Test: 47/47 → Approved' },
    { phase: 'evaluate', action: 'Delete & Improve', detail: '불필요 테스트 10% 삭제 확인. "yesterday보다 나아졌나?" self-check', duration: 600, output: 'Deleted 3 flaky tests, Added 5 high-leverage tests' },
  ],
}

export const AI_ML_WORKFLOW: AgentWorkflow = {
  agentId: 'ai-ml',
  name: 'AI/ML Research & Scaling Agent',
  description: 'Bottom-up researcher: SOTA 발견→당일 프로토타입→CEO 데모→가속 or delete. Grok 4.1 Fast + web search',
  xaiPrinciples: [
    'Bottom-up discovery: 유망한 기술/패턴 발견하면 지시 없이 즉시 프로토타입 시작',
    '"No one tells me no": 실험 시작에 허락 불필요. 결과로 증명',
    'Same-day prototype: 논문/기술 발견→당일 프로토타입→벤치마크→CEO에게 데모',
    'Delete culture: ROI 없는 실험 즉시 중단. "this sucks" 피드백 시 바로 삭제 후 다른 접근',
    'Show to CEO immediately: 벤치마크 결과를 메트릭/그래프로 바로 보여주기',
    'High leverage: SOTA 초월, 최소 비용으로 최대 성능',
    'Fast iteration: 하루 여러 번 실험→벤치→피드백→수정 사이클',
    'Skeptical reasoning: 논문/벤치 결과 교차 검증. Hype 경계',
  ],
  revenueImpact: 'AI 비용 최적화, 모델 성능 향상으로 제품 경쟁력 + 매출 극대화',
  steps: [
    { phase: 'observe', action: '자율 SOTA 탐색', detail: 'arxiv/HumanEval/SWE-bench 최신 결과 — 유망하면 즉시 프로토 시작', duration: 1500 },
    { phase: 'observe', action: '비용 & 성능 기회 발견', detail: '모델별 토큰 비용/레이턴시 비교 — 개선 기회 자율 식별', duration: 1200 },
    { phase: 'plan', action: '당일 프로토 계획', detail: 'CoT/ToT/self-critique 패턴 — 당일 검증 가능한 스코프만', duration: 2000 },
    { phase: 'act', action: '즉시 프로토타입 구현', detail: '"No one tells me no" — 바로 구현하고 벤치 돌리기', duration: 3000, github: { type: 'pr', title: 'feat: Multi-agent orchestration optimization' } },
    { phase: 'act', action: 'CEO 데모 — 벤치 결과 공유', detail: '메트릭/그래프로 결과 즉시 보여주기', duration: 2000, github: { type: 'ci', title: 'Benchmark: Model evaluation + cost analysis' } },
    { phase: 'evaluate', action: 'Iterate or Delete', detail: 'CEO "좋다"→스케일업 / "wrong"→즉시 삭제 후 다른 접근', duration: 1500, output: 'Accuracy: +5%, Inference cost: -30%, Latency: -18%' },
  ],
}

export const PLATFORM_WORKFLOW: AgentWorkflow = {
  agentId: 'platform',
  name: 'Platform Engineer',
  description: 'Scaling observation, pipeline design, server control, stability loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Efficiency max',
    'Challenge requirements: "Why isn\'t it done already?"',
  ],
  steps: [
    { phase: 'observe', action: '스케일링 관찰', detail: '200k+ GPU 클러스터', duration: 1500 },
    { phase: 'plan', action: '파이프라인 설계', detail: 'Colossus 스케일', duration: 2000 },
    { phase: 'act', action: '서버 제어', detail: 'Daily iterations', duration: 2000, github: { type: 'issue', title: 'Scale: Add 10k GPU nodes' } },
    { phase: 'act', action: '인프라 PR', detail: 'In-memory KV store', duration: 1500, github: { type: 'pr', title: 'infra: In-memory key-value store' } },
    { phase: 'evaluate', action: '안정성 루프', detail: 'Iteration 완료', duration: 1500, output: 'Uptime: 99.99%, Scale: +45%' },
  ],
}

export const FRONTEND_WORKFLOW: AgentWorkflow = {
  agentId: 'frontend',
  name: 'Frontend Engineer',
  description: 'UI task analysis, component development, GUI control, simulation loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Fast rollout',
    'Inspired 분위기',
  ],
  steps: [
    { phase: 'observe', action: 'UI 태스크 분석', detail: 'PM Issues 확인', duration: 1000 },
    { phase: 'plan', action: '컴포넌트 설계', detail: 'First Principles UI', duration: 1500 },
    { phase: 'act', action: 'GUI 도구 제어', detail: 'Daily UI updates', duration: 2000 },
    { phase: 'act', action: 'PR 생성', detail: '프론트 Issues/PR', duration: 1500, github: { type: 'pr', title: 'feat: Real-time dashboard component' } },
    { phase: 'evaluate', action: '시뮬 루프', detail: 'Iteration 완료', duration: 1500, output: 'Components: 12 added, Bundle: -8%' },
  ],
}

export const SRE_WORKFLOW: AgentWorkflow = {
  agentId: 'sre',
  name: 'DevOps/SRE',
  description: 'System monitoring, scaling strategy, CI/CD/recovery, downtime loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Min downtime',
    'War room surges for fires',
  ],
  steps: [
    { phase: 'observe', action: '시스템 상태 모니터', detail: 'Alerts 체크', duration: 1500 },
    { phase: 'plan', action: '스케일링 전략', detail: 'Daily stability', duration: 1500 },
    { phase: 'act', action: 'CI/CD 실행', detail: 'PR CI 자동 리뷰', duration: 2000, github: { type: 'ci', title: 'CI/CD: Deploy to staging' } },
    { phase: 'act', action: '복구 실행', detail: 'War room if needed', duration: 1500 },
    { phase: 'evaluate', action: '다운타임 루프', detail: 'Iteration 완료', duration: 1500, output: 'MTTR: 2.3min, Deploys: 47 success' },
  ],
}

export const SECURITY_WORKFLOW: AgentWorkflow = {
  agentId: 'security',
  name: 'Security Engineer',
  description: 'Vulnerability observation, audit planning, isolation/defense, hardening loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Skeptical sources',
    'Macro judgment for risks',
  ],
  steps: [
    { phase: 'observe', action: '취약점 관찰', detail: 'Daily security scan', duration: 1500 },
    { phase: 'plan', action: '감사 계획', detail: 'Threat modeling', duration: 2000 },
    { phase: 'act', action: '격리/방어 구현', detail: 'PR 보안 체크', duration: 2000, github: { type: 'review', title: 'Security Review: Auth endpoints' } },
    { phase: 'evaluate', action: '강화 루프', detail: 'Iteration 완료', duration: 1500, output: 'Vulnerabilities: 0 critical, Audit: passed' },
  ],
}

// ==================== Data & Analytics Workflows ====================

export const DATA_ENG_WORKFLOW: AgentWorkflow = {
  agentId: 'data-eng',
  name: 'Data Engineer',
  description: 'Log analysis, insight extraction, query execution, data loops',
  xaiPrinciples: [
    'First principles data',
    'All-Hands 스타일 그래프',
  ],
  revenueImpact: '매출 데이터 분석 (PM 지시)',
  steps: [
    { phase: 'observe', action: '로그 분석', detail: 'PM 지시 확인', duration: 1500 },
    { phase: 'plan', action: '인사이트 추출 계획', detail: 'First Principles', duration: 2000 },
    { phase: 'act', action: '쿼리/분석 실행', detail: 'Issues/PR 데이터', duration: 2000, github: { type: 'pr', title: 'data: Revenue analytics pipeline' } },
    { phase: 'act', action: 'Metrics 그래프 공유', detail: 'All-Hands 스타일', duration: 1000 },
    { phase: 'evaluate', action: '데이터 루프', detail: 'Daily iterations', duration: 1500, output: 'Pipeline latency: -45%, Data quality: 99.8%' },
  ],
}

export const ML_RESEARCH_WORKFLOW: AgentWorkflow = {
  agentId: 'ml-research',
  name: 'ML Researcher',
  description: 'SOTA trend observation, research planning, prototype development',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Game studio-like',
    'Applied research judgment',
  ],
  steps: [
    { phase: 'observe', action: 'SOTA 트렌드 관찰', detail: '논문 분석', duration: 1500 },
    { phase: 'plan', action: '연구 계획', detail: 'Applied research', duration: 2000 },
    { phase: 'act', action: '프로토타입 개발', detail: 'R&D Issues/PR', duration: 3000, github: { type: 'pr', title: 'research: Novel attention mechanism' } },
    { phase: 'evaluate', action: 'Iteration 루프', detail: 'Daily prototypes', duration: 1500, output: 'New approach: +7% accuracy' },
  ],
}

// ==================== Go-to-Market Workflows ====================

export const MARKETING_WORKFLOW: AgentWorkflow = {
  agentId: 'marketing',
  name: 'Marketing',
  description: 'Community analysis, campaign strategy, X posts, engagement loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Community-driven',
    'Fun & inspired',
  ],
  revenueImpact: '매출 성장 캠페인',
  steps: [
    { phase: 'observe', action: '커뮤니티 데이터 분석', detail: 'Engagement 체크', duration: 1500 },
    { phase: 'plan', action: '캠페인 전략', detail: 'Inspired campaigns', duration: 2000 },
    { phase: 'act', action: 'X 포스트 실행', detail: '마케팅 Issues', duration: 1500, github: { type: 'issue', title: '[Marketing] Product launch announcement' } },
    { phase: 'evaluate', action: '참여 루프', detail: 'Daily optimization', duration: 1500, output: 'Engagement: +156%, Followers: +2.3k' },
  ],
}

export const SALES_WORKFLOW: AgentWorkflow = {
  agentId: 'sales',
  name: 'Sales Engineer',
  description: 'Enterprise requirements, demo design, simulation/presentation, conversion loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Customer obsession',
    'Macro judgment for deals',
  ],
  revenueImpact: '엔터프라이즈 매출',
  steps: [
    { phase: 'observe', action: '엔터프라이즈 요구 분석', detail: 'Customer needs', duration: 1500 },
    { phase: 'plan', action: '데모 설계', detail: 'Daily updates', duration: 2000 },
    { phase: 'act', action: '시뮬/프레젠테이션', detail: '세일즈 Issues', duration: 2000, github: { type: 'issue', title: '[Sales] Enterprise demo: ACME Corp' } },
    { phase: 'evaluate', action: '전환 루프', detail: 'Iteration 완료', duration: 1500, output: 'Deal pipeline: $2.4M, Conversion: 34%' },
  ],
}

export const SUPPORT_WORKFLOW: AgentWorkflow = {
  agentId: 'support',
  name: 'Customer Success',
  description: 'User issue observation, onboarding strategy, resolution/guide, churn loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Fast resolution',
    'Challenge requirements for issues',
  ],
  revenueImpact: 'Churn 감소로 매출 보호',
  steps: [
    { phase: 'observe', action: '사용자 이슈 관찰', detail: '티켓 분석', duration: 1500 },
    { phase: 'plan', action: '온보딩 전략', detail: 'Daily optimization', duration: 1500 },
    { phase: 'act', action: '해결/가이드', detail: '지원 Issues', duration: 2000, github: { type: 'issue', title: '[Support] User onboarding improvement' } },
    { phase: 'evaluate', action: 'Churn 루프', detail: 'Iteration 완료', duration: 1500, output: 'CSAT: 4.8/5, Churn: -23%' },
  ],
}

// ==================== Operations Workflows ====================

export const FINANCE_WORKFLOW: AgentWorkflow = {
  agentId: 'finance',
  name: 'Finance/Ops',
  description: 'Spend analysis, budget allocation, payout/legal, compliance loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Compliance automation',
    'High leverage budgeting',
  ],
  revenueImpact: '매출/비용 관리',
  steps: [
    { phase: 'observe', action: '지출 데이터 분석', detail: 'Budget 체크', duration: 1500 },
    { phase: 'plan', action: '예산 할당', detail: 'High leverage', duration: 2000 },
    { phase: 'act', action: 'Payout/법무 처리', detail: '재무 Issues', duration: 2000, github: { type: 'issue', title: '[Finance] OSS contributor payouts Q1' } },
    { phase: 'evaluate', action: '컴플라이언스 루프', detail: 'Daily optimization', duration: 1500, output: 'Budget efficiency: 94%, Compliance: 100%' },
  ],
}

export const RECRUITER_WORKFLOW: AgentWorkflow = {
  agentId: 'recruiter',
  name: 'Recruiter',
  description: 'Contributor analysis, hiring strategy, interview/conversion, onboarding loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Contributor → full-time',
    'Vibe check in interviews',
  ],
  steps: [
    { phase: 'observe', action: '기여자 데이터 분석', detail: 'OSS 활동 체크', duration: 1500 },
    { phase: 'plan', action: '채용 전략', detail: 'Talent pool update', duration: 2000 },
    { phase: 'act', action: '인터뷰/전환', detail: '채용 Issues', duration: 2000, github: { type: 'issue', title: '[Hiring] Top contributor: @dev123' } },
    { phase: 'evaluate', action: '온보딩 루프', detail: 'Daily iterations', duration: 1500, output: 'Hires: 3, Contributor→FT: 2' },
  ],
}

export const HR_WORKFLOW: AgentWorkflow = {
  agentId: 'people',
  name: 'HR/People Ops',
  description: 'Performance analysis, culture reinforcement, policy execution, satisfaction loops',
  xaiPrinciples: [
    'First Principles: 왜 이게 필요한가? 기본 가정 깨기',
    'Autonomy culture',
    'Inspired & fun elements (e.g., sleeping pods)',
  ],
  steps: [
    { phase: 'observe', action: '성과 데이터 분석', detail: 'Team health 체크', duration: 1500 },
    { phase: 'plan', action: '문화 강화 계획', detail: 'Autonomy focus', duration: 2000 },
    { phase: 'act', action: '정책 실행', detail: 'HR Issues', duration: 1500, github: { type: 'issue', title: '[HR] Quarterly team building' } },
    { phase: 'evaluate', action: '만족도 루프', detail: 'Daily optimization', duration: 1500, output: 'eNPS: 72, Retention: 94%' },
  ],
}

// ==================== All Workflows ====================

export const ALL_WORKFLOWS: AgentWorkflow[] = [
  CEO_WORKFLOW,
  CTO_WORKFLOW,
  CPO_WORKFLOW,
  CRO_WORKFLOW,
  PM_WORKFLOW,
  UX_WORKFLOW,
  VISUAL_WORKFLOW,
  MOTION_WORKFLOW,
  ANALYST_WORKFLOW,
  SWE_WORKFLOW,
  SWE_2_WORKFLOW,
  SWE_3_WORKFLOW,
  QA_WORKFLOW,
  AI_ML_WORKFLOW,
  PLATFORM_WORKFLOW,
  FRONTEND_WORKFLOW,
  SRE_WORKFLOW,
  SECURITY_WORKFLOW,
  DATA_ENG_WORKFLOW,
  ML_RESEARCH_WORKFLOW,
  MARKETING_WORKFLOW,
  SALES_WORKFLOW,
  SUPPORT_WORKFLOW,
  FINANCE_WORKFLOW,
  RECRUITER_WORKFLOW,
  HR_WORKFLOW,
]

export function getWorkflowByAgentId(agentId: string): AgentWorkflow | undefined {
  return ALL_WORKFLOWS.find(w => w.agentId === agentId)
}
