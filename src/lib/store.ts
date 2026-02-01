import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { PromptStage, UiEventEnvelope } from './daemon'
import { DaemonClient } from './daemon'
import {
  applyElonPromptPrefixWithFrame,
  ensureElonModeItem,
  isUiModeToken,
  uiModeToDaemonMode,
  type ElonFrame,
  type UiModeToken,
} from './modes'
import type { PlanTree, PlanNode } from './elonPlan'
import type { Evidence } from './elonEvidence'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  runId?: string
  attachments?: Array<{ path: string; name: string }>
  stream?: string
  isStreaming?: boolean
}

export interface SessionView {
  id: string
  name: string
  updatedAt: number
  projectPath?: string
  activityCount?: number
  diffCount?: number
  messages: ChatMessage[]
  agentEvents: AgentEvent[]
}

export interface ModifiedFile {
  path: string
  added: number
  removed: number
  patch: string
  status: string
  preview?: string[]
}

export interface BashCommand {
  commandId: string
  command: string
  cwd: string
  exitCode: number
  timestamp: string
  duration: number
  output: string
}

export interface AttachedImage {
  id: string
  path: string
  name: string
  previewUrl?: string
}

export interface PendingApproval {
  approvalId: string
  runId: string
  sessionId?: string | null
  kind: 'apply_changes' | 'loop_guard'
  prompt: string
  deadlineMs: number
  diffs: ModifiedFile[]
}

// Agent event types for structured logging
export type AgentEventType =
  | 'Start'
  | 'Done'
  | 'Fail'
  | 'StatusLine'
  | 'FileOp'
  | 'ApprovalRequested'
  | 'RunStatusChanged'
  | 'LoopGuardTriggered'

export interface AgentEvent {
  id: string
  type: AgentEventType
  timestamp: number
  runId?: string
  // Start/Done/Fail
  phase?: string
  message?: string
  // StatusLine
  line?: string
  // FileOp
  op?: string // 'read' | 'edit' | 'create' | 'search' | 'bash'
  path?: string
  linesRead?: number
  linesAdded?: number
  linesRemoved?: number
  preview?: string[]
  note?: string
  // LoopGuard
  loopId?: string
  iteration?: number
  pattern?: string
}

// Clarifying question types
export interface ClarifyingOption {
  id: string
  label: string
  description?: string
}

export interface ClarifyingQuestion {
  id: string
  question: string
  options: ClarifyingOption[]
  allowMultiple?: boolean
  allowCustom?: boolean
}

// ==================== Orchestrator Types ====================

export type TeamRole =
  | 'Oracle'
  | 'Explorer'
  | 'Librarian'
  | 'FrontendEngineer'
  | 'BackendEngineer'
  | 'Debugger'
  | 'Tester'

export type AgentStatus = 'idle' | 'queued' | 'running' | 'review' | 'done' | 'failed'

export interface AgentCardState {
  role: TeamRole
  model: string
  status: AgentStatus
  current: string // Current activity description
  progress?: number // Percentage 0-100
  inputTokens: number
  outputTokens: number
  cost: number
  startedAt?: number // Timestamp when started
  elapsedMs?: number // Elapsed time in ms
}

export interface ContextBudget {
  inputTokens: number
  outputTokens: number
  totalCost: number
  inputLimit: number
  outputLimit: number
  costLimit: number
  windowUsedTokens: number
  windowMaxTokens: number
  tokensSaved: number
}

export interface VerifyStatus {
  lint: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  build: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  test: 'idle' | 'running' | 'passed' | 'failed' | 'skipped'
  lintDuration?: number
  buildDuration?: number
  testDuration?: number
  lintOutput?: string
  buildOutput?: string
  testOutput?: string
}

type VerifyStepKey = 'lint' | 'build' | 'test'

export interface OrchestratorContract {
  projectType: string
  entrypoints: string[]
  mustEdit: string[]
  forbiddenTargets: string[]
  allowedGlobs: string[]
  buildCmd?: string
  testCmd?: string
  definitionOfDone: string[]
}

export interface MCPServerState {
  name: string
  version: string
  connected: boolean
}

export interface LSPClientState {
  name: string
  language: string
  active: boolean
}

export interface InjectedSkill {
  id: string
  name: string
  version: string
  triggerType: string
}

export interface SkillsState {
  projectType: string
  skills: InjectedSkill[]
}

export interface DynamicAgentState {
  agentId: string
  agentType: string
  status: string
  reason?: string
  durationSecs?: number
}

export interface OrchestratorTask {
  id: string
  title: string
  status: 'queued' | 'running' | 'needs_review' | 'verified' | 'merged' | 'failed' | 'cancelled'
  assignedTo?: TeamRole
  progress?: number
}

export interface OrchestratorState {
  active: boolean
  preset: string
  maxParallel: number
  agents: Partial<Record<TeamRole, AgentCardState>>
  contextBudget: ContextBudget
  verifyStatus: VerifyStatus
  contractStatus?: string
  contract?: OrchestratorContract
  mcpServers: MCPServerState[]
  lspClients: LSPClientState[]
  skills?: SkillsState
  dynamicAgents: DynamicAgentState[]
  tasks: OrchestratorTask[]
}

// ==================== End Orchestrator Types ====================

// ==================== ElonX HARD Types ====================

export type ElonAgentStatus = 'idle' | 'observing' | 'planning' | 'acting' | 'evaluating' | 'blocked'

export interface ElonAgentState {
  id: string
  status: ElonAgentStatus
  currentTask?: string
  lastOutput?: string
  startedAt?: number
}

export interface ElonMetrics {
  cycleStartMs: number
  autonomyRate: number // 0-100
  completedTasks: number
  totalTasks: number
  estimatedCost: number
  interventions: number // Human interventions count
}

export interface ElonApprovalRequest {
  id: string
  agentId: string
  action: string
  riskLevel: 'low' | 'medium' | 'high'
  evidence: string[]
  deadlineMs: number
}

export interface ElonXState {
  // Plan Tree
  planTree: PlanTree | null
  selectedNodeId: string | null

  // Agent statuses
  agentStatuses: Record<string, ElonAgentState>

  // Evidence
  evidences: Evidence[]
  selectedEvidenceId: string | null
  evidenceFilter: 'all' | 'pass' | 'fail' | 'warning'

  // Metrics
  metrics: ElonMetrics

  // Approval requests
  elonApprovals: ElonApprovalRequest[]

  // CEO Auto-Cycle (M0)
  autoCycle: AutoCycleState
  broadcasts: Broadcast[]
  cycleRuns: CycleRun[]

  // GitHub Integration (M2)
  githubStatus: GitHubReadStatus
}

// ==================== CEO Auto-Cycle Types ====================

export type AutoCycleStatus = 'idle' | 'running' | 'paused' | 'cooldown'
export type AutoCycleInterval = 300000 | 900000 | 1800000 | 3600000 // 5/15/30/60 min

export interface AutoCycleState {
  enabled: boolean
  intervalMs: AutoCycleInterval
  nextRunAt: number | null
  lastRunAt: number | null
  status: AutoCycleStatus
  consecutiveFailures: number // Drift Guard: 3회 연속 실패 시 auto-pause
}

export interface Broadcast {
  id: string
  cycleRunId: string
  toAgentIds: string[] // e.g., ['pm', 'swe-2', 'swe-3']
  message: string // 1-3줄
  why: string // leverage/병목/리스크 근거
  evidenceLinks: string[]
  expiresAt: number
  createdAt: number
  status: 'active' | 'expired' | 'superseded'
}

export type LeverageRisk = 'low' | 'medium' | 'high'

export interface TopLeverageItem {
  title: string
  assignee: string // pm | swe-2 | swe-3
  why: string
  risk: LeverageRisk
  evidenceIds: string[]
  acceptance: string[]
}

export interface CeoLlmOutput {
  cycleSummary: string
  topLeverage: TopLeverageItem[]
  broadcasts: Array<{ to: string; message: string; expiresMins: number }>
  needsExternalData: boolean
}

export type CycleRunStatus = 'running' | 'completed' | 'failed' | 'aborted'

export interface CycleRun {
  id: string
  startedAt: number
  endedAt: number | null
  status: CycleRunStatus
  evidenceIds: string[]
  broadcastIds: string[]
  llmOutput: CeoLlmOutput | null
  errorMessage: string | null
}

export interface GitHubReadStatus {
  installed: boolean
  authenticated: boolean
  lastFetchedAt: number | null
  prCount: number
  issueCount: number
  ciStatus: 'pass' | 'fail' | 'pending' | 'unknown'
  summary: string | null
}

// ==================== End CEO Auto-Cycle Types ====================

// ==================== End ElonX HARD Types ====================

export type RunStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'awaiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled'

type ConnectionStatus = 'disconnected' | 'starting' | 'connecting' | 'connected' | 'error'

