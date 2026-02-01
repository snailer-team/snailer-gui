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
  description: 'Vision decomposition, C-level meetings, performance review, war room surges',
  xaiPrinciples: [
    'Autonomy: 랩탑 받고 지시 없이 시작',
    'High leverage: bottlenecks 예측·제거',
    'No fluff: direct 지시',
    'Fun: inspired 분위기 유지',
  ],
  revenueImpact: '전체 매출 목표 설정, 프리미엄 모델 최적화',
  steps: [
    { phase: 'observe', action: '시장 데이터 분석', detail: 'First Principles로 기본 가정 깨기', duration: 2000 },
    { phase: 'plan', action: '비전 재분해', detail: 'Macro judgment로 전략 수립', duration: 1500 },
    { phase: 'act', action: 'C-level 미팅', detail: '정책 결정 및 지시 브로드캐스트', duration: 2000 },
    { phase: 'act', action: 'PR 최종 승인', detail: '개발자 1:1 리뷰, short feedback', duration: 1500, github: { type: 'review', title: 'CEO Review: Auth implementation' } },
    { phase: 'act', action: 'High leverage tasks 식별', detail: 'Issues에서 critical path 선정', duration: 1000, github: { type: 'issue', title: '[HIGH] Bottleneck: API latency' } },
    { phase: 'evaluate', action: '전체 성과 검사', detail: 'Daily iteration 완료, 다음 사이클 준비', duration: 1500, output: '매출 목표 달성률: 94%' },
  ],
}

export const CTO_WORKFLOW: AgentWorkflow = {
  agentId: 'cto',
  name: 'CTO',
  description: 'Architecture optimization, infrastructure directives, benchmark-based adjustments',
  xaiPrinciples: [
    'Bottom-up: hole fill 자율',
    'Fast iteration: daily tech updates',
    'Challenge requirements: "Why isn\'t it done already?"',
  ],
  revenueImpact: '기술 기반 매출 성장, 엔터프라이즈 스케일링',
  steps: [
    { phase: 'observe', action: '기술 메트릭 모니터', detail: 'Colossus 스케일 체크', duration: 1500 },
    { phase: 'plan', action: '아키텍처 최적화 계획', detail: 'Distributed job queue 설계', duration: 2000 },
    { phase: 'act', action: '기술 태스크 생성', detail: 'Issues 분해', duration: 1000, github: { type: 'issue', title: 'Implement in-memory KV store with transactions' } },
    { phase: 'act', action: 'PR 기술 리뷰', detail: 'CI/Claude 후 피드백', duration: 1500, github: { type: 'review', title: 'Tech Review: Database optimization' } },
    { phase: 'act', action: '인프라 지시 발행', detail: 'CEO 지시 자율 실행', duration: 1000 },
    { phase: 'evaluate', action: '벤치 결과 검토', detail: 'Daily iteration 완료', duration: 1500, output: 'Latency -23%, Throughput +45%' },
  ],
}

