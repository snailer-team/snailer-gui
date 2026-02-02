# PRD (MVP): CEO Auto‑Cycle for Multi‑Agent WorkOS

## 0) 한 줄 요약
ElonX HARD에서 `ceo` 에이전트가 **정해진 주기로 자동으로 판단→브로드캐스트→업무 배분**을 수행해, 최소한의 인간 개입으로 `pm + swe-2 + swe-3`가 반복적으로 일을 진행하도록 만든다.

---

## 1) MVP 목표(What “Done” Looks Like)
### 핵심 결과
- 사용자가 “시작”만 하면, **CEO 사이클이 자동으로 반복 실행**된다(예: 30분마다).
- 매 사이클마다 CEO가:
  1) 현재 상태를 요약(Observe)
  2) top leverage 1~3개를 선택(Plan)
  3) `pm`, `swe-2`, `swe-3`에 짧은 지시를 브로드캐스트(Act)
  4) 이전 지시의 결과(증거/진행률)로 다음 사이클을 갱신(Evaluate)
- 모든 사이클은 **Evidence + Audit**로 남는다(무엇을 보고, 무엇을 결정했는지).

### 포함 에이전트(MVP)
- `ceo` (Grok4 기본, 외부 데이터 필요 시 Kimi‑K2.5 Web‑Search로 강제 라우팅)
- `pm` (Kimi 기본, 외부 데이터 필요 시 Kimi Web‑Search)
- `swe-2`, `swe-3` (Claude)

### MVP 접근 방식(2트랙)
- Track A (Native): Snailer 내부 Tool(Browser/Terminal/gh)로 점진적으로 “실제 실행”을 구현
- Track B (OpenClaw): OpenClaw(Open-source agent gateway)를 **실행 엔진(Computer‑Use/자동화)** 으로 사용하고, Snailer는 **오케스트레이션/승인/증거 UI**에 집중
  - 목적: “Mac mini/VPS에 24/7 백그라운드 에이전트”를 빠르게 실사용 수준으로 올리기

---

## 2) 비목표(Non‑Goals, MVP)
- X/Photoshop/Illustrator의 “실제 자동 조작”까지는 MVP에서 제외(읽기/반자동도 후순위).
- GitHub는 **연동 포함(최소 read)**. 단, write(이슈 생성/코멘트/리뷰/머지)는 **항상 승인 필요**이며 자동 머지/배포는 제외.
- 자동 `merge`, 자동 `deploy`, 결제/요금 변경 같은 high‑risk 작업 자동 실행 제외(항상 승인 필요).
- Claude “Computer Use”(스크린샷 기반 마우스/키보드 제어) 기반의 완전 자동 UI 조작은 **MVP에서는 포함하지 않고** M4(파일럿)로 미룬다.
- Track B(OpenClaw)를 쓰더라도: OpenClaw의 웹 대시보드/게이트웨이를 **공개 인터넷에 직접 노출**하는 운영은 MVP에서 금지(로컬/VPN 전제).

---

## 3) UX / 플로우
### 3.1 CEO Auto‑Cycle 컨트롤(UI)
ElonX HARD 화면에 다음을 제공:
- `Auto‑Cycle: ON/OFF`
- `Interval` 설정(예: 5/15/30/60분)
- `Run now`(수동 1회 실행)
- `Next run in …` 카운트다운
- `Kill switch`(즉시 중단 + 모든 pending timer 해제)

오른쪽 사이드(패널)에는 **GitHub Setup(gh 상태 체크/가이드)** 탭을 추가한다:
- `gh installed` / `authenticated` 상태 표시
- 필요한 경우 설치/로그인 커맨드 안내

### 3.1.1 (Track B) OpenClaw Setup 상태 체크(가이드)
오른쪽 사이드(Setup)에 OpenClaw용 체크리스트를 추가한다:
- OpenClaw Gateway 실행 여부(예: 로컬 포트/헬스체크)
- Sandbox(Docker) 동작 여부
- 공개 노출 방지(로컬/VPN만 허용) 상태 표시
- “이 머신이 24/7 에이전트 하우스(Mac mini/VPS)”로 운영 중인지 표시

