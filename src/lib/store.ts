import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { PromptStage, UiEventEnvelope } from './daemon'
import { DaemonClient } from './daemon'

let snailerCliEnsurePromise: Promise<void> | null = null

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  runId?: string
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
  workMode: 'plan' | 'build' | 'review'
  prMode: boolean
  autoApprove: boolean
  mdapK: number
  teamConfigName: string

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

  lastToast: { title: string; message: string } | null
  draftPrompt: string
  attachedImages: string[]

  // Actions
  connect: () => Promise<void>
  setProjectPath: (path: string) => Promise<void>
  setProjectPathDraft: (path: string) => void
  refreshSessions: () => Promise<void>
  createSession: (name?: string) => Promise<string>
  deleteSession: (sessionId: string) => Promise<void>
  selectSession: (sessionId: string) => void
  setViewMode: (mode: 'chat' | 'settings') => void
  sendPrompt: (prompt: string) => Promise<void>
  cancelRun: () => Promise<void>

  approve: (approvalId: string, decision: PendingApprovalDecision, feedback?: string) => Promise<void>
  answerClarifyingQuestion: (questionId: string, selectedIds: string[], customText?: string) => Promise<void>
  cancelPromptStageWizard: () => void
  completePromptStageWizard: (details: Array<string | null>) => Promise<void>
  setDraftPrompt: (value: string) => void
  appendToDraftPrompt: (value: string) => void
  addAttachedImage: (path: string) => void
  removeAttachedImage: (path: string) => void
  clearAttachedImages: () => void
  clearError: () => void
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
      workMode: 'build',
      prMode: false,
      autoApprove: false,
      mdapK: 3,
      teamConfigName: 'ShipFast',

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

      lastToast: null,
      draftPrompt: '',
      attachedImages: [],

      connect: async () => {
        if (get().connectionStatus === 'connected') return
        set({ connectionStatus: 'starting', error: null })

        if (!snailerCliEnsurePromise) {
          snailerCliEnsurePromise = (async () => {
            try {
              await invoke<string>('snailer_cli_ensure_installed')
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e)
              const clipped = msg.length > 500 ? `${msg.slice(0, 500)}…` : msg
              set({
                lastToast: {
                  title: 'Snailer CLI 설치 실패',
                  message: clipped,
                },
              })
              snailerCliEnsurePromise = null
            }
          })()
        }
        void snailerCliEnsurePromise

        const started = (await invoke('engine_start')) as {
          url: string
          token: string
          default_project_path: string
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

            const agentEvent: AgentEvent = {
              id: crypto.randomUUID(),
              type: eventType as AgentEventType,
              timestamp: Date.now(),
              runId: state.currentRunId ?? undefined,
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
            set({ mode: nextMode })
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
            mode: get().mode,
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
              modeItems: slash.modeItems,
              modelItems,
            })
          } catch (e) {
            // Backward-compat: older daemon may not implement slash.list.
            const msg = e instanceof Error ? e.message : String(e)
            if (msg.toLowerCase().includes('method not found')) {
              set({
                slashItems: [],
                modeItems: [
                  { label: 'Classic', token: 'classic' },
                  { label: 'Team Orchestrator', token: 'team-orchestrator' },
                  { label: 'Snailer Plato', token: 'snailer-doctor' },
                ],
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
          set({
            model: settings.model,
            mode: settings.mode,
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

        const userMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: trimmed,
          createdAt: now(),
        }
        set((st) => ({ sessions: appendMessage(st.sessions, sessionId, userMsg) }))

        const imagePaths = get().attachedImages
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
        try {
          // Ensure daemon session settings match GUI state.
          // `run.start` uses daemon session settings (not per-call params) for mode/model/workMode/prMode/teamConfigName.
          try {
            await daemon.settingsSet({
              model: get().model,
              mode: get().mode,
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
            mode: get().mode,
            workMode: get().workMode,
            prMode: get().prMode,
            teamConfigName: get().teamConfigName,
            autoApprove: get().autoApprove,
            mdapK: get().mdapK,
            imagePaths: imagePaths.length > 0 ? imagePaths : undefined,
          })
          set({ currentRunId: res.runId, currentRunStatus: 'running' })
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

      addAttachedImage: (path) =>
        set((st) => ({
          attachedImages: st.attachedImages.includes(path)
            ? st.attachedImages
            : [...st.attachedImages, path],
        })),

      removeAttachedImage: (path) =>
        set((st) => ({
          attachedImages: st.attachedImages.filter((p) => p !== path),
        })),

      clearAttachedImages: () => set({ attachedImages: [] }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'snailer-gui',
      partialize: (state) => ({
        projectPath: state.projectPath,
        model: state.model,
        mode: state.mode,
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
      version: 3,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>
        // Migration from version 2 to 3: add agentEvents to sessions
        if (version < 3 && state.sessions && Array.isArray(state.sessions)) {
          state.sessions = (state.sessions as Array<Record<string, unknown>>).map((s) => ({
            ...s,
            agentEvents: s.agentEvents ?? [],
          }))
        }
        return state
      },
    },
  ),
)
