/**
 * Snailer Daemon Client (protocol v2)
 * WebSocket JSON-RPC 2.0 + push notifications:
 * - ui.event
 * - run.status
 * - approval.requested
 */

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export type JsonRpcId = number

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: JsonRpcId
  method: string
  params?: unknown
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

export interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: unknown
}

export type UiEvent = {
  type: string
  data: Record<string, unknown>
}

export type UiEventEnvelope = {
  seq: number
  runId: string
  sessionId?: string | null
  event: UiEvent
}

export type PromptStageOption = {
  title: string
  description: string
  detail: string
  requiresInput?: boolean
}

export type PromptStage = {
  name: string
  question: string
  options: PromptStageOption[]
}

type StatusHandler = (status: ConnectionStatus) => void
type NotificationHandler = (method: string, params: unknown) => void

export interface DaemonClientOptions {
  url: string
  autoReconnect?: boolean
  reconnectIntervalMs?: number
  maxReconnectAttempts?: number
}

export class DaemonClient {
  private ws: WebSocket | null = null
  private readonly url: string
  private readonly autoReconnect: boolean
  private readonly reconnectIntervalMs: number
  private readonly maxReconnectAttempts: number
  private reconnectAttempts = 0

  private requestId: number = 0
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timeout: number }
  >()

  private statusHandlers = new Set<StatusHandler>()
  private notificationHandlers = new Set<NotificationHandler>()
  private _status: ConnectionStatus = 'disconnected'

  constructor(options: DaemonClientOptions) {
    this.url = options.url
    this.autoReconnect = options.autoReconnect ?? true
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 1500
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10
  }

  get status(): ConnectionStatus {
    return this._status
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  onNotification(handler: NotificationHandler) {
    this.notificationHandlers.add(handler)
    return () => this.notificationHandlers.delete(handler)
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status
    this.statusHandlers.forEach((h) => h(status))
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.setStatus('connecting')

    await new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.setStatus('connected')
          resolve()
        }

        this.ws.onclose = () => {
          this.setStatus('disconnected')
          this.handleDisconnect()
        }

        this.ws.onerror = () => {
          this.setStatus('error')
          reject(new Error('WebSocket connection failed'))
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(String(event.data))
        }
      } catch (e) {
        this.setStatus('error')
        reject(e instanceof Error ? e : new Error('connect failed'))
      }
    })
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.setStatus('disconnected')
  }

  private handleDisconnect() {
    if (!this.autoReconnect) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return
    this.reconnectAttempts++
    setTimeout(() => {
      this.connect().catch(() => {
        // keep trying until max attempts
      })
    }, this.reconnectIntervalMs)
  }

  private handleMessage(raw: string) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }

    // Response
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'jsonrpc' in parsed &&
      (parsed as { jsonrpc?: unknown }).jsonrpc === '2.0' &&
      'id' in parsed
    ) {
      const res = parsed as JsonRpcResponse
      const entry = this.pending.get(res.id as number)
      if (!entry) return
      this.pending.delete(res.id as number)
      window.clearTimeout(entry.timeout)
      if (res.error) entry.reject(new Error(res.error.message))
      else entry.resolve(res.result)
      return
    }

    // Notification
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { jsonrpc?: unknown }).jsonrpc === '2.0' &&
      'method' in parsed
    ) {
      const note = parsed as JsonRpcNotification
      this.notificationHandlers.forEach((h) => h(note.method, note.params))
    }
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('daemon not connected')
    }

    const id = ++this.requestId
    const payload: JsonRpcRequest = { jsonrpc: '2.0', id, method, params }

    return new Promise<T>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('request timeout'))
      }, 30_000)

      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timeout })
      this.ws!.send(JSON.stringify(payload))
    })
  }

  // ─────────────────────────────────────────────────────────────
  // Snailer protocol helpers
  // ─────────────────────────────────────────────────────────────

  async initialize(params: {
    token: string
    projectPath: string
    model?: string
    mode?: string
  }): Promise<unknown> {
    return this.request('initialize', params)
  }

  async slashList(): Promise<{
    slashItems: Array<{ cmd: string; desc: string }>
    modeItems: Array<{ label: string; token: string }>
    modelItems: Array<{ label: string; token: string; desc: string }>
  }> {
    return this.request('slash.list')
  }

  async accountGet(): Promise<{
    email?: string
    hasAccountToken?: boolean
    planName?: string
    status?: string | null
    usageUsed?: number | null
    usageLimit?: number | null
    period?: string | null
    isStarter?: boolean
    isPremium?: boolean
    planError?: string
  }> {
    return this.request('account.get')
  }

  async settingsGet(): Promise<{
    projectPath?: string
    model: string
    mode: string
    workMode: string
    prMode: boolean
    teamConfigName: string
    initialized: boolean
  }> {
    return this.request('settings.get')
  }

  async settingsSet(params: Partial<{
    model: string
    mode: string
    workMode: string
    prMode: boolean
    teamConfigName: string
  }>): Promise<{ status: 'ok' }> {
    return this.request('settings.set', params)
  }

  async sessionList(projectPath: string): Promise<{
    sessions: Array<{
      id: string
      name: string
      updatedAt: string
      activityCount: number
      diffCount: number
      projectPath: string
    }>
  }> {
    return this.request('session.list', { projectPath })
  }

  async sessionCreate(projectPath: string, name: string): Promise<{ sessionId: string }> {
    return this.request('session.create', { projectPath, name })
  }

  async sessionDelete(projectPath: string, sessionId: string): Promise<{ status: 'ok' }> {
    return this.request('session.delete', { projectPath, sessionId })
  }

  async runStart(params: {
    prompt: string
    sessionId?: string
    model?: string
    mode?: string
    workMode?: string
    prMode?: boolean
    teamConfigName?: string
    autoApprove?: boolean
    mdapK?: number
    imagePaths?: string[]
  }): Promise<{ runId: string; status: 'started' }> {
    return this.request('run.start', params)
  }

  async runCancel(runId: string): Promise<{ status: string }> {
    return this.request('run.cancel', { runId })
  }

  async diffGet(runId: string): Promise<{ files: Array<Record<string, unknown>> }> {
    return this.request('diff.get', { runId })
  }

  async bashLogGet(params: {
    runId?: string
    commandId?: string
  }): Promise<
    | {
        commands: Array<{
          commandId: string
          cmd: string[]
          cwd: string
          exitCode: number | null
          durationMs: number
          summary: string
        }>
      }
    | {
        commandId: string
        cmd: string[]
        cwd: string
        exitCode: number | null
        durationMs: number
        summary: string
        stdout: string
        stderr: string
      }
  > {
    return this.request('bash_log.get', params)
  }

  async approvalRespond(params: {
    approvalId: string
    decision:
      | 'approve_once'
      | 'approve_always'
      | 'request_change'
      | 'reject'
      | 'cancel'
    feedback?: string
  }): Promise<{ status: 'ok' }> {
    return this.request('approval.respond', params)
  }

  async loopGuardRespond(params: {
    approvalId: string
    decision: 'allow_once' | 'allow_always' | 'reject' | 'cancel'
  }): Promise<{ status: 'ok' }> {
    return this.request('loop_guard.respond', params)
  }

  async promptStagesResolve(params: {
    prompt: string
    model?: string
  }): Promise<{ stages: PromptStage[] }> {
    return this.request('prompt_stages.resolve', params)
  }

  async clarifyingAnswer(params: {
    questionId: string
    selectedIds?: string[]
    customText?: string
  }): Promise<{ status: string }> {
    return this.request('clarifying.answer', params)
  }

  async pairEnqueue(params: { feedback: string }): Promise<{ status: string; queued?: boolean; count?: number; items?: string[] }> {
    return this.request('pair.enqueue', params)
  }

  async queueEnqueue(params: { prompt: string }): Promise<{ status: string; queued?: boolean; count?: number; items?: string[] }> {
    return this.request('queue.enqueue', params)
  }

  async queueList(): Promise<{ count: number; items: string[] }> {
    return this.request('queue.list')
  }

  async queueClear(): Promise<{ status: 'ok' }> {
    return this.request('queue.clear')
  }
}