export const CPO_WORKFLOW: AgentWorkflow = {
  agentId: 'cpo',
  name: 'CPO',
  description: 'Product roadmap prioritization, feature broadcasts, value measurement',
  xaiPrinciples: [
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
  description: 'Elon-style requirements: real-time logs + revenue + GitHub feedback → fast iteration, delete culture',
  xaiPrinciples: [
    'Logs-first: Grok/chat traces, error patterns, internal metrics',
    'Revenue-first: Stripe + paid tier usage beats opinions',
    'Elon-like judgment: "what sucks?" + macro leverage',
    'Challenge requirements: Why isn’t it done already?',
    'Delete culture: low-leverage work gets archived by default',
    'Short & sharp: no PRD/RICE/Opportunity Tree bloat',
  ],
  revenueImpact: 'Premium/Enterprise 매출 극대화 (conversion↑ churn↓)',
  steps: [
    {
      phase: 'observe',
      action: 'Observe: what sucks?',
      detail: 'Snailer usage logs + error patterns + GitHub Issues/PR feedback + Stripe revenue + X engagement',
      duration: 1500,
    },
    {
      phase: 'observe',
      action: 'Competitor scan',
      detail: 'X opencode / Claude Code 등 경쟁사 플로우 대비: 우리 차별점(속도/자동검증/멀티에이전트) 정의',
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
      action: 'Pick top leverage',
      detail: '병목/매출/리스크 기준으로 3개만 남기고 나머지는 merge/kill 후보로 표시',
      duration: 1200,
    },
    {
      phase: 'act',
      action: 'Create short Issues',
      detail: '짧은 제목 + 검증 기준(acceptance/CI evidence)만 남기고 즉시 착수 가능하게',
      duration: 1000,
      github: { type: 'issue', title: '[HIGH] Fix: Agent run approval bottleneck (auto-evidence + retry)' },
    },
    {
      phase: 'act',
      action: 'Broadcast to agents',
      detail: 'SWE/UX/Platform에 top leverage 3개를 direct 지시 (no fluff)',
      duration: 900,
    },
    {
      phase: 'act',
      action: 'Archive low-leverage',
      detail: 'Leverage/revenue impact 낮은 아이템은 자동 archive 제안(삭제 문화 강제)',
      duration: 800,
      github: { type: 'issue', title: '[ARCHIVE] Low leverage: cosmetic settings polish' },
    },
    {
      phase: 'evaluate',
      action: 'Same-day loop',
      detail: '몇 시간 내 metrics/CI/X feedback 확인 → 다시 Observe로',
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
  description: 'Decompose, ship, coordinate parallel SWE execution, CEO 1:1 review',
  xaiPrinciples: [
    'Ownership: 지시 없이 시작, hole fill',
    '24h iteration: multiple updates',
  ],
  steps: [
    { phase: 'observe', action: 'PM Issues 관찰', detail: '태스크 선택', duration: 1000 },
    { phase: 'plan', action: '코드 분해', detail: 'First Principles 설계', duration: 1500 },
    { phase: 'act', action: '코드 작성', detail: 'Real-life 태스크', duration: 3000 },
    { phase: 'act', action: 'PR 생성', detail: 'GitHub PR 올림', duration: 1000, github: { type: 'pr', title: 'feat: Distributed job queue with priority' } },
    { phase: 'act', action: 'CI 실행', detail: '테스트 자동화', duration: 2000, github: { type: 'ci', title: 'CI: Running tests...' } },
    { phase: 'act', action: 'CEO 1:1 리뷰', detail: '피드백 → 추가 commit', duration: 1500, github: { type: 'review', title: 'CEO feedback applied' } },
    { phase: 'evaluate', action: 'Merge', detail: 'Daily iteration 완료', duration: 1000, github: { type: 'merge', title: 'Merged: feat: Distributed job queue' }, output: 'Lines: +342, Tests: 24 passed' },
  ],
}

export const SWE_2_WORKFLOW: AgentWorkflow = {
  agentId: 'swe-2',
  name: 'Software Engineer #2',
  description: 'Parallel delivery: pick a bottleneck, ship minimal diff, keep CI green',
  xaiPrinciples: [
    'Extreme autonomy + speed',
    'High leverage: unblock the org',
    'Delete culture: remove unnecessary code/steps',
  ],
  steps: [
    { phase: 'observe', action: 'Scan bottlenecks', detail: 'Look for the highest leverage unblock', duration: 900 },
    { phase: 'plan', action: 'Minimal patch plan', detail: 'Small PR, verifiable outcome', duration: 1200 },
    { phase: 'act', action: 'Implement fix', detail: 'Tight diff + tests', duration: 2600 },
    { phase: 'act', action: 'PR 생성', detail: 'Ship the unblock', duration: 900, github: { type: 'pr', title: 'fix: Reduce approval friction + better retries' } },
    { phase: 'act', action: 'CI 실행', detail: 'Keep green', duration: 1500, github: { type: 'ci', title: 'CI: verify fix + regression tests' } },
    { phase: 'evaluate', action: 'Merge', detail: 'Fast iteration complete', duration: 900, github: { type: 'merge', title: 'Merged: fix approval friction' }, output: 'Incidents: -1, Approval time: -30%' },
  ],
}

export const SWE_3_WORKFLOW: AgentWorkflow = {
  agentId: 'swe-3',
  name: 'Software Engineer #3',
  description: 'Verification-first: harden CI, prevent regressions, evidence loops',
  xaiPrinciples: [
    'Proof > opinions',
    'Automate verification',
    'War-room readiness: failures become playbooks',
  ],
  steps: [
    { phase: 'observe', action: 'Inspect failures', detail: 'CI flakes, regressions, slow tests', duration: 1000 },
    { phase: 'plan', action: 'Fix + guardrail', detail: 'Add minimal tests + evidence hooks', duration: 1400 },
    { phase: 'act', action: 'Patch + tests', detail: 'Reduce surface area, keep diff small', duration: 2400 },
    { phase: 'act', action: 'CI 실행', detail: 'Reliability pass', duration: 1500, github: { type: 'ci', title: 'CI: stabilize + speed up' } },
    { phase: 'evaluate', action: 'Merge', detail: 'Evidence recorded', duration: 900, github: { type: 'merge', title: 'Merged: CI reliability hardening' }, output: 'Flakes: -60%, Runtime: -15%' },
  ],
}

export const AI_ML_WORKFLOW: AgentWorkflow = {
  agentId: 'ai-ml',
  name: 'AI/ML Engineer',
  description: 'Model optimization, Grok integration, benchmark loops',
  xaiPrinciples: [
    'High leverage: SOTA 초월',
    'Macro judgment: 큰 그림 AI 판단',
  ],
  steps: [
    { phase: 'observe', action: 'Reasoning 태스크 분석', detail: 'Grok 통합 확인', duration: 1500 },
    { phase: 'plan', action: '모델 최적화 계획', detail: 'SOTA 분석', duration: 2000 },
    { phase: 'act', action: '모델 훈련', detail: 'Daily iterations', duration: 3000, github: { type: 'pr', title: 'feat: Agentic workflow for video generation' } },
    { phase: 'act', action: 'CI 벤치마크', detail: 'Grok 4.1 스타일', duration: 2000, github: { type: 'ci', title: 'Benchmark: Model evaluation' } },
    { phase: 'evaluate', action: '벤치 루프', detail: 'Iteration 완료', duration: 1500, output: 'Accuracy: 94.2%, Latency: -18%' },
  ],
}

export const PLATFORM_WORKFLOW: AgentWorkflow = {
  agentId: 'platform',
  name: 'Platform Engineer',
  description: 'Scaling observation, pipeline design, server control, stability loops',
  xaiPrinciples: [
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
