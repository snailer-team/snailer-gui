# PRD: Snailer GUI Multi‑Role Agent WorkOS (ElonX HARD)

## 0) 한 줄 요약 (No Fluff)
**agentId별로 기본 LLM을 자동 라우팅**하고(**CEO=Grok4 / SWE=Claude / Others=Kimi‑K2.5↔Gemini3**), **agentId마다 독립 브라우저 1개(세션 분리)**를 유지하며, GitHub/Stripe/X + 로컬 앱(터미널/Photoshop/Illustrator 등)을 **승인/감사/증거 기반으로 실행**해 “실제 업무”를 수행하게 한다.

## Key Assumptions (v1)
- OS 우선순위: **macOS first** (컴퓨터 제어/앱 제어 현실성)
- 앱 스택: **Tauri + Rust daemon** (이미 존재하는 엔진/승인 모델 활용)
- 브라우저 자동화: **Playwright(Chromium) 우선**, 단순 임베드는 WebView fallback
- 인증: GitHub는 **PAT(read‑only 우선)**, Stripe는 **restricted key(read‑only)**, X는 **공식 API 우선**
- 키 저장: **OS Keychain/Keyring**, GUI 평문 저장 금지
- 외부 데이터가 필요한 요청(최신 정보/웹 근거/리서치)은 **Kimi‑K2.5 Web‑Search 모드 API**로 강제 라우팅(역할 무관)
- 용어: 역할/포지션 대신 **agentId**를 단일 키로 사용

---

## 1) 배경 / 문제 정의 (압축)
현재: ElonX HARD는 **Plan Tree/Live Workflows 중심 시뮬레이션 UI** + evidence/조직/문화 룰이 있음.  
문제: **LLM 라우팅/실제 도구 실행/외부 연동/agentId별 브라우저 격리**가 없어 Macrohard(인간 없이 운영)로 확장 불가.

---

## 2) 목표 (Goals) + Success Criteria
### G1. 모델 라우팅
- 포지션/에이전트 ID 기준으로 기본 LLM Provider를 지정하고, 런타임에 자동 라우팅한다.
- 장애/쿼터/비용 상황에서 **fallback**(예: Kimi ↔ Gemini) 및 **정책 기반 차단**이 가능하다.
- 외부 데이터가 필요한 경우(웹 근거/최신 정보)에는 **Kimi‑K2.5 Web‑Search 모드**를 사용한다(역할/기본 모델과 무관).
Success:
- 라우팅 결정(Provider 선택) 성공률 **≥ 99%**
- Provider 오류 시 fallback 전환 **≤ 2s** (상태/증거 포함)
- 에이전트별 월간 비용 상한(budget) 위반 **0건**(차단/승인으로 방지)

### G2. 1‑Agent‑1‑Browser
- 각 포지션(에이전트)이 **독립 브라우저 인스턴스(또는 독립 프로필)**를 보유한다.
- 쿠키/세션/로그인이 섞이지 않도록 **프로필 디렉토리 분리**와 **윈도우/탭 소유권**을 보장한다.
Success:
- agentId 간 세션/쿠키 혼선 **0건**
- 브라우저 창 소유권 위반(다른 agentId가 조작) **0건**
- 브라우저 복구(restart) 시 동일 agentId 프로필로 재연결 **≥ 99%**

### G3. Tool/Connector 기반 “실제 업무”
- GitHub: Issues/PR/CI **읽기(v1)** → 쓰기(v2)
- Stripe: 결제/구독/매출 지표 **읽기(v1)** → 쓰기(v2, 고위험)
- X: **공식 API 우선(v1)**, 불가 시 “Browser semi‑auto”(승인/가드레일)
- 로컬 앱: 터미널, Photoshop, Illustrator 등 **컴퓨터 제어 도구화(macOS 우선)**
Success:
- GitHub/Stripe read 호출 실패율 **< 5%**
- 도구 실행(브라우저/터미널/앱) 1회 이상/agentId로 E2E 업무 루프 완료