### 3.2 브로드캐스트 표시
- CEO가 만든 브로드캐스트를 “timeline”으로 표시
- 각 브로드캐스트는:
  - `toAgentIds`(pm/swe-2/swe-3)
  - `message`(1~3줄, no fluff)
  - `why`(한 줄: leverage/병목/리스크 근거)
  - `evidenceLinks`(관련 Evidence id들)
  - `expiresAt`(다음 사이클 전까지 유효 등)

### 3.3 업무 배분 반영
브로드캐스트가 생성되면:
- `agentStatuses[agentId].currentTask`가 갱신된다(“지금 뭐 하는 중인지”).
- Plan Tree를 사용하는 경우:
  - root 아래에 CEO가 지정한 작업 노드를 자동 생성/할당(옵션).
- Live Workflows 사용 시:
  - 해당 에이전트 카드에 “현재 지시”가 반영된다(옵션).

### 3.3.1 병렬 실행 규칙(Parallel Execution Rules)
Macrohard의 “병렬 에이전트”를 MVP에서 실제로 체감하게 하기 위해, 브로드캐스트는 기본적으로 병렬 실행을 전제한다.
- `pm`은 “요구사항/이슈 정리 + 브로드캐스트 보조” 루프를 유지
- `swe-2`와 `swe-3`는 동시에(병렬) 서로 다른 top leverage 작업을 수행
- 동시성 제한: `maxParallel=2`(MVP 기본)로 시작하고, 실패율/비용을 보고 조정
- “Fires” 발생(연속 실패/CI 붉음) 시에는 병렬 작업을 일시 중단하고 surge 모드로 전환(아래 5.3)

---

## 4) CEO 사이클의 입력/출력 계약(Contract)
### 4.1 CEO 입력(Observe Context)
MVP에서 CEO가 보는 정보(우선순위 높은 것부터):
- `PlanTree`: bottleneck, blocked, failed, running 노드 요약
- `Evidence`: 최근 N개(테스트/빌드/터미널/메트릭/경쟁사 리서치 등)
- `AgentStatuses`: pm/swe-2/swe-3 현재 작업
- GitHub read 요약: 최근 PR/CI 상태 + open issues/labels/milestones/releases(gh CLI 기반)
- (옵션) Stripe read 요약: MRR/결제실패/플랜 분포를 1~2줄로 요약한 evidence (read-only)
- (Track B) OpenClaw run 요약: 최근 작업(코드 변경/테스트/PR 생성) + evidence 폴더 링크

### 4.2 CEO 출력(LLM 결과) — JSON 우선
CEO는 “자유 서술” 대신 구조화 결과를 낸다(파싱 안정성).
예시 스키마:
```json
{
  "cycleSummary": "1-2 lines",
  "topLeverage": [
    {
      "title": "short task title",
      "assignee": "pm|swe-2|swe-3",
      "why": "1 line",
      "risk": "low|medium|high",
      "evidenceIds": ["ev-1"],
      "acceptance": ["CI green", "evidence added"]
    }
  ],
  "broadcasts": [
    { "to": "swe-2", "message": "1-3 lines", "expiresMins": 60 }
  ],
  "needsExternalData": false
}
```

### 4.3 외부 데이터 필요 시 라우팅 규칙(MVP 반영)
- CEO가 `needsExternalData=true` 또는 시스템이 “최신/웹 근거 필요”로 분류하면:
  - 해당 서브태스크는 **Kimi‑K2.5 Web‑Search 모드**로 실행해 evidence를 만든 뒤,
  - CEO는 그 evidence를 기반으로 다음 브로드캐스트를 생성한다.

---

## 5) 안전/정책(Approval & Rate Limit)
### 5.1 위험도 기준(간단)
MVP에서 CEO Auto‑Cycle이 직접 실행 가능한 액션은 “저위험”만:
- UI/Plan/Evidence 업데이트
- 브로드캐스트 생성/상태 갱신

아래는 절대 자동 실행 금지(항상 승인):
- `git push`, `merge`, `deploy`
- 결제/요금 변경(Stripe write)
- OS 앱 자동 조작(키/마우스)
- X 대량 수집/자동 포스팅

### 5.2 Rate limiting
- CEO cycle LLM 호출: 분당/시간당 제한
- Tool 호출: connector별 제한 + exponential backoff
- 연속 실패 시 circuit breaker open(다음 사이클은 “요약만” 생성)