interface AppState {
  // Engine + daemon
  connectionStatus: ConnectionStatus
  error: string | null
  daemon: DaemonClient | null
  daemonUrl: string | null
  daemonToken: string | null

  // Workspace + settings
  projectPath: string
  projectPathDraft: string
  model: string
  mode: string
  lastStandardMode: 'classic' | 'team-orchestrator'
  workMode: 'plan' | 'build' | 'review'
  prMode: boolean
  autoApprove: boolean
  mdapK: number
  teamConfigName: string
  elonFrame: { collapsed: boolean; problem: string; constraints: string; verification: string }

  // UI data
  slashItems: Array<{ cmd: string; desc: string }>
  modeItems: Array<{ label: string; token: string }>
  modelItems: Array<{ label: string; token: string; desc: string }>

  sessions: SessionView[]
  activeSessionId: string | null

  // NOTE: `code` is kept for backward-compat with older persisted state.
  // It is now treated the same as `settings`.
  viewMode: 'chat' | 'settings' | 'code'

  currentRunId: string | null
  currentRunStatus: RunStatus

  modifiedFilesByPath: Record<string, ModifiedFile>
  bashCommands: BashCommand[]
  pendingApprovals: PendingApproval[]
  clarifyingQuestions: ClarifyingQuestion[]
  promptStageWizard: { originalPrompt: string; stages: PromptStage[] } | null

  // Orchestrator state
  orchestrator: OrchestratorState

  // ElonX HARD state
  elonX: ElonXState

  lastToast: { title: string; message: string } | null
  draftPrompt: string
  attachedImages: AttachedImage[]

  // Actions
  connect: () => Promise<void>
  setProjectPath: (path: string) => Promise<void>
  setProjectPathDraft: (path: string) => void
  refreshSessions: () => Promise<void>
  createSession: (name?: string) => Promise<string>
  deleteSession: (sessionId: string) => Promise<void>
  selectSession: (sessionId: string) => void
  setViewMode: (mode: 'chat' | 'settings') => void
  setUiMode: (mode: string) => Promise<void>
  setElonFrame: (patch: Partial<ElonFrame> & { collapsed?: boolean }) => void
  clearElonFrame: () => void
  sendPrompt: (prompt: string) => Promise<void>
  cancelRun: () => Promise<void>

  approve: (approvalId: string, decision: PendingApprovalDecision, feedback?: string) => Promise<void>
  answerClarifyingQuestion: (questionId: string, selectedIds: string[], customText?: string) => Promise<void>
  cancelPromptStageWizard: () => void
  completePromptStageWizard: (details: Array<string | null>) => Promise<void>
  setDraftPrompt: (value: string) => void
  appendToDraftPrompt: (value: string) => void
  addAttachedImage: (img: AttachedImage) => void
  removeAttachedImage: (id: string) => void
  clearAttachedImages: () => void
  clearError: () => void

  // ElonX HARD actions
  elonExecuteGoal: () => Promise<void>
  elonPauseExecution: () => void
  elonResumeExecution: () => void
  elonAbortExecution: () => void
  elonSelectNode: (nodeId: string | null) => void
  elonRetryNode: (nodeId: string) => void
  elonSkipNode: (nodeId: string) => void
  elonSelectEvidence: (evidenceId: string | null) => void
  elonSetEvidenceFilter: (filter: 'all' | 'pass' | 'fail' | 'warning') => void
  elonApproveAction: (approvalId: string) => void
  elonRejectAction: (approvalId: string, reason?: string) => void
  elonUpdateAgentStatus: (agentId: string, status: ElonAgentStatus, task?: string) => void
  elonAddEvidence: (evidence: Evidence) => void
  elonUpdatePlanNode: (nodeId: string, patch: Partial<PlanNode>) => void

  // CEO Auto-Cycle actions (M0)
  autoCycleToggle: (enabled: boolean) => void
  autoCycleSetInterval: (intervalMs: AutoCycleInterval) => void
  autoCycleRunNow: () => Promise<void>
  autoCycleKillSwitch: () => void
  autoCycleTick: () => void
  autoCycleExpireBroadcasts: () => void
}

type PendingApprovalDecision =
  | 'approve_once'
  | 'approve_always'
  | 'request_change'
  | 'reject'
  | 'cancel'

function now() {
  return Date.now()
}

function upsertSession(existing: SessionView[], next: Omit<SessionView, 'messages' | 'agentEvents'>): SessionView[] {
  const idx = existing.findIndex((s) => s.id === next.id)
  if (idx === -1) return [{ ...next, messages: [], agentEvents: [] }, ...existing]
  const cur = existing[idx]
  // Ensure agentEvents exists for migration from old data
  const updated = { ...cur, ...next, agentEvents: cur.agentEvents ?? [] }
  return [updated, ...existing.filter((s) => s.id !== next.id)]
}

function appendMessage(existing: SessionView[], sessionId: string, msg: ChatMessage): SessionView[] {
  return existing.map((s) =>
    s.id === sessionId ? { ...s, messages: [...s.messages, msg], updatedAt: now() } : s,
  )
}

function updateStreamingMessage(
  existing: SessionView[],
  sessionId: string,
  messageId: string,
  patch: Partial<ChatMessage>,
): SessionView[] {
  return existing.map((s) => {
    if (s.id !== sessionId) return s
    return {
      ...s,
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, ...patch } : m)),
      updatedAt: now(),
    }
  })
}

function updateMessage(existing: SessionView[], sessionId: string, messageId: string, patch: Partial<ChatMessage>): SessionView[] {
  return updateStreamingMessage(existing, sessionId, messageId, patch)
}