### G4. 안전한 실행(필수)
- 모든 외부 호출/OS 제어는 **승인(approval) + 감사로그(audit) + 증거(evidence)**를 남긴다.
- 고위험 작업(결제/삭제/배포/대량 DM 등)은 **항상 사용자 승인**이 필요하다.
 - 스케일 대비: **rate limiting + backoff + circuit breaker**를 기본 내장한다.
Success:
- High‑risk 작업이 무승인으로 실행된 케이스 **0건**
- audit/evidence 누락 **0건**
- 과도 호출(API/툴)로 계정 정지/차단 유발 **0건**(rate limit로 방지)

---

## 3) 비목표 (Non‑Goals, v1)
- 완전 자율 “무승인” OS 제어(특히 파일 삭제/대량 결제/배포 등)
- X의 비공식 자동 스크래핑 “풀 자동화”(약관/차단 위험이 커서 v1은 보수적으로)
- Photoshop/Illustrator를 완전 자동 그래픽 생성 파이프라인으로 만드는 것(우선은 “열기/작업 지시/내보내기 보조” 수준)
- 완전 크로스플랫폼 OS 제어(Windows/Linux)는 v2+ (v1은 macOS first)

---

## 4) 사용자/역할(Personas) & 기본 모델 정책
### 에이전트 분류
- CEO: `ceo` → **Grok4 API**
- SWE 포지션: `swe`, `swe-2`, `swe-3` (+ 추후 SWE‑N) → **Claude API**
- 그 외 포지션(디자인/분석/마케팅/세일즈/ops 등): → **Kimi‑K2.5 / Gemini3 API**
  - 기본: Kimi‑K2.5, fallback: Gemini3 (또는 작업 타입별 라우팅)

### 정책 테이블(초안)
| Role group | Default LLM | Fallback | Notes |
|---|---|---|---|
| CEO | Grok4 | GPT | macro judgment / broadcast |
| SWE | Claude | GPT | 코드/리뷰/테스트 |
| Others | Kimi‑K2.5 | Gemini3 | 글쓰기/리서치/마케팅/ops |
| External data needed (any role) | Kimi‑K2.5 (Web‑Search mode) | Browser semi‑auto | 최신 정보/웹 근거가 필요할 때 강제 |

---

## 5) 핵심 UX / 플로우
### 5.1 Agent Workspace
- 좌측 Org에서 에이전트 선택 → 가운데 “Workspace”에서 해당 에이전트의:
  - Browser(해당 에이전트 전용 창)
  - Terminal(해당 에이전트 전용 세션)
  - Apps(Photoshop/Illustrator 등 런칭/포커스/핫키)
  - Connectors(GitHub/Stripe/X) 패널
  - Evidence feed(해당 에이전트가 만든 증거)
UI 전환:
- 기본은 **Tabs** (Browser / Terminal / Apps / Connectors / Evidence)
- 고압력 운영을 위한 **핫키**: `Cmd+1..5`로 탭 전환(추후)

### 5.2 1‑Agent‑1‑Browser 동작
- “Open Browser” 클릭 시:
  - 브라우저 창이 생성되고 에이전트에 바인딩됨
  - 해당 브라우저는 **agentId 전용 프로필 경로**를 사용(쿠키 분리)
  - 페이지 이동/스크린샷/DOM 읽기/클릭은 BrowserTool로 수행
탭 소유권:
- 탭도 `agentId → tabId[]`로 소유권을 관리하고, 다른 agentId의 조작 요청은 정책에서 차단
프라이버시:
- 스크린샷/텍스트 추출 시 **PII 마스킹 옵션**(이메일/전화/카드번호 정규식 기반) 제공

### 5.3 승인(Approval) 흐름
- 에이전트가 위험 작업 요청 → Pending approval 생성
- 사용자는 “Approve once / Request change / Reject”로 제어
- 승인/거절은 evidence로 남고, Plan Tree/Live Workflows에도 반영 가능
추가 규칙:
- 승인 요청은 **기본 타임아웃(예: 5분)** 후 자동 Reject(또는 Pause)
- Request change에는 “reason/수정 지시” 입력 필수(짧게)