### 5.3 Drift Guard (무인 루프 안정성)
완전 무인에 가까운 24h 운영을 목표로 하되, 장기 루프에서의 hallucination/drift(목표 탈선)를 MVP부터 방지한다.
- **Fail counter**: 동일 유형 실패가 3회 누적되면 `auto-pause` + “Surge mode” 진입(CEO re-decompose)
- **Vision re-alignment**: 매 N 사이클(예: 5)마다 CEO가 “원래 목표/제약/검증”을 1~2줄로 재확인하고, 현재 브로드캐스트가 그 목표를 여전히 최우선으로 밀고 있는지 점검
- **Auto-retry**: tool 실패는 3회까지만(backoff) 재시도, 이후 중단 + evidence 기록
- **Kill switch**는 항상 최우선: 모든 타이머/실행 즉시 중단

---

## 6) 기술 설계(Implementation Notes)
### 6.1 상태/스토어 변경(MVP)
- `elonX` 아래에 추가(예):
  - `autoCycle: { enabled, intervalMs, nextRunAt, lastRunAt, status }`
  - `broadcasts: Broadcast[]` (agentId별 필터 가능)
  - `cycleRuns: { id, startedAt, endedAt, status, evidenceIds }[]`

### 6.2 스케줄러
- GUI가 켜져 있고 `enabled=true`면 timer가 동작
- 실행 중 중복 방지: `status=running`이면 다음 tick skip
 - 병렬 실행: 동일 사이클에서 `swe-2`/`swe-3` 작업은 병렬로 dispatch하되, `maxParallel`로 제한

### 6.3 라우팅/프로바이더
- provider adapter는 공통 인터페이스로 통일
- `ceo` 기본: Grok4
- `pm`: Kimi
- `swe-*`: Claude
- `external_data`: Kimi Web‑Search 강제

### 6.4 Evidence 생성
- 각 cycle run마다 최소 2개 evidence를 만든다:
  - `CEO Cycle Summary`(요약 + top leverage + broadcasts)
  - `Decision Trace`(입력 요약 + 선택 근거 + 사용한 evidence links)

### 6.4.1 비용/드리프트 가드레일(Computer Use 대비)
컴퓨터 제어(스크린샷+긴 컨텍스트)는 비용/드리프트(목표 탈선) 리스크가 크므로 MVP부터 아래를 기본 규칙으로 둔다:
- `maxStepsPerRun`(예: 25) / `maxWallTimeMs`(예: 2분) / `maxCost`(예산) 상한
- 각 단계는 **짧은 상태 요약 + 다음 1 step**만 생성(장기 계획 고착 방지)
- 반복 실패 시 **3회 재시도 후 중단** + evidence 기록 + CEO에 incident brief
- “Kill switch”는 모든 자동 루프/툴 실행을 즉시 중단

### 6.6 (Track B) OpenClaw 통합 설계(권장 MVP 가속)
OpenClaw를 “실행 엔진”으로 채택하면 Snailer는 다음만 책임진다:
- CEO Auto‑Cycle(의사결정/브로드캐스트)
- 승인/정책(고위험 작업 게이트)
- Evidence/Audit 시각화(무슨 일이 일어났는지)

OpenClaw가 담당(외부 프로세스):
- Computer‑Use 스타일 실행(브라우저/터미널/파일)
- 지속 실행(24/7), 메시지 채널(텔레그램/웹 대시보드 등) 입력 처리
- sandbox(컨테이너/워크스페이스 제한) + 실행 로그/스크린샷 저장

통합 방식(최소 → 확장):
1) 최소(MVP): Snailer가 OpenClaw “결과 폴더(evidence)”를 읽어 UI에 attach
2) 다음: Snailer가 OpenClaw Gateway에 작업을 제출(로컬 API/웹훅/채널 브리지 중 1개 선택)
3) 최종: Snailer가 OpenClaw를 worker로 여러 대(Mac mini fleet) 운영

보안 규칙(필수):
- OpenClaw 컨트롤 패널/게이트웨이는 **절대 공개 인터넷에 노출하지 않음**
- allowlist: 도메인(github.com 등), 폴더(워크스페이스) 기본 적용
- write 동작은 Snailer approval 없이는 실행하지 않도록 “정책 레이어”로 래핑(또는 OpenClaw side에서 승인 모드 강제)