function appendAgentEvent(existing: SessionView[], sessionId: string, event: AgentEvent): SessionView[] {
  return existing.map((s) =>
    s.id === sessionId ? { ...s, agentEvents: [...s.agentEvents, event], updatedAt: now() } : s,
  )
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      connectionStatus: 'disconnected',
      error: null,
      daemon: null,
      daemonUrl: null,
      daemonToken: null,

      projectPath: '',
      projectPathDraft: '',
      model: 'minimax-m2',
      mode: 'classic',
      lastStandardMode: 'classic',
      workMode: 'build',
      prMode: false,
      autoApprove: false,
      mdapK: 3,
      teamConfigName: 'ShipFast',
      elonFrame: { collapsed: false, problem: '', constraints: '', verification: '' },

      slashItems: [],
      modeItems: [],
      modelItems: [],

      sessions: [],
      activeSessionId: null,
      viewMode: 'chat',

      currentRunId: null,
      currentRunStatus: 'idle',

      modifiedFilesByPath: {},
      bashCommands: [],
      pendingApprovals: [],
      clarifyingQuestions: [],
      promptStageWizard: null,

      orchestrator: {
        active: false,
        preset: 'ShipFast',
        maxParallel: 3,
        agents: {},
        contextBudget: {
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0,
          inputLimit: 1000000,
          outputLimit: 100000,
          costLimit: 10,
          windowUsedTokens: 0,
          windowMaxTokens: 200000,
          tokensSaved: 0,
        },
        verifyStatus: {
          lint: 'idle',
          build: 'idle',
          test: 'idle',
        },
        contractStatus: undefined,
        mcpServers: [],
        lspClients: [],
        skills: undefined,
        dynamicAgents: [],
        tasks: [],
      },

      elonX: {
        planTree: null,
        selectedNodeId: null,
        agentStatuses: {},
        evidences: [],
        selectedEvidenceId: null,
        evidenceFilter: 'all',
        metrics: {
          cycleStartMs: 0,
          autonomyRate: 100,
          completedTasks: 0,
          totalTasks: 0,
          estimatedCost: 0,
          interventions: 0,
        },
        elonApprovals: [],
        // CEO Auto-Cycle (M0)
        autoCycle: {
          enabled: false,
          intervalMs: 1800000, // 30분 기본값
          nextRunAt: null,
          lastRunAt: null,
          status: 'idle',
          consecutiveFailures: 0,
        },
        broadcasts: [],
        cycleRuns: [],
        // GitHub Integration (M2)
        githubStatus: {
          installed: false,
          authenticated: false,
          lastFetchedAt: null,
          prCount: 0,
          issueCount: 0,
          ciStatus: 'unknown',
          summary: null,
        },
      },

      lastToast: null,
      draftPrompt: '',
      attachedImages: [],

      connect: async () => {
        if (get().connectionStatus === 'connected') return
        set({ connectionStatus: 'starting', error: null })
        let started: { url: string; token: string; default_project_path: string }
        try {
          started = (await invoke('engine_start')) as {
            url: string
            token: string
            default_project_path: string
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          const clipped = msg.length > 800 ? `${msg.slice(0, 800)}…` : msg
          set({
            connectionStatus: 'error',
            error: msg,
            lastToast: {
              title: 'Snailer 실행 실패',
              message: clipped,
            },
          })
          return
        }

        const persistedProject = get().projectPath?.trim()
        const projectPath = persistedProject || started.default_project_path

        set({
          daemonUrl: started.url,
          daemonToken: started.token,
          projectPath,
          projectPathDraft: projectPath,
          connectionStatus: 'connecting',
        })

        const client = new DaemonClient({ url: started.url })
        client.onStatus((s) => {
          const mapped: ConnectionStatus =
            s === 'connected'
              ? 'connected'
              : s === 'connecting'
                ? 'connecting'
                : s === 'error'
                  ? 'error'
                  : 'disconnected'
          set({ connectionStatus: mapped })
        })

        client.onNotification((method, params) => {
          const state = get()
          if (method === 'run.status') {
            const p = params as { runId: string; status: string; message?: string | null }
            if (p.runId && p.runId === state.currentRunId) {
              if (p.status === 'completed' || p.status === 'failed' || p.status === 'cancelled') {
                const sid = state.activeSessionId
                if (sid) {
                  const session = state.sessions.find((s) => s.id === sid)
                  const last = session?.messages[session.messages.length - 1]
                  if (last?.isStreaming && last.role === 'assistant' && last.runId === p.runId) {
                    set({
                      sessions: updateStreamingMessage(state.sessions, sid, last.id, { isStreaming: false }),
                    })
                  }
                }
              }
              set({
                currentRunStatus: p.status as RunStatus,
                error: p.status === 'failed' ? p.message ?? 'run failed' : state.error,
              })
            }
            return
          }

          if (method === 'ui.event') {
            const env = (params as UiEventEnvelope) ?? null
            if (!env?.event?.type) return
            handleUiEvent(env)
            return
          }

          if (method === 'approval.requested') {
            const p = params as PendingApproval
            set((st) => ({ pendingApprovals: [p, ...st.pendingApprovals] }))
            set({ currentRunStatus: 'awaiting_approval' })
            return
          }

          if (method === 'clarifying.question') {
            const p = params as Record<string, unknown>
            const question: ClarifyingQuestion = {
              id: String(p.id ?? crypto.randomUUID()),
              question: String(p.question ?? ''),
              options: (p.options as Array<{ id: string; label: string; description?: string }>) || [],
              allowMultiple: Boolean(p.allowMultiple),
              allowCustom: p.allowCustom !== false,
            }
            set((st) => ({ clarifyingQuestions: [...st.clarifyingQuestions, question] }))
            return
          }

          if (method === 'agent.event') {
            const p = params as Record<string, unknown>
            const eventType = String(p.type ?? '')
            if (!eventType) return

            const activeSessionId = state.activeSessionId
            if (!activeSessionId) return

            const explicitRunId = String(p.runId ?? '').trim()
            const agentEvent: AgentEvent = {
              id: crypto.randomUUID(),
              type: eventType as AgentEventType,
              timestamp: Date.now(),
              runId: explicitRunId || state.currentRunId || undefined,
              phase: p.phase as string | undefined,
              message: p.message as string | undefined,
              line: p.line as string | undefined,
              op: p.op as string | undefined,
              path: p.path as string | undefined,
              linesRead: p.linesRead as number | undefined,
              linesAdded: p.linesAdded as number | undefined,
              linesRemoved: p.linesRemoved as number | undefined,
              preview: p.preview as string[] | undefined,
              note: p.note as string | undefined,
              loopId: p.loopId as string | undefined,
              iteration: p.iteration as number | undefined,
              pattern: p.pattern as string | undefined,
            }

            set((st) => ({ sessions: appendAgentEvent(st.sessions, activeSessionId, agentEvent) }))
            return
          }

          // ==================== Orchestrator Events ====================
          if (method === 'orchestrator.session_started') {
            const p = params as { preset: string; maxParallel: number }
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                active: true,
                preset: p.preset ?? 'ShipFast',
                maxParallel: p.maxParallel ?? 3,
                // NOTE: don't clear `agents` here; message ordering between
                // `orchestrator.*` notifications and `ui.event` can otherwise wipe
                // already-registered roles, leaving only 1 agent visible.
              },
            }))
            return
          }

          if (method === 'orchestrator.agent_registered') {
            const p = params as { role: TeamRole; model: string }
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                agents: {
                  ...st.orchestrator.agents,
                  [p.role]: {
                    role: p.role,
                    model: p.model,
                    status: 'idle',
                    current: '',
                    inputTokens: 0,
                    outputTokens: 0,
                    cost: 0,
                  },
                },
              },
            }))
            return
          }

          if (method === 'orchestrator.agent_status') {
            const p = params as { role: TeamRole; status: AgentStatus; current?: string; progress?: number }
            set((st) => {
              const existing = st.orchestrator.agents[p.role]
              if (!existing) return st
              return {
                orchestrator: {
                  ...st.orchestrator,
                  agents: {
                    ...st.orchestrator.agents,
                    [p.role]: {
                      ...existing,
                      status: p.status,
                      current: p.current ?? existing.current,
                      progress: p.progress,
                      startedAt: p.status === 'running' && existing.status !== 'running' ? Date.now() : existing.startedAt,
                    },
                  },
                },
              }
            })
            return
          }

          if (method === 'orchestrator.token_usage') {
            const p = params as { role: TeamRole; inputTokens: number; outputTokens: number; cost: number; tokensSaved?: number }
            set((st) => {
              const existing = st.orchestrator.agents[p.role]
              return {
                orchestrator: {
                  ...st.orchestrator,
                  agents: existing
                    ? {
                        ...st.orchestrator.agents,
                        [p.role]: {
                          ...existing,
                          inputTokens: p.inputTokens,
                          outputTokens: p.outputTokens,
                          cost: p.cost,
                        },
                      }
                    : st.orchestrator.agents,
                  contextBudget: {
                    ...st.orchestrator.contextBudget,
                    inputTokens: st.orchestrator.contextBudget.inputTokens + (p.inputTokens - (existing?.inputTokens ?? 0)),
                    outputTokens: st.orchestrator.contextBudget.outputTokens + (p.outputTokens - (existing?.outputTokens ?? 0)),
                    totalCost: st.orchestrator.contextBudget.totalCost + (p.cost - (existing?.cost ?? 0)),
                    tokensSaved: st.orchestrator.contextBudget.tokensSaved + (p.tokensSaved ?? 0),
                  },
                },
              }
            })
            return
          }

          if (method === 'orchestrator.verify_status') {
            const p = params as Partial<VerifyStatus>
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                verifyStatus: { ...st.orchestrator.verifyStatus, ...p },
              },
            }))
            return
          }

          if (method === 'orchestrator.contract_changed') {
            const p = params as Record<string, unknown>
            const contract: OrchestratorContract = {
              projectType: String(p.projectType ?? ''),
              entrypoints: Array.isArray(p.entrypoints) ? (p.entrypoints as string[]) : [],
              mustEdit: Array.isArray(p.mustEdit) ? (p.mustEdit as string[]) : [],
              forbiddenTargets: Array.isArray(p.forbiddenTargets) ? (p.forbiddenTargets as string[]) : [],
              allowedGlobs: Array.isArray(p.allowedGlobs) ? (p.allowedGlobs as string[]) : [],
              buildCmd: typeof p.buildCmd === 'string' ? (p.buildCmd as string) : undefined,
              testCmd: typeof p.testCmd === 'string' ? (p.testCmd as string) : undefined,
              definitionOfDone: Array.isArray(p.definitionOfDone) ? (p.definitionOfDone as string[]) : [],
            }
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                contract: contract,
              },
            }))
            return
          }

          if (method === 'orchestrator.task_status') {
            const p = params as { taskId: string; title: string; status: string; assignedTo?: string; progress?: number }
            const task: OrchestratorTask = {
              id: p.taskId,
              title: p.title,
              status: p.status as OrchestratorTask['status'],
              assignedTo: p.assignedTo as TeamRole | undefined,
              progress: p.progress,
            }
            set((st) => {
              const existingIdx = st.orchestrator.tasks.findIndex((t) => t.id === task.id)
              const tasks =
                existingIdx >= 0
                  ? st.orchestrator.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
                  : [...st.orchestrator.tasks, task]
              return {
                orchestrator: {
                  ...st.orchestrator,
                  tasks,
                },
              }
            })
            return
          }

          if (method === 'orchestrator.session_ended') {
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                active: false,
              },
            }))
            return
          }
          // ==================== End Orchestrator Events ====================
        })

        const handleUiEvent = (env: UiEventEnvelope) => {
          const { event, runId } = env
          const activeSessionId = get().activeSessionId
          if (!activeSessionId) return

          const normalizeRole = (v: unknown): TeamRole | null => {
            const s = String(v ?? '').trim()
            if (!s) return null
            return s as TeamRole
          }

          const normalizeVerifyStep = (v: unknown): VerifyStepKey | null => {
            const s = String(v ?? '').toLowerCase().trim()
            if (s === 'lint') return 'lint'
            if (s === 'build') return 'build'
            if (s === 'test') return 'test'
            return null
          }

          const normalizeVerifyStatus = (v: unknown): VerifyStatus['lint'] => {
            const s = String(v ?? '').toLowerCase().trim()
            if (s === 'running') return 'running'
            if (s === 'passed') return 'passed'
            if (s === 'failed') return 'failed'
            if (s === 'skipped') return 'skipped'
            // timeout → failed for UI purposes
            if (s === 'timeout') return 'failed'
            return 'idle'
          }

          const upsertMcpServer = (servers: MCPServerState[], next: MCPServerState) => {
            const idx = servers.findIndex((s) => s.name === next.name)
            if (idx < 0) return [...servers, next]
            return servers.map((s, i) => (i === idx ? { ...s, ...next } : s))
          }

          const upsertLspClient = (clients: LSPClientState[], next: LSPClientState) => {
            const idx = clients.findIndex((c) => c.name === next.name && c.language === next.language)
            if (idx < 0) return [...clients, next]
            return clients.map((c, i) => (i === idx ? { ...c, ...next } : c))
          }

          if (event.type === 'TaskTitleChanged') {
            const title = String(event.data.title ?? '').trim()
            if (!title) return
            set((st) => ({
              sessions: st.sessions.map((s) => (s.id === activeSessionId ? { ...s, name: title } : s)),
            }))
            return
          }

          if (event.type === 'SessionStarted') {
            const preset = String(event.data.preset ?? 'ShipFast')
            const maxParallel = Number(event.data.maxParallel ?? 3)
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                active: true,
                preset,
                maxParallel,
                // Don't clear `agents` here for the same reason as above.
              },
            }))
            return
          }

          if (event.type === 'SessionEnded') {
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                active: false,
              },
            }))
            return
          }

          if (event.type === 'AgentRegistered') {
            const role = normalizeRole(event.data.role)
            if (!role) return
            const model = String(event.data.model ?? '')
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                agents: {
                  ...st.orchestrator.agents,
                  [role]: {
                    role,
                    model,
                    status: 'idle',
                    current: '',
                    inputTokens: 0,
                    outputTokens: 0,
                    cost: 0,
                  },
                },
              },
            }))
            return
          }

          if (event.type === 'TaskStatusChanged') {
            const id = String(event.data.taskId ?? '').trim()
            const title = String(event.data.title ?? '').trim()
            const role = normalizeRole(event.data.role)
            const rawStatus = String(event.data.status ?? '').trim()
            if (!id) return
            const statusMap: Record<string, OrchestratorTask['status']> = {
              Queued: 'queued',
              Running: 'running',
              NeedsReview: 'needs_review',
              Completed: 'verified',
              Failed: 'failed',
            }
            const status = statusMap[rawStatus] ?? 'queued'
            const task: OrchestratorTask = {
              id,
              title: title || id,
              status,
              assignedTo: role ?? undefined,
            }
            set((st) => {
              const existingIdx = st.orchestrator.tasks.findIndex((t) => t.id === task.id)
              const tasks =
                existingIdx >= 0
                  ? st.orchestrator.tasks.map((t) => (t.id === task.id ? { ...t, ...task } : t))
                  : [...st.orchestrator.tasks, task]
              return { orchestrator: { ...st.orchestrator, tasks } }
            })
            return
          }

          if (event.type === 'TokenUsageUpdated') {
            const role = normalizeRole(event.data.role)
            if (!role) return
            const inputTokens = Number(event.data.inputTokens ?? 0)
            const outputTokens = Number(event.data.outputTokens ?? 0)
            const cost = Number(event.data.cost ?? 0)
            const tokensSaved = Number(event.data.tokensSaved ?? 0)
            set((st) => {
              const existing = st.orchestrator.agents[role]
              const existingInput = existing?.inputTokens ?? 0
              const existingOutput = existing?.outputTokens ?? 0
              const existingCost = existing?.cost ?? 0
              return {
                orchestrator: {
                  ...st.orchestrator,
                  agents: {
                    ...st.orchestrator.agents,
                    [role]: {
                      role,
                      model: existing?.model ?? '',
                      status: existing?.status ?? 'idle',
                      current: existing?.current ?? '',
                      progress: existing?.progress,
                      startedAt: existing?.startedAt,
                      inputTokens,
                      outputTokens,
                      cost,
                    },
                  },
                  contextBudget: {
                    ...st.orchestrator.contextBudget,
                    inputTokens: st.orchestrator.contextBudget.inputTokens + (inputTokens - existingInput),
                    outputTokens: st.orchestrator.contextBudget.outputTokens + (outputTokens - existingOutput),
                    totalCost: st.orchestrator.contextBudget.totalCost + (cost - existingCost),
                    tokensSaved: st.orchestrator.contextBudget.tokensSaved + tokensSaved,
                  },
                },
              }
            })
            return
          }

          if (event.type === 'ContextWindowUpdated') {
            const usedTokens = Number(event.data.usedTokens ?? 0)
            const maxTokens = Number(event.data.maxTokens ?? 0)
            if (!maxTokens) return
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                contextBudget: {
                  ...st.orchestrator.contextBudget,
                  windowUsedTokens: usedTokens,
                  windowMaxTokens: maxTokens,
                },
              },
            }))
            return
          }

          if (event.type === 'VerifyJobStarted') {
            const step = normalizeVerifyStep(event.data.step)
            if (!step) return
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                verifyStatus: {
                  ...st.orchestrator.verifyStatus,
                  [step]: 'running',
                },
              },
            }))
            return
          }

          if (event.type === 'VerifyJobFinished' || event.type === 'VerifyStepCompleted') {
            const step = normalizeVerifyStep(event.data.step)
            if (!step) return
            const status = normalizeVerifyStatus(event.data.status)
            const durationSecs = Number(event.data.durationSecs ?? 0)
            const lastLine = String(event.data.lastLine ?? '').trim()
            const tail = Array.isArray(event.data.tail) ? (event.data.tail as string[]) : []
            const output = tail.length > 0 ? tail.join('\n') : lastLine

            set((st) => {
              const next: VerifyStatus = { ...st.orchestrator.verifyStatus, [step]: status }
              const durationMs = durationSecs ? durationSecs * 1000 : undefined
              if (step === 'lint') {
                next.lintDuration = durationMs ?? next.lintDuration
                if (output) next.lintOutput = output
              }
              if (step === 'build') {
                next.buildDuration = durationMs ?? next.buildDuration
                if (output) next.buildOutput = output
              }
              if (step === 'test') {
                next.testDuration = durationMs ?? next.testDuration
                if (output) next.testOutput = output
              }
              return {
                orchestrator: {
                  ...st.orchestrator,
                  verifyStatus: next,
                },
              }
            })
            return
          }

          if (event.type === 'ContractChanged') {
            const status = String(event.data.status ?? '').trim()
            const projectType = String(event.data.projectType ?? '').trim()
            const entrypoints = (event.data.entrypoints as string[]) ?? []
            const mustEdit = (event.data.mustEdit as string[]) ?? []
            const forbiddenTargets = (event.data.forbiddenTargets as string[]) ?? []
            const allowedGlobs = (event.data.allowedGlobs as string[]) ?? []
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                contractStatus: status || st.orchestrator.contractStatus,
                contract: {
                  projectType: projectType || st.orchestrator.contract?.projectType || '',
                  entrypoints,
                  mustEdit,
                  forbiddenTargets,
                  allowedGlobs,
                  definitionOfDone: st.orchestrator.contract?.definitionOfDone ?? [],
                },
              },
            }))
            return
          }

          if (event.type === 'MCPServerChanged') {
            const serversRaw = Array.isArray(event.data.servers) ? (event.data.servers as Array<Record<string, unknown>>) : []
            if (serversRaw.length === 0) return
            set((st) => {
              let next = st.orchestrator.mcpServers
              for (const srv of serversRaw) {
                const name = String(srv.name ?? '').trim()
                if (!name) continue
                next = upsertMcpServer(next, {
                  name,
                  version: String(srv.version ?? ''),
                  connected: Boolean(srv.connected),
                })
              }
              return { orchestrator: { ...st.orchestrator, mcpServers: next } }
            })
            return
          }

          if (event.type === 'LSPClientChanged') {
            const clientsRaw = Array.isArray(event.data.clients) ? (event.data.clients as Array<Record<string, unknown>>) : []
            if (clientsRaw.length === 0) return
            set((st) => {
              let next = st.orchestrator.lspClients
              for (const cli of clientsRaw) {
                const name = String(cli.name ?? '').trim()
                const language = String(cli.language ?? '').trim()
                if (!name || !language) continue
                next = upsertLspClient(next, {
                  name,
                  language,
                  active: Boolean(cli.active),
                })
              }
              return { orchestrator: { ...st.orchestrator, lspClients: next } }
            })
            return
          }

          if (event.type === 'SkillsInjected') {
            const projectType = String(event.data.projectType ?? '').trim()
            const skillsRaw = Array.isArray(event.data.skills) ? (event.data.skills as Array<Record<string, unknown>>) : []
            const skills: InjectedSkill[] = skillsRaw
              .map((s) => ({
                id: String(s.id ?? '').trim(),
                name: String(s.name ?? '').trim(),
                version: String(s.version ?? '').trim(),
                triggerType: String(s.triggerType ?? '').trim(),
              }))
              .filter((s) => Boolean(s.id || s.name))
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                skills: { projectType, skills },
              },
            }))
            return
          }

          if (event.type === 'DynamicAgentHired') {
            const agentId = String(event.data.agentId ?? '').trim()
            if (!agentId) return
            const agentType = String(event.data.agentType ?? '').trim()
            const reason = String(event.data.reason ?? '').trim()
            set((st) => {
              const existingIdx = st.orchestrator.dynamicAgents.findIndex((a) => a.agentId === agentId)
              const next: DynamicAgentState = { agentId, agentType, status: 'hired', reason }
              const dynamicAgents =
                existingIdx >= 0
                  ? st.orchestrator.dynamicAgents.map((a) => (a.agentId === agentId ? { ...a, ...next } : a))
                  : [...st.orchestrator.dynamicAgents, next]
              return { orchestrator: { ...st.orchestrator, dynamicAgents } }
            })
            return
          }

          if (event.type === 'DynamicAgentStatusChanged') {
            const agentId = String(event.data.agentId ?? '').trim()
            if (!agentId) return
            const status = String(event.data.status ?? '').trim()
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                dynamicAgents: st.orchestrator.dynamicAgents.map((a) => (a.agentId === agentId ? { ...a, status } : a)),
              },
            }))
            return
          }

          if (event.type === 'DynamicAgentFired') {
            const agentId = String(event.data.agentId ?? '').trim()
            if (!agentId) return
            const durationSecs = Number(event.data.durationSecs ?? 0)
            set((st) => ({
              orchestrator: {
                ...st.orchestrator,
                dynamicAgents: st.orchestrator.dynamicAgents.map((a) =>
                  a.agentId === agentId ? { ...a, status: 'fired', durationSecs } : a,
                ),
              },
            }))
            return
          }

          if (event.type === 'ExecutionModeSwitch') {
            const target = String(event.data.targetMode ?? event.data.mode ?? '').toLowerCase().trim()
            if (!target) return
            const nextMode =
              target.includes('classic') ? 'classic' : target.includes('orchestrator') ? 'team-orchestrator' : null
            if (!nextMode) return
            if (get().mode === 'elon') {
              set({ lastStandardMode: nextMode })
            } else {
              set({ mode: nextMode, lastStandardMode: nextMode })
            }
            return
          }

          if (event.type === 'OutputLine') {
            const stream = String(event.data.stream ?? 'main')
            const text = String(event.data.text ?? '')
            const state = get()

            // "main" stream -> assistant bubble streaming
            if (stream === 'main') {
              const session = state.sessions.find((s) => s.id === activeSessionId)
              const last = session?.messages[session.messages.length - 1]

              if (last && last.isStreaming && last.role === 'assistant' && last.runId === runId) {
                set({
                  sessions: updateStreamingMessage(state.sessions, activeSessionId, last.id, {
                    content: last.content + text + '\n',
                  }),
                })
              } else {
                const messageId = crypto.randomUUID()
                const msg: ChatMessage = {
                  id: messageId,
                  role: 'assistant',
                  content: text + '\n',
                  createdAt: now(),
                  runId,
                  isStreaming: true,
                }
                set({ sessions: appendMessage(state.sessions, activeSessionId, msg) })
              }
              return
            }

            // Non-main streams -> log as system message (compact)
            const msg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'system',
              content: `[${stream}] ${text}`,
              createdAt: now(),
              runId,
              stream,
            }
            set((st) => ({ sessions: appendMessage(st.sessions, activeSessionId, msg) }))
            return
          }

          if (event.type === 'ModifiedFileChanged') {
            const path = String(event.data.path ?? '')
            const patch = String(event.data.patch ?? '')
            const status = String(event.data.status ?? 'pending')
            const added = Number(event.data.added ?? 0)
            const removed = Number(event.data.removed ?? 0)
            const preview = Array.isArray(event.data.preview)
              ? (event.data.preview as string[])
              : undefined
            if (!path) return
            set((st) => ({
              modifiedFilesByPath: {
                ...st.modifiedFilesByPath,
                [path]: { path, added, removed, patch, status, preview },
              },
            }))
            return
          }

          if (event.type === 'BashCommandRecorded') {
            const commandId = String(event.data.commandId ?? '')
            if (!commandId) return
            const item: BashCommand = {
              commandId,
              command: String(event.data.command ?? ''),
              cwd: String(event.data.cwd ?? ''),
              exitCode: Number(event.data.exitCode ?? -1),
              timestamp: String(event.data.timestamp ?? ''),
              duration: Number(event.data.duration ?? 0),
              output: String(event.data.output ?? ''),
            }
            set((st) => ({
              bashCommands: [item, ...st.bashCommands].slice(0, 200),
            }))
            return
          }

          if (event.type === 'ToastShown') {
            set({
              lastToast: {
                title: String(event.data.title ?? 'Snailer'),
                message: String(event.data.message ?? ''),
              },
            })
            return
          }
        }

        try {
          await client.connect()
          await client.initialize({
            token: started.token,
            projectPath,
            model: get().model,
            mode: uiModeToDaemonMode((isUiModeToken(get().mode) ? (get().mode as UiModeToken) : 'classic') as UiModeToken),
          })

	          try {
	            const slash = await client.slashList()
            const modelItems = (() => {
              const items = [...slash.modelItems]
              if (!items.some((m) => m.token === 'kimi-k2.5')) {
                const kimiIdx = items.findIndex((m) => m.token.startsWith('kimi-'))
                const insertAt = kimiIdx >= 0 ? kimiIdx : items.length
                items.splice(insertAt, 0, { label: 'Kimi K2.5', token: 'kimi-k2.5', desc: '' })
              }
              return items
            })()
	            set({
	              slashItems: slash.slashItems,
	              modeItems: ensureElonModeItem(
                  slash.modeItems.filter((m) => {
	                  const label = String(m.label ?? '').toLowerCase()
	                  const token = String(m.token ?? '').toLowerCase()
	                  if (token === 'snailer-doctor' || token === 'snailer-plato' || token === 'plato') return false
	                  if (label.startsWith('snailer plato')) return false
	                  return true
                  }),
                ),
	              modelItems,
	            })
	          } catch (e) {
            // Backward-compat: older daemon may not implement slash.list.
            const msg = e instanceof Error ? e.message : String(e)
            if (msg.toLowerCase().includes('method not found')) {
              set({
	                slashItems: [],
	                modeItems: ensureElonModeItem([
	                  { label: 'Classic', token: 'classic' },
	                  { label: 'Team Orchestrator', token: 'team-orchestrator' },
	                ]),
	                modelItems: [
	                  { label: 'MiniMax M2', token: 'minimax-m2', desc: 'default' },
	                  { label: 'Kimi K2.5', token: 'kimi-k2.5', desc: '' },
                  { label: 'gpt-5', token: 'gpt-5', desc: '' },
                ],
              })
            } else {
              throw e
            }
          }

          const settings = await client.settingsGet()
          const daemonMode = settings.mode === 'team-orchestrator' ? 'team-orchestrator' : 'classic'
          const prevUiMode = get().mode
          set({
            model: settings.model,
            mode: prevUiMode === 'elon' ? 'elon' : daemonMode,
            lastStandardMode: daemonMode,
            workMode: settings.workMode as 'plan' | 'build' | 'review',
            prMode: settings.prMode,
            teamConfigName: settings.teamConfigName,
          })

          set({ daemon: client })
          await get().refreshSessions()

          // Create a local session if none selected.
          if (!get().activeSessionId) {
            const id = await get().createSession('New Session')
            get().selectSession(id)
          }
        } catch (e) {
          set({
            connectionStatus: 'error',
            error: e instanceof Error ? e.message : 'connect failed',
          })
        }
      },

      setProjectPath: async (path) => {
        const cleaned = path.trim()
        if (!cleaned) return
        set({ projectPath: cleaned, projectPathDraft: cleaned })
        const daemon = get().daemon
        const token = get().daemonToken
        if (!daemon || !token) return
        try {
          await daemon.initialize({ token, projectPath: cleaned, model: get().model, mode: get().mode })
          await get().refreshSessions()
        } catch (e) {
          set({ error: e instanceof Error ? e.message : 'failed to set project path' })
        }
      },

      setProjectPathDraft: (path) => set({ projectPathDraft: path }),

      refreshSessions: async () => {
        const daemon = get().daemon
        const projectPath = get().projectPath
        if (!daemon || !projectPath) return
        const res = await daemon.sessionList(projectPath)

        set((st) => {
          let next = st.sessions
          for (const s of res.sessions) {
            next = upsertSession(next, {
              id: s.id,
              name: s.name || 'Session',
              updatedAt: new Date(s.updatedAt).getTime(),
              projectPath: s.projectPath,
              activityCount: s.activityCount,
              diffCount: s.diffCount,
            })
          }
          return { sessions: next }
        })
      },

      createSession: async (name) => {
        const daemon = get().daemon
        const projectPath = get().projectPath
        if (!daemon) throw new Error('daemon not connected')
        if (!projectPath) throw new Error('projectPath is empty')

        const sessionName = (name ?? 'New Session').trim() || 'New Session'
        const res = await daemon.sessionCreate(projectPath, sessionName)

        set((st) => ({
          sessions: upsertSession(st.sessions, {
            id: res.sessionId,
            name: sessionName,
            updatedAt: now(),
          }),
          activeSessionId: res.sessionId,
        }))

        return res.sessionId
      },

      deleteSession: async (sessionId) => {
        const daemon = get().daemon
        const projectPath = get().projectPath

        const state = get()
        const deletingActive = state.activeSessionId === sessionId

        // Optimistic UI update: remove session from local state immediately
        set((st) => {
          const remaining = st.sessions.filter((s) => s.id !== sessionId)
          let nextActive: string | null = st.activeSessionId
          if (st.activeSessionId === sessionId) {
            nextActive = remaining[0]?.id ?? null
          }
          return { sessions: remaining, activeSessionId: nextActive }
        })

        // If the deleted session was active and nothing remains, create a fresh one.
        if (deletingActive && !get().activeSessionId) {
          const id = await get().createSession('New Session')
          get().selectSession(id)
        }

        // Best-effort backend deletion (fire and forget)
        if (daemon && projectPath) {
          // Cancel any running task first
          if (deletingActive && state.currentRunId && state.currentRunStatus === 'running') {
            daemon.runCancel(state.currentRunId).catch(() => {})
          }
          // Delete from backend database
          daemon.sessionDelete(projectPath, sessionId).catch((err) => {
            console.warn('[store] Failed to delete session from backend:', err)
          })
        }
      },

      selectSession: (sessionId) => set({ activeSessionId: sessionId }),
      setViewMode: (mode) => set({ viewMode: mode }),

      setElonFrame: (patch) =>
        set((st) => ({
          elonFrame: {
            collapsed: patch.collapsed ?? st.elonFrame.collapsed,
            problem: patch.problem ?? st.elonFrame.problem,
            constraints: patch.constraints ?? st.elonFrame.constraints,
            verification: patch.verification ?? st.elonFrame.verification,
          },
        })),

      clearElonFrame: () =>
        set((st) => ({
          elonFrame: { ...st.elonFrame, problem: '', constraints: '', verification: '' },
        })),

      setUiMode: async (next) => {
        const token = String(next ?? '').trim().toLowerCase()
        if (!isUiModeToken(token)) return

        const uiMode = token as UiModeToken
        const daemon = get().daemon

        if (uiMode === 'elon') {
          set({ mode: 'elon' })
        } else {
          set({ mode: uiMode, lastStandardMode: uiMode })
        }

        try {
          await daemon?.settingsSet({ mode: uiModeToDaemonMode(uiMode) })
        } catch {
          // keep local state even if daemon is offline/older
        }
      },

      sendPrompt: async (prompt) => {
        const daemon = get().daemon
        const sessionId = get().activeSessionId
        if (!daemon) throw new Error('daemon not connected')
        if (!sessionId) throw new Error('no active session')
        if (get().promptStageWizard) return

        const trimmed = prompt.trim()
        if (!trimmed) return

        // Clear composer immediately (CLI parity).
        set({ draftPrompt: '' })

        // Resolve prompt stages first (CLI parity). If unavailable, fall back to running.
        try {
          const resp = await daemon.promptStagesResolve({ prompt: trimmed, model: get().model })
          const stages = Array.isArray(resp?.stages) ? resp.stages : []
          if (stages.length === 0) {
            set({ promptStageWizard: { originalPrompt: trimmed, stages: [] } })
            await get().completePromptStageWizard([])
            return
          }
          set({ promptStageWizard: { originalPrompt: trimmed, stages } })
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          console.warn('[store] prompt_stages.resolve failed; falling back to direct run:', msg)
          set({ promptStageWizard: { originalPrompt: trimmed, stages: [] } })
          await get().completePromptStageWizard([])
        }
      },

      cancelPromptStageWizard: () => set({ promptStageWizard: null }),

      completePromptStageWizard: async (details) => {
        const daemon = get().daemon
        const sessionId = get().activeSessionId
        if (!daemon) throw new Error('daemon not connected')
        if (!sessionId) throw new Error('no active session')

        const uiMode = (isUiModeToken(get().mode) ? (get().mode as UiModeToken) : 'classic') as UiModeToken

        const wiz = get().promptStageWizard
        const trimmed = wiz?.originalPrompt ?? ''
        if (!trimmed) return

        let promptForAgent = trimmed
        if (wiz && wiz.stages.length > 0) {
          const lines = wiz.stages.map((s, i) => {
            const v = details[i] ?? null
            return `  ${s.name}: ${v ?? '(skipped)'}`
          })
          promptForAgent = `LLM detail:\n${lines.join('\n')}\n\n${trimmed}`
        }
        if (uiMode === 'elon') {
          const frame = get().elonFrame
          promptForAgent = applyElonPromptPrefixWithFrame(promptForAgent, frame)
        }

        const attachments = get().attachedImages.map((i) => ({ path: i.path, name: i.name }))
        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: trimmed,
          createdAt: now(),
          attachments: attachments.length ? attachments : undefined,
        }
        set((st) => ({ sessions: appendMessage(st.sessions, sessionId, userMsg) }))

        const imagePaths = attachments.map((i) => i.path)
        set({
          promptStageWizard: null,
          draftPrompt: '',
          currentRunStatus: 'queued',
          modifiedFilesByPath: {},
          pendingApprovals: [],
          clarifyingQuestions: [],
          attachedImages: [],
          orchestrator: {
            ...get().orchestrator,
            active: false,
            agents: {},
            tasks: [],
            contractStatus: undefined,
            contract: undefined,
            mcpServers: [],
            lspClients: [],
            skills: undefined,
            dynamicAgents: [],
            verifyStatus: {
              lint: 'idle',
              build: 'idle',
              test: 'idle',
            },
            contextBudget: {
              ...get().orchestrator.contextBudget,
              inputTokens: 0,
              outputTokens: 0,
              totalCost: 0,
              windowUsedTokens: 0,
              tokensSaved: 0,
            },
          },
        })
        if (uiMode === 'elon') {
          get().clearElonFrame()
        }
        try {
          // Ensure daemon session settings match GUI state.
          // `run.start` uses daemon session settings (not per-call params) for mode/model/workMode/prMode/teamConfigName.
          try {
            await daemon.settingsSet({
              model: get().model,
              mode: uiModeToDaemonMode(uiMode),
              workMode: get().workMode,
              prMode: get().prMode,
              teamConfigName: get().teamConfigName,
            })
          } catch (e) {
            console.warn('[store] settings.set failed before run.start:', e)
          }

          const res = await daemon.runStart({
            prompt: promptForAgent,
            sessionId,
            model: get().model,
            mode: uiModeToDaemonMode(uiMode),
            workMode: get().workMode,
            prMode: get().prMode,
            teamConfigName: get().teamConfigName,
            autoApprove: get().autoApprove,
            mdapK: get().mdapK,
            imagePaths: imagePaths.length > 0 ? imagePaths : undefined,
          })
          set({ currentRunId: res.runId, currentRunStatus: 'running' })
          set((st) => ({ sessions: updateMessage(st.sessions, sessionId, userMsg.id, { runId: res.runId }) }))
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'run.start failed'
          set({ currentRunStatus: 'failed', error: msg })
        }
      },

      cancelRun: async () => {
        const daemon = get().daemon
        const runId = get().currentRunId
        if (!daemon || !runId) return
        await daemon.runCancel(runId)
      },

      approve: async (approvalId, decision, feedback) => {
        const daemon = get().daemon
        if (!daemon) return
        await daemon.approvalRespond({ approvalId, decision, feedback })
        set((st) => ({
          pendingApprovals: st.pendingApprovals.filter((p) => p.approvalId !== approvalId),
        }))
        set((st) => ({
          currentRunStatus: st.currentRunStatus === 'awaiting_approval' ? 'running' : st.currentRunStatus,
        }))
      },

      answerClarifyingQuestion: async (questionId, selectedIds, customText) => {
        // For now, append answer to draft prompt as user input
        // Future: send to daemon via clarifying.answer RPC
        const question = get().clarifyingQuestions.find((q) => q.id === questionId)
        if (question) {
          const selectedLabels = question.options
            .filter((o) => selectedIds.includes(o.id))
            .map((o) => o.label)
          const answerText = customText || selectedLabels.join(', ')
          set((st) => ({
            draftPrompt: st.draftPrompt ? `${st.draftPrompt}\n${answerText}` : answerText,
          }))
        }
        // Remove answered question
        set((st) => ({
          clarifyingQuestions: st.clarifyingQuestions.filter((q) => q.id !== questionId),
        }))
      },

      setDraftPrompt: (value) => set({ draftPrompt: value }),
      appendToDraftPrompt: (value) =>
        set((st) => ({ draftPrompt: st.draftPrompt ? st.draftPrompt + value : value })),

      addAttachedImage: (img) =>
        set((st) => ({
          attachedImages:
            st.attachedImages.length >= 10 || st.attachedImages.some((x) => x.id === img.id)
              ? st.attachedImages
              : [...st.attachedImages, img],
        })),

      removeAttachedImage: (id) =>
        set((st) => ({
          attachedImages: st.attachedImages.filter((p) => p.id !== id),
        })),

      clearAttachedImages: () => set({ attachedImages: [] }),

      clearError: () => set({ error: null }),

      // ==================== ElonX HARD Actions ====================

      elonExecuteGoal: async () => {
        const { elonFrame } = get()
        if (!elonFrame.problem.trim()) return

        // Initialize plan tree from goal
        const newTree: PlanTree = {
          goalId: crypto.randomUUID(),
          problem: elonFrame.problem,
          constraints: elonFrame.constraints,
          verification: elonFrame.verification,
          status: 'running',
          startedAt: Date.now(),
          root: {
            id: 'root',
            title: elonFrame.problem,
            status: 'running',
            assignee: 'pm',
            children: [],
          },
        }

        set((st) => ({
          elonX: {
            ...st.elonX,
            planTree: newTree,
            metrics: {
              ...st.elonX.metrics,
              cycleStartMs: Date.now(),
              completedTasks: 0,
              totalTasks: 1,
            },
          },
        }))

        // Also trigger the normal sendPrompt flow
        const prompt = elonFrame.problem
        if (prompt) {
          await get().sendPrompt(prompt)
        }
      },

      elonPauseExecution: () => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            planTree: st.elonX.planTree
              ? { ...st.elonX.planTree, status: 'paused' }
              : null,
          },
        }))
      },

      elonResumeExecution: () => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            planTree: st.elonX.planTree
              ? { ...st.elonX.planTree, status: 'running' }
              : null,
          },
        }))
      },

      elonAbortExecution: () => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            planTree: st.elonX.planTree
              ? { ...st.elonX.planTree, status: 'failed' }
              : null,
          },
        }))
        // Also cancel the daemon run
        get().cancelRun()
      },

      elonSelectNode: (nodeId) => {
        set((st) => ({
          elonX: { ...st.elonX, selectedNodeId: nodeId },
        }))
      },

      elonRetryNode: (nodeId) => {
        set((st) => {
          const tree = st.elonX.planTree
          if (!tree?.root) return st

          const updateNode = (node: PlanNode): PlanNode => {
            if (node.id === nodeId) {
              return { ...node, status: 'pending', actualMs: undefined }
            }
            return { ...node, children: node.children.map(updateNode) }
          }

          return {
            elonX: {
              ...st.elonX,
              planTree: { ...tree, root: updateNode(tree.root) },
            },
          }
        })
      },

      elonSkipNode: (nodeId) => {
        set((st) => {
          const tree = st.elonX.planTree
          if (!tree?.root) return st

          const updateNode = (node: PlanNode): PlanNode => {
            if (node.id === nodeId) {
              return { ...node, status: 'completed', outputSummary: 'Skipped' }
            }
            return { ...node, children: node.children.map(updateNode) }
          }

          return {
            elonX: {
              ...st.elonX,
              planTree: { ...tree, root: updateNode(tree.root) },
            },
          }
        })
      },

      elonSelectEvidence: (evidenceId) => {
        set((st) => ({
          elonX: { ...st.elonX, selectedEvidenceId: evidenceId },
        }))
      },

      elonSetEvidenceFilter: (filter) => {
        set((st) => ({
          elonX: { ...st.elonX, evidenceFilter: filter },
        }))
      },

      elonApproveAction: (approvalId) => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            elonApprovals: st.elonX.elonApprovals.filter((a) => a.id !== approvalId),
            metrics: {
              ...st.elonX.metrics,
              interventions: st.elonX.metrics.interventions + 1,
              autonomyRate: Math.max(0, st.elonX.metrics.autonomyRate - 5),
            },
          },
        }))
      },

      elonRejectAction: (approvalId) => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            elonApprovals: st.elonX.elonApprovals.filter((a) => a.id !== approvalId),
            metrics: {
              ...st.elonX.metrics,
              interventions: st.elonX.metrics.interventions + 1,
              autonomyRate: Math.max(0, st.elonX.metrics.autonomyRate - 5),
            },
          },
        }))
      },

      elonUpdateAgentStatus: (agentId, status, task) => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            agentStatuses: {
              ...st.elonX.agentStatuses,
              [agentId]: {
                id: agentId,
                status,
                currentTask: task,
                startedAt: status === 'acting' ? Date.now() : st.elonX.agentStatuses[agentId]?.startedAt,
              },
            },
          },
        }))
      },

      elonAddEvidence: (evidence) => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            evidences: [evidence, ...st.elonX.evidences].slice(0, 100),
          },
        }))
      },

      elonUpdatePlanNode: (nodeId, patch) => {
        set((st) => {
          const tree = st.elonX.planTree
          if (!tree?.root) return st

          const updateNode = (node: PlanNode): PlanNode => {
            if (node.id === nodeId) {
              return { ...node, ...patch }
            }
            return { ...node, children: node.children.map(updateNode) }
          }

          // Update metrics
          const countCompleted = (n: PlanNode): number => {
            let count = n.status === 'completed' ? 1 : 0
            for (const c of n.children) count += countCompleted(c)
            return count
          }
          const countTotal = (n: PlanNode): number => {
            let count = 1
            for (const c of n.children) count += countTotal(c)
            return count
          }

          const newRoot = updateNode(tree.root)
          const completed = countCompleted(newRoot)
          const total = countTotal(newRoot)

          return {
            elonX: {
              ...st.elonX,
              planTree: { ...tree, root: newRoot },
              metrics: {
                ...st.elonX.metrics,
                completedTasks: completed,
                totalTasks: total,
              },
            },
          }
        })
      },

      // ==================== End ElonX HARD Actions ====================

      // ==================== CEO Auto-Cycle Actions (M0) ====================

      autoCycleToggle: (enabled) => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            autoCycle: {
              ...st.elonX.autoCycle,
              enabled,
              status: enabled ? 'cooldown' : 'idle',
              nextRunAt: enabled ? Date.now() + st.elonX.autoCycle.intervalMs : null,
              consecutiveFailures: enabled ? 0 : st.elonX.autoCycle.consecutiveFailures,
            },
          },
        }))
      },

      autoCycleSetInterval: (intervalMs) => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            autoCycle: {
              ...st.elonX.autoCycle,
              intervalMs,
              nextRunAt: st.elonX.autoCycle.enabled ? Date.now() + intervalMs : null,
            },
          },
        }))
      },

      autoCycleRunNow: async () => {
        const state = get()
        if (state.elonX.autoCycle.status === 'running') return

        const daemon = state.daemon
        const sessionId = state.activeSessionId
        if (!daemon || !sessionId) {
          console.error('[autoCycleRunNow] No daemon or session')
          return
        }

        const cycleId = crypto.randomUUID()
        const startedAt = Date.now()

        // Mark cycle as running
        set((st) => ({
          elonX: {
            ...st.elonX,
            autoCycle: {
              ...st.elonX.autoCycle,
              status: 'running',
            },
            cycleRuns: [
              {
                id: cycleId,
                startedAt,
                endedAt: null,
                status: 'running',
                evidenceIds: [],
                broadcastIds: [],
                llmOutput: null,
                errorMessage: null,
              },
              ...st.elonX.cycleRuns,
            ].slice(0, 50), // Keep last 50 runs
          },
        }))

        try {
          // Build CEO observe context and prompt
          const { buildObserveContext, buildCeoMessages, parseCeoLlmOutput } = await import('./ceoLlm')
          const { invoke } = await import('@tauri-apps/api/core')
          const observeContext = buildObserveContext(get().elonX)
          const { systemPrompt, userPrompt } = buildCeoMessages(observeContext)

          // Call xAI API directly via Rust backend (bypasses daemon)
          const rawResponse = await invoke<string>('xai_chat_completion', { systemPrompt, userPrompt })

          // Parse the CEO LLM output
          const llmOutput = parseCeoLlmOutput(rawResponse)

          // Create broadcasts from LLM output
          const broadcastIds: string[] = []
          const now = Date.now()
          const newBroadcasts: Broadcast[] = llmOutput.broadcasts.map((b) => {
            const id = crypto.randomUUID()
            broadcastIds.push(id)
            return {
              id,
              cycleRunId: cycleId,
              toAgentIds: [b.to],
              message: b.message,
              why: llmOutput.topLeverage.find((l) => l.assignee === b.to)?.why || 'Top leverage item',
              evidenceLinks: [],
              expiresAt: now + b.expiresMins * 60 * 1000,
              createdAt: now,
              status: 'active' as const,
            }
          })

          // Mark previous active broadcasts as superseded
          set((st) => ({
            elonX: {
              ...st.elonX,
              broadcasts: [
                ...newBroadcasts,
                ...st.elonX.broadcasts.map((b) =>
                  b.status === 'active' ? { ...b, status: 'superseded' as const } : b,
                ),
              ].slice(0, 100), // Keep last 100 broadcasts
            },
          }))

          // Update agent statuses and call LLMs for each broadcast
          const { buildAgentPrompt, parseAgentOutput } = await import('./ceoLlm')

          for (const b of newBroadcasts) {
            for (const agentId of b.toAgentIds) {
              // Mark agent as evaluating
              set((st) => ({
                elonX: {
                  ...st.elonX,
                  agentStatuses: {
                    ...st.elonX.agentStatuses,
                    [agentId]: {
                      id: agentId,
                      status: 'evaluating',
                      currentTask: b.message,
                      startedAt: Date.now(),
                    },
                  },
                },
              }))

              try {
                const { systemPrompt: agentSys, userPrompt: agentUsr } = buildAgentPrompt(agentId, b.message)

                let rawAgentResponse: string
                if (agentId === 'pm') {
                  // PM uses Kimi K2.5 with web search for real-time research
                  rawAgentResponse = await invoke<string>('kimi_web_search_completion', {
                    systemPrompt: agentSys,
                    userPrompt: agentUsr,
                  })
                } else if (agentId.startsWith('swe')) {
                  // SWE agents use Anthropic Claude Sonnet 4
                  rawAgentResponse = await invoke<string>('anthropic_chat_completion', {
                    systemPrompt: agentSys,
                    userPrompt: agentUsr,
                  })
                } else {
                  // Fallback: OpenAI GPT-4o
                  rawAgentResponse = await invoke<string>('openai_chat_completion', {
                    systemPrompt: agentSys,
                    userPrompt: agentUsr,
                  })
                }

                // Parse output and store results
                let outputSummary: string
                try {
                  const agentOutput = parseAgentOutput(rawAgentResponse)
                  outputSummary = agentOutput.output
                } catch {
                  // If parsing fails, use raw response as summary
                  outputSummary = rawAgentResponse.slice(0, 500)
                }

                // Mark agent as idle with last output
                set((st) => ({
                  elonX: {
                    ...st.elonX,
                    agentStatuses: {
                      ...st.elonX.agentStatuses,
                      [agentId]: {
                        id: agentId,
                        status: 'idle',
                        currentTask: undefined,
                        lastOutput: outputSummary,
                        startedAt: st.elonX.agentStatuses[agentId]?.startedAt,
                      },
                    },
                  },
                }))
              } catch (agentErr) {
                // Agent LLM call failed - mark as idle with error
                const errMsg = agentErr instanceof Error ? agentErr.message : String(agentErr)
                set((st) => ({
                  elonX: {
                    ...st.elonX,
                    agentStatuses: {
                      ...st.elonX.agentStatuses,
                      [agentId]: {
                        id: agentId,
                        status: 'idle',
                        currentTask: undefined,
                        lastOutput: `[Error] ${errMsg}`,
                        startedAt: st.elonX.agentStatuses[agentId]?.startedAt,
                      },
                    },
                  },
                }))
              }
            }
          }

          // Complete the cycle run
          const endedAt = Date.now()
          set((st) => ({
            elonX: {
              ...st.elonX,
              autoCycle: {
                ...st.elonX.autoCycle,
                status: st.elonX.autoCycle.enabled ? 'cooldown' : 'idle',
                lastRunAt: endedAt,
                nextRunAt: st.elonX.autoCycle.enabled ? endedAt + st.elonX.autoCycle.intervalMs : null,
                consecutiveFailures: 0,
              },
              cycleRuns: st.elonX.cycleRuns.map((r) =>
                r.id === cycleId
                  ? { ...r, endedAt, status: 'completed' as const, llmOutput, broadcastIds }
                  : r,
              ),
            },
          }))
        } catch (error) {
          // Handle failure
          const endedAt = Date.now()
          const errorMsg = error instanceof Error ? error.message : 'Cycle execution failed'

          set((st) => {
            const failures = st.elonX.autoCycle.consecutiveFailures + 1
            const shouldPause = failures >= 3 // Drift Guard: auto-pause after 3 failures

            return {
              elonX: {
                ...st.elonX,
                autoCycle: {
                  ...st.elonX.autoCycle,
                  status: shouldPause ? 'paused' : st.elonX.autoCycle.enabled ? 'cooldown' : 'idle',
                  enabled: shouldPause ? false : st.elonX.autoCycle.enabled,
                  lastRunAt: endedAt,
                  nextRunAt: shouldPause ? null : st.elonX.autoCycle.enabled ? endedAt + st.elonX.autoCycle.intervalMs : null,
                  consecutiveFailures: failures,
                },
                cycleRuns: st.elonX.cycleRuns.map((r) =>
                  r.id === cycleId ? { ...r, endedAt, status: 'failed' as const, errorMessage: errorMsg } : r,
                ),
              },
            }
          })
        }
      },

      autoCycleKillSwitch: () => {
        set((st) => ({
          elonX: {
            ...st.elonX,
            autoCycle: {
              ...st.elonX.autoCycle,
              enabled: false,
              status: 'idle',
              nextRunAt: null,
            },
            // Abort any running cycle
            cycleRuns: st.elonX.cycleRuns.map((r) =>
              r.status === 'running' ? { ...r, status: 'aborted' as const, endedAt: Date.now() } : r,
            ),
          },
        }))
      },

      autoCycleTick: () => {
        const state = get()
        const { autoCycle } = state.elonX

        if (!autoCycle.enabled || autoCycle.status !== 'cooldown') return
        if (!autoCycle.nextRunAt) return

        const now = Date.now()
        if (now >= autoCycle.nextRunAt) {
          // Time to run the next cycle
          get().autoCycleRunNow()
        }
      },

      autoCycleExpireBroadcasts: () => {
        const now = Date.now()
        set((st) => ({
          elonX: {
            ...st.elonX,
            broadcasts: st.elonX.broadcasts.map((b) =>
              b.status === 'active' && b.expiresAt <= now ? { ...b, status: 'expired' as const } : b,
            ),
          },
        }))
      },

      // ==================== End CEO Auto-Cycle Actions ====================
    }),
    {
      name: 'snailer-gui',
      partialize: (state) => ({
        projectPath: state.projectPath,
        model: state.model,
        mode: state.mode,
        lastStandardMode: state.lastStandardMode,
        workMode: state.workMode,
        prMode: state.prMode,
        autoApprove: state.autoApprove,
        mdapK: state.mdapK,
        teamConfigName: state.teamConfigName,
        viewMode: state.viewMode,
        sessions: state.sessions.map((s) => ({
          id: s.id,
          name: s.name,
          updatedAt: s.updatedAt,
          projectPath: s.projectPath,
          activityCount: s.activityCount,
          diffCount: s.diffCount,
          messages: s.messages,
          agentEvents: s.agentEvents,
        })),
        activeSessionId: state.activeSessionId,
      }),
      version: 4,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>
        // Migration from version 2 to 3: add agentEvents to sessions
        if (version < 3 && state.sessions && Array.isArray(state.sessions)) {
          state.sessions = (state.sessions as Array<Record<string, unknown>>).map((s) => ({
            ...s,
            agentEvents: s.agentEvents ?? [],
          }))
        }
        // Migration from version 3 to 4: backfill `runId` on user messages based on subsequent run-tagged messages.
        if (version < 4 && state.sessions && Array.isArray(state.sessions)) {
          state.sessions = (state.sessions as Array<Record<string, unknown>>).map((s) => {
            const raw = (s.messages as Array<Record<string, unknown>>) ?? []
            const messages = Array.isArray(raw) ? raw.map((m) => ({ ...m })) : []
            let lastUserIdx: number | null = null
            for (let i = 0; i < messages.length; i++) {
              const m = messages[i]
              const role = String(m?.role ?? '')
              const runId = String(m?.runId ?? '').trim()
              if (role === 'user') {
                lastUserIdx = i
                continue
              }
              if (runId && lastUserIdx !== null) {
                const um = messages[lastUserIdx]
                const hasUserRunId = Boolean(String(um?.runId ?? '').trim())
                if (!hasUserRunId) {
                  messages[lastUserIdx] = { ...um, runId }
                }
              }
            }
            return { ...s, messages }
          })
        }
        return state
      },
    },
  ),
)