### 5.4 에러 처리(필수)
- Tool 실패 → 자동 재시도(최대 3회, exponential backoff) → 실패 시 evidence 남김
- 반복 실패/서비스 장애 → circuit breaker open → fallback/provider switch → 여전히 실패면 “Surge mode”
- Surge mode: CEO(agentId=`ceo`)에게 “1‑line incident brief + evidence” 생성(수동 승인으로 개입)

---

## 6) 시스템 아키텍처(권장)
### 6.1 구성 요소
1) **Agent Runtime**
   - agentId, roleGroup, defaultModelPolicy, toolPermissions, browserSessionId 등을 보유
2) **LLM Router**
   - (agentId, taskType, costBudget, reliability) → provider 선택
   - `taskType=external_data`(웹 근거/최신 정보)인 경우 **Kimi‑K2.5 Web‑Search 모드**를 우선 선택
3) **Tool Bus**
   - Tool 호출 표준 인터페이스(요청/응답/에러/증거)
   - 구현: Rust async(예: tokio) 기반 request/response + correlationId
4) **Connectors**
   - GitHubConnector / StripeConnector / XConnector
5) **Computer Control Layer**
   - BrowserController(자동화)
   - TerminalController(PTY 세션)
   - AppController(macOS Accessibility/AppleScript 등)
6) **Policy & Approval Engine**
   - 위험도 분류 + allowlist/denylist + 승인 요구 여부 결정
   - rate limiting(에이전트/도구/도메인별), backoff, circuit breaker 포함
7) **Evidence/Audit Log**
   - 모든 tool call을 Evidence로 기록(누가/언제/무엇을/결과)
8) **State Store**
   - 최소 v1: in‑memory + 파일/SQLite(append‑only audit)로 내구성 확보

### 6.2 배치 원칙
- **비밀키/토큰은 GUI에 평문 저장 금지**
  - OS Keychain(예: macOS Keychain) + 로컬 daemon(proxy) 권장
- 네트워크 호출은 “Connector” 레이어로 중앙화
- OS 제어는 항상 사용자 승인/가드레일을 우선
 - 모든 도구 호출은 correlationId로 trace 가능해야 함(Plan/Evidence 연결)

### 6.3 Dependencies (제안)
- Browser automation: Playwright
- HTTP: reqwest
- Retry/backoff: tower / custom exponential backoff
- DB/log: rusqlite(또는 sqlite crate), append‑only audit
- Terminal PTY: portable‑pty(또는 platform PTY)
- Key storage: keyring(크로스플랫폼), macOS Keychain 우선

---

## 7) Tool/Connector 스펙(초안)
### 7.1 BrowserTool (1‑Agent‑1‑Browser)
필수 기능:
- `open(agentId)` → browserWindowId 반환
- `navigate(agentId, url)`
- `screenshot(agentId)` → Evidence(screenshot)
- `extract(agentId, selector/text)` (읽기 전용)
- `click/type(agentId, selector, value)` (승인 정책 적용)
격리:
- `userDataDir = <appData>/browsers/<agentId>/`
- 창/탭 소유권: agentId 매핑 테이블로 강제
구현 옵션:
- Option A(권장): Playwright(Chromium)로 외부 브라우저 컨트롤
- Option B: Tauri WebView + JS injection(단, 사이트 호환/보안 제약 큼)
추가(Clawedbot류 Computer Use 패턴):
- Option C(Claude 전용): Claude Computer Use API 기반 “스크린샷 → 액션(클릭/타이핑) → 스크린샷” 루프를 BrowserTool 내부에서 사용
  - 장점: 실제 UI 조작 범용성↑ (웹앱/로그인/복잡 UI)
  - 단점: 비용↑(스크린샷/컨텍스트), drift 위험 → step/예산/승인 가드레일 필수

### 7.2 TerminalTool
- agentId별 PTY 세션 유지
- 명령 실행은 위험도 분류(예: `rm -rf`, `git push`, `curl | sh`는 항상 승인)
- stdout/stderr는 Evidence(terminal)로 저장
고위험 탐지(예시 regex):
- `/\brm\b.*-rf\b/`
- `/\bsudo\b/`
- `/curl\\s+.*\\|\\s*(sh|bash)/`
- `/\bgit\\s+push\b/`
- `/\b(del|format|mkfs)\b/`
권장 패턴(Clawedbot류):
- 모든 실행은 evidence로 기록(명령+stdout/stderr+duration)
- sandbox: 허용 폴더/허용 명령 allowlist(선택) + 고위험은 승인 필수