### 6.5 GitHub 연동(MVP): gh CLI 우선
MVP는 GitHub API를 직접 붙이기보다, **GitHub 공식 CLI(`gh`)를 표준 인터페이스로 사용**한다.
- 구현: `TerminalTool`로 `gh ...` 실행 → stdout/stderr를 Evidence(type=`terminal`)로 저장 → CEO Observe에 요약으로 공급.
- 장점: PR/Issues/Checks/Releases/Labels/Milestones 등 커버리지 높고 인증이 단순.

#### 인증(초기 1회, 사용자 주도)
- MVP 전제: 사용자가 로컬에서 `gh auth login`을 완료(대화형 브라우저 로그인).
- Snailer는 토큰을 직접 저장/취급하지 않고, `gh`의 인증 상태만 검사한다.

#### Read 명령(저위험, 자동 실행 허용)
- PR 목록: `gh pr list --state open --limit N`
- PR 상세: `gh pr view <num> --comments`
- PR 체크/CI: `gh pr checks <num>`
- Issue 목록: `gh issue list --state open --limit N`
- Issue 상세: `gh issue view <num>`
- Releases: `gh release list --limit N`
- Labels/Milestones: `gh label list`, `gh milestone list`

#### Write 명령(중/고위험, 항상 승인 필요)
- Issue 생성/편집/코멘트: `gh issue create|edit|comment`
- PR 코멘트/리뷰/머지: `gh pr comment|review|merge`
정책:
- write는 “Approve once”로만 허용(자동 승인 금지)
- `gh pr merge`는 MVP 기본 차단(승인하더라도 강한 경고 + CEO 확인 단계)

### 6.7 (옵션) Stripe read-only 최소 연동
매출 최적화까지는 MVP의 주목표는 아니지만, CEO의 “macro judgment”가 현실 데이터에 닿도록 최소 read-only 요약을 추가할 수 있다.
- 목표: “MRR/결제 실패/플랜 분포”를 1~2줄로 요약한 evidence를 주기적으로 생성
- 제약: write(쿠폰/요금 변경)는 금지(항상 승인 + v2)
- 구현 접근:
  - Stripe API 직접 호출(Restricted key, read-only) 또는 Stripe CLI(가능 시)
  - 결과는 evidence(type=`metric` 또는 `terminal`)로 저장

---

## 7) 단계별 구현 계획(Milestones)
### M0 — “자동 사이클 껍데기” (1~2일)
- Auto‑Cycle UI(ON/OFF, interval, countdown, Run now)
- cycle run 기록 + 브로드캐스트 저장(템플릿 기반 mock)
Acceptance:
- 30분 간격으로 최소 2회 자동 생성 확인
- Kill switch 즉시 중단 확인

### M1 — “CEO LLM 연결 + JSON contract” (3~7일)
- Grok4 호출(또는 provider stub) + JSON 출력 파싱
- 파싱 실패 시 fallback: 안전한 템플릿 브로드캐스트
Acceptance:
- 10회 연속 실행에서 파싱 실패율 < 20%(fail‑safe로 기능 유지)

### M2 — “PM/SWE 반영 + Evidence 연동” (3~7일)
- broadcasts → agentStatuses.currentTask 반영
- cycle summary/trace evidence 생성
- GitHub read 연동(gh): PR/Issue/CI 요약 evidence 생성 + CEO Observe에 포함
 - 병렬 실행: `swe-2`/`swe-3` 동시 dispatch + `maxParallel` 제한
Acceptance:
- 브로드캐스트 클릭 시 관련 evidence/노드로 이동(최소 링크)
- `gh pr list`, `gh issue list`, `gh pr checks` 결과가 evidence로 남고 CEO 요약에 반영됨
 - 병렬 실행 시 deadlock 없이 cycle이 종료되고, 실패 시 5.3 Drift Guard로 전이됨

### M3 — “external_data 라우팅 + Kimi Web‑Search” (3~7일)
- “최신/웹 근거 필요” 분류 규칙 + Kimi Web‑Search 호출 + evidence 저장
Acceptance:
- external_data 케이스에서 web‑search evidence가 먼저 생성되고, 이후 CEO 브로드캐스트가 업데이트됨