### 7.3 AppTool (Photoshop/Illustrator 등)
v1 범위:
- 앱 실행/포커스 전환/기본 단축키 수행/파일 열기/내보내기 “보조”
안전:
- 임의 클릭/키입력은 기본 승인 필요(특히 destructive)
구현(제안):
- macOS: Accessibility API + AppleScript(가능한 범위)
- v2: Windows UIA / Linux 대안(범위 확장)

### 7.4 GitHubConnector
- 읽기: repo list, issues, PRs, checks/CI status
- 쓰기(v2): issue 생성/코멘트, PR 코멘트/리뷰(권한 정책)
- Evidence: issue/pr 링크 + 요약 + 결과
구현(권장):
- v1/MVP: **GitHub 공식 CLI(`gh`)를 TerminalTool로 호출**해 기능 커버리지를 빠르게 확보
  - Read(저위험): `gh pr list`, `gh pr view`, `gh pr checks`, `gh issue list`, `gh issue view`, `gh release list`, `gh label list`, `gh milestone list`
  - Write(중/고위험): `gh issue create|comment|edit`, `gh pr comment|review|merge` → 항상 승인 필요
- v2+: 필요 시 GitHub REST/GraphQL로 직접 Connector 구현(조직 운영/서버 사이드)
인증(제안):
- v1: PAT(read‑only scope) 저장은 keyring
- v2: OAuth/GitHub App(조직 운영용)
추가(옵션):
- v1에서 `gh auth login`(사용자 주도) 기반 인증을 허용하고, Snailer는 토큰을 직접 취급하지 않는다.

### 7.5 StripeConnector
- 읽기 중심(v1): MRR/ARR, churn proxy, 결제 실패, 플랜 분포
- 쓰기(v2): 쿠폰/요금 변경 등은 고위험 승인 필수
인증:
- restricted key(read‑only) + keyring 저장

### 7.6 XConnector
- v1: 공식 API 가능하면 사용(검색/리스트/메트릭)
- 공식 API가 불가/제한이면: BrowserTool 기반 “반자동 수집”(스크린샷 + 요약)
- 약관/차단 리스크를 UI에 명시
전환 로직:
- API 실패/권한 부족 → “semi‑auto mode” 제안(승인 필요) → 결과는 evidence로 남김

---

## 8) 정책(Policy) & 권한 모델
### 8.1 Tool 권한
- 에이전트마다 tool allowlist를 가진다(이미 `controls` 개념 존재 → 이를 실행 권한으로 확장)
- 예: `pm`은 `analytics/payments/browser/github` 읽기 위주, `swe`는 `repo/terminal` 쓰기 가능

### 8.2 위험도 분류(예시)
- Low: 페이지 열람, 스크린샷, 로그 읽기
- Medium: 댓글 작성, PR 리뷰 코멘트, 파일 생성
- High: 결제/요금 변경, 배포/merge, 대량 삭제/대량 메시지, 외부 업로드
→ Medium/High는 기본 승인(조직 설정으로 완화 가능)

---

## 9) 데이터/스토리지
- `AgentConfig`(agentId → modelPolicy, tools, budgets)
- `ConnectorAuth`(keychain 참조 핸들)
- `BrowserSessions`(agentId → windowId/profilePath)
- `AuditLog`(immutable append‑only: 파일 또는 SQLite append 테이블)
- `Evidence`(이미 존재하는 구조 확장)
데이터 연결:
- evidence는 `relatedAgentId` + `relatedNodeId`(Plan Tree)로 연결 가능해야 함
- 모든 Tool 실행은 audit에 기록되고 evidence는 그 요약/증거를 담당

## 9.1 Data Privacy (필수)
- Evidence/Audit에 **PII 최소화**(마스킹/필터) 옵션 제공
- 토큰/키/쿠키는 절대 evidence에 남기지 않음
- 스크린샷 공유 시 “민감 영역 블러” 옵션(후순위)
---

## 10) 성공 지표(Success Metrics)
- 에이전트별 브라우저 세션 분리 성공률(로그인 섞임 0건)
- 승인 없이 실행된 high‑risk 작업 0건
- “업무 루프” E2E 성공(정의): agentId 기준 (Observe→Act→Evidence) 1회 이상 완료
- GitHub/Stripe 데이터 조회 latency & 실패율
추가:
- Tool failure rate **< 5%**
- Approval latency(중요 작업) median **< 2m** (데모 기준)

---

## 11) 단계별 구현 계획 (Milestones) + Testing Gates
### M0 (데모 강화, 1~2주)
- AgentConfig에 모델 매핑 UI/설정 추가(실제 호출은 mock 가능)
- 1‑Agent‑1‑Browser: “창 분리 + 프로필 분리”만 먼저 구현(자동화 최소)
- GitHub/Stripe/X는 “읽기 전용 mock 패널”로 UI 연결
Testing:
- 브라우저 프로필 분리 smoke test(2개 agentId 로그인 분리 확인)

### M1 (실제 LLM 라우팅, 2~4주)
- Provider 어댑터: Grok4/GPT/Claude/Kimi/Gemini의 공통 인터페이스
- 역할별 기본 라우팅 + fallback + 비용/쿼터 제한
Testing:
- Router unit tests(정책/예외/fallback)
- Provider adapter contract tests(mock server)

### M2 (Connectors v1: 읽기, 2~4주)
- GitHubConnector read + Evidence 기록
- StripeConnector read + Evidence 기록
- XConnector: 공식 API 또는 브라우저 반자동 수집
Testing:
- Connector integration tests(샌드박스/목 데이터)
- Rate limit/backoff 테스트

### M3 (Computer Control v1, 3~6주)
- BrowserTool 자동화(탭/스크린샷/추출/기본 입력) + 승인 정책
- TerminalTool 세션화 + 위험 명령 승인
- AppTool: macOS에서 앱 실행/포커스/기본 단축키
Testing:
- E2E: Browser navigate→screenshot→extract
- Terminal 위험명령 차단 테스트

### M4 (Write actions + 운영화, 4~8주)
- GitHub write(issues/PR 리뷰) + 정책
- Stripe write(고위험 승인)
- War-room mode(incident 시 swarm + cooldown) UI
Testing:
- 승인 플로우(타임아웃/리퀘스트 체인지/감사로그) E2E

---

## 12) 리스크 & 대응 (High Leverage)
- Risk: 브라우저 혼선/창 폭주 → Mitigation: agentId 소유권 테이블 + idle auto‑close + 재연결
- Risk: 토큰 유출 → Mitigation: keyring + evidence redaction + 최소권한 키만 허용
- Risk: X 차단/약관 이슈 → Mitigation: API 우선, semi‑auto는 사용자 승인 + rate limit
- Risk: OS 접근성 권한 문제(macOS) → Mitigation: 온보딩 체크리스트 + 권한 상태 UI
- Risk: 고압력 운영으로 실패 루프 → Mitigation: Surge owner rotation + cooldown rule(규칙화)

## 13) 오픈 질문(결정 필요)
1) “Grok4/GPT/Claude/Kimi/Gemini” 각각의 실제 호출 방식(엔드포인트/키/스트리밍/툴콜 지원)은 어떤 스펙으로 통일할지?
2) 브라우저는 내장(WebView) vs 외부 브라우저(Chromium/Playwright) 중 무엇을 우선?
3) OS 앱 제어를 macOS 전용으로 시작할지(현 환경 기준) 또는 크로스플랫폼을 즉시 요구하는지?
4) X 데이터 수집은 공식 API 우선이 맞는지(약관/차단 리스크), 그리고 계정/권한은 누가/어떻게 제공하는지?
5) 비밀키 저장은 로컬 keychain + daemon proxy가 가능한지(tauri sidecar/daemon) 또는 별도 서버가 필요한지?