### M3-B — “Stripe read-only 요약(선택)” (1~3일)
목표: CEO Observe에 매출/결제 신호를 최소로 포함한다.
Acceptance:
- MRR/결제 실패 요약이 evidence로 생성되고, CEO 사이클 입력에 포함됨
- rate limit/backoff 동작 확인

### M4 — “Clawedbot 스타일 Computer‑Use 파일럿(Claude) for SWE” (옵션, 1~3주)
목표: SWE 에이전트(`swe-2`, `swe-3`)가 Claude Computer Use API(또는 tool‑use 기반)로 “실제 컴퓨터 작업”을 제한적으로 수행할 수 있게 한다.

설계(Clawedbot류에서 가져올 핵심 패턴):
- Loop: `screenshot → decide(action) → execute → screenshot …` (Observe→Act 반복)
- Evidence: 스크린샷/명령 로그/결과 산출물을 run 단위로 남김(e.g., `evidence/<runId>/...`)
- Safety: high‑risk 작업은 승인 모드 + sandbox(허용 폴더/허용 도메인)

가드레일(필수):
- 고위험 액션(파일 삭제/머지/배포/결제/대량 메시지)은 항상 승인
- 도메인 allowlist(예: github.com) + 폴더 allowlist(워크스페이스) 기본 적용
- `maxStepsPerRun`/예산 제한/timeout/kill switch를 강제
- hallucination/drift 방지: “목표 문장”을 매 스텝에 포함 + 스텝 단위 re‑plan

Acceptance:
- “PR 목록 확인 → 특정 PR 열기 → CI 실패 원인 요약”을 컴퓨터 제어로 수행하고 evidence를 남긴다.
- 승인 없이 high‑risk 액션이 실행된 사례 0건.

### M4-B — “OpenClaw 기반 실행 엔진 파일럿” (옵션, 1~2주)
목표: Computer‑Use를 직접 구현하기 전에 OpenClaw를 붙여 **24/7 백그라운드 에이전트**를 빠르게 가동한다.

범위:
- Snailer: CEO Auto‑Cycle + 승인 + Evidence UI
- OpenClaw: 터미널/파일/브라우저 자동화(코드 수정, 테스트, PR 생성까지 가능)

Acceptance:
- OpenClaw가 생성한 산출물(변경 파일/로그/스크린샷)을 Snailer Evidence로 가져와서 “CEO가 보고 판단” 가능한 상태가 된다.
- OpenClaw write 동작(커밋/푸시/PR 생성)은 Snailer 승인 없이는 실행되지 않는다(정책으로 강제).

---

## 8) Success Metrics (현실적 지표)
- Human intervention rate: **< 20% (v1)** → **< 5% (v2)**
- Cycle fail rate(사이클 실패/중단 비율): **< 10%**
- Drift rate(이전 목표/브로드캐스트 무시/탈선): **< 10%** (5.3 Drift Guard로 관리)
- Evidence completeness: 사이클당 필수 evidence 누락 **0건**
- Parallel utilization: `swe-2`/`swe-3` 동시 작업이 전체 사이클의 **≥ 50%**에서 발생(데모 기준)

## 9) 오픈 질문(결정 필요)
1) CEO Auto‑Cycle의 기본 주기(5/15/30/60분) MVP 기본값은?
2) CEO가 “Plan Tree를 강제 생성/업데이트”할지, “Broadcast만” 할지?
3) external_data 판별은 (a) 키워드 규칙 (b) LLM self‑report (c) 둘 다 중 무엇으로 시작?
4) `gh` 온보딩을 앱 내에서 가이드할지(체크리스트/상태 표시), 아니면 “사전 설치/로그인 완료”를 요구할지?
5) M4(Computer‑Use 파일럿)를 “바로 착수”할지, 아니면 기본 루프(M0~M3) 안정화 이후로 미룰지?
6) Track B(OpenClaw)로 MVP를 가속할 경우, Snailer↔OpenClaw 연결을 무엇으로 시작할지? (a) evidence 폴더 ingest (b) 로컬 API (c) 텔레그램 채널 브리지
