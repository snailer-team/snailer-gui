import { useEffect, useMemo, useRef, useState } from 'react'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

import { Badge } from './ui/badge'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'
import { AgentLogView } from './AgentLogView'
import { TypewriterTitle } from './TypewriterTitle'
import { useAppStore } from '../lib/store'
import { isTauriRuntime } from '../lib/tauri'

function IconCommit({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="12" r="3" />
      <path d="M9 12h10" strokeLinecap="round" />
    </svg>
  )
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M8 5h4a4 4 0 0 1 4 4v0M8 5v10a4 4 0 0 0 4 4h4" />
    </svg>
  )
}

function IconArrowUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconGithub({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.2c-3.34.73-4.04-1.42-4.04-1.42-.55-1.36-1.34-1.72-1.34-1.72-1.1-.74.09-.73.09-.73 1.2.09 1.83 1.22 1.83 1.22 1.08 1.82 2.84 1.29 3.53.99.11-.76.42-1.29.76-1.59-2.67-.3-5.47-1.32-5.47-5.89 0-1.3.47-2.37 1.23-3.2-.12-.3-.53-1.53.12-3.2 0 0 1-.32 3.29 1.22a11.57 11.57 0 0 1 5.99 0c2.28-1.54 3.28-1.22 3.28-1.22.65 1.67.25 2.9.12 3.2.77.83 1.23 1.9 1.23 3.2 0 4.58-2.8 5.59-5.49 5.89.43.37.82 1.08.82 2.2v3.25c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

type GitBranchListResponse = {
  currentBranch: string
  changedFiles?: number
  added?: number
  removed?: number
}

type GitCommitPushResponse = {
  success: boolean
  sha: string
  message?: string | null
}

export function ChatArea() {
  const {
    sessions,
    activeSessionId,
    currentRunStatus,
    currentRunId,
    daemon,
    mode,
    model,
    setUiMode,
    lastStandardMode,
    projectPath,
  } = useAppStore()

  const session = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )

  const runIdsWithEvents = useMemo(() => {
    const out = new Set<string>()
    for (const e of session?.agentEvents ?? []) {
      const renderable =
        (e.type === 'FileOp' && Boolean(e.op)) ||
        e.type === 'Start' ||
        e.type === 'Done' ||
        e.type === 'Fail' ||
        (e.type === 'StatusLine' && Boolean(e.line)) ||
        e.type === 'RunStatusChanged' ||
        e.type === 'LoopGuardTriggered'
      if (renderable && e.runId) out.add(e.runId)
    }
    for (const m of session?.messages ?? []) {
      if (m.role === 'system' && m.runId && m.content.trim()) out.add(m.runId)
    }
    return out
  }, [session?.agentEvents, session?.messages])

  // Track if we should animate title (only for new sessions/prompts)
  const [animatingTitle, setAnimatingTitle] = useState<string | null>(null)
  const [showCommitModal, setShowCommitModal] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [includeUnstaged, setIncludeUnstaged] = useState(true)
  const [commitMessageDraft, setCommitMessageDraft] = useState('')
  const [commitAction, setCommitAction] = useState<'commit' | 'commit_and_push' | 'commit_and_pr'>('commit')
  const [commitBranch, setCommitBranch] = useState('')
  const [commitChangedFiles, setCommitChangedFiles] = useState(0)
  const [commitAdded, setCommitAdded] = useState(0)
  const [commitRemoved, setCommitRemoved] = useState(0)
  const lastSessionIdRef = useRef<string | null>(null)
  const lastMessageCountRef = useRef<number>(0)

  useEffect(() => {
    if (!session) return

    const currentMessageCount = session.messages.length
    const isNewSession = lastSessionIdRef.current !== session.id
    const hasNewUserMessage = currentMessageCount > lastMessageCountRef.current

    // Trigger animation when first message is added to a session
    if ((isNewSession || hasNewUserMessage) && currentMessageCount === 1 && session.messages[0]?.role === 'user') {
      // Generate title from first user message (truncate to ~50 chars)
      const first = session.messages[0]
      const firstText = first.content.trim()
      const titleSource =
        firstText ||
        (first.attachments?.length ? `Images (${first.attachments.length})` : '') ||
        'New Session'
      const title = titleSource.length > 50 ? titleSource.slice(0, 47) + '...' : titleSource
      setAnimatingTitle(title)
    }

    lastSessionIdRef.current = session.id
    lastMessageCountRef.current = currentMessageCount
  }, [session?.id, session?.messages.length])

  const lastContent = session?.messages.at(-1)?.content ?? ''
  const bottomRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const busy = currentRunStatus === 'running' || currentRunStatus === 'queued'
  const modeChoices = useMemo(
    () => [
      { label: 'Classic', token: 'classic' },
      { label: 'Team Orchestrator', token: 'team-orchestrator' },
    ],
    [],
  )
  const displayMode = mode === 'elon' ? lastStandardMode : mode

  const tauriRuntime = useMemo(() => isTauriRuntime(), [])

  const updateScrollState = () => {
    const el = viewportRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const atBottom = distanceFromBottom < 72
    stickToBottomRef.current = atBottom
    setShowScrollToBottom(!atBottom)
  }

  const handleScrollToBottom = () => {
    stickToBottomRef.current = true
    setShowScrollToBottom(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  const loadCommitContext = async () => {
    if (!projectPath) {
      setCommitBranch('')
      setCommitChangedFiles(0)
      setCommitAdded(0)
      setCommitRemoved(0)
      return
    }
    try {
      const branchInfo = await invoke<GitBranchListResponse>('git_branch_list', { cwd: projectPath })
      setCommitBranch(String(branchInfo.currentBranch ?? '').trim())
      setCommitChangedFiles(Number(branchInfo.changedFiles ?? 0))
      setCommitAdded(Number(branchInfo.added ?? 0))
      setCommitRemoved(Number(branchInfo.removed ?? 0))
    } catch {
      setCommitBranch('')
      setCommitChangedFiles(0)
      setCommitAdded(0)
      setCommitRemoved(0)
    }
  }

  const openCommitModal = () => {
    setCommitAction('commit')
    setIncludeUnstaged(true)
    setCommitMessageDraft('')
    setShowCommitModal(true)
    void loadCommitContext()
  }

  const handleCommitContinue = async () => {
    if (!projectPath) {
      toast('No project selected')
      return
    }
    if (!commitBranch) {
      toast('No current branch')
      return
    }
    if (commitAction === 'commit_and_pr') return

    try {
      setIsCommitting(true)
      const fallback = `chore(snailer): apply agent changes ${new Date().toLocaleString()}`
      const message = commitMessageDraft.trim() || fallback
      const result = await invoke<GitCommitPushResponse>('git_commit_and_push', {
        cwd: projectPath,
        branch: commitBranch,
        message,
        files: [],
        includeUnstaged,
        push: commitAction === 'commit_and_push',
      })

      if (result.sha === 'no-changes') {
        toast('No changes to commit')
      } else if (commitAction === 'commit') {
        toast('Commit completed', { description: `${commitBranch} · ${result.sha.slice(0, 8)}` })
      } else {
        toast('Commit & push completed', { description: `${commitBranch} · ${result.sha.slice(0, 8)}` })
      }
      setShowCommitModal(false)
    } catch (e) {
      toast('Commit & push failed', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setIsCommitting(false)
    }
  }

  useEffect(() => {
    if (!stickToBottomRef.current) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [session?.messages.length, lastContent, session?.agentEvents.length])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      updateScrollState()
    })
    return () => window.cancelAnimationFrame(id)
  }, [session?.id, session?.messages.length, session?.agentEvents.length])

  // Format model name for display
  const modelDisplay = model?.replace('claude-', '').replace('-20', ' ').replace(/(\d)/, ' $1') || 'Opus 4.6'

  return (
    <div className="relative flex h-full flex-col bg-[color:var(--color-panel)]">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[color:var(--color-border)] bg-white px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="truncate text-[15px] font-semibold tracking-tight text-slate-800">{session ? session.name : 'Session'}</div>
          <button
            type="button"
            disabled={isCommitting}
            onClick={openCommitModal}
            className={[
              'inline-flex items-center gap-2 rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50',
              isCommitting ? 'cursor-not-allowed opacity-60' : '',
            ].join(' ')}
            title="Commit"
          >
            <IconCommit className="h-4 w-4" />
            <span>Commit</span>
            <IconChevronDown className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-[color:var(--color-border)] bg-[#f8fafc] p-1">
            {modeChoices.map((m) => {
              const active = displayMode === m.token
              return (
                <button
                  key={m.token}
                  disabled={!daemon || busy}
                  onClick={() => {
                    void (async () => {
                      await setUiMode(m.token)
                    })()
                  }}
                  className={[
                    'rounded-full px-2.5 py-1 text-xs font-medium transition',
                    active ? 'bg-white text-slate-800 shadow-[var(--shadow-sm)]' : 'text-slate-500 hover:bg-white/80',
                    !daemon || busy ? 'cursor-not-allowed opacity-60' : '',
                  ].join(' ')}
                  title={m.label}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
          {busy ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
          ) : null}
          <Badge
            variant={
              currentRunStatus === 'running'
                ? 'info'
                : currentRunStatus === 'awaiting_approval'
                  ? 'warning'
                  : currentRunStatus === 'failed'
                    ? 'error'
                    : currentRunStatus === 'completed'
                      ? 'success'
                      : 'default'
            }
          >
            {currentRunStatus}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport
          ref={viewportRef}
          className="h-full"
          onScroll={updateScrollState}
        >
          <div className="mx-auto w-full max-w-4xl px-6 py-6 space-y-4">
            {!session ? (
              <div className="rounded-2xl border border-[color:var(--color-border)] bg-[#f8fafc] p-6 shadow-[var(--shadow-sm)]">
                <div className="text-lg font-semibold tracking-tight text-slate-800">Snailer GUI</div>
                <div className="mt-1 text-sm text-slate-500">
                  Select a session from the left or create a new one, then enter your request below.
                </div>
                <div className="mt-4 text-sm text-slate-500">
                  Example: <span className="font-mono">"Find and fix the build error in this project"</span>
                </div>
              </div>
            ) : session.messages.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--color-border)] bg-[#f8fafc] p-6 shadow-[var(--shadow-sm)] text-sm text-slate-500">
                No messages yet. Enter a prompt below.
              </div>
            ) : (
              <>
                {/* Animated session title - show on first message */}
                {animatingTitle && session.messages.length >= 1 && (
                  <div className="mb-6">
                    <div className="inline-block rounded-lg border border-[color:var(--color-border)] bg-white px-4 py-2 shadow-[var(--shadow-sm)]">
                      <TypewriterTitle
                        text={animatingTitle}
                        speed={25}
                        className="text-base font-semibold text-slate-900"
                        onComplete={() => {
                          // Keep showing for a moment after complete
                          setTimeout(() => setAnimatingTitle(null), 2000)
                        }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-slate-400">
                      Now · {modelDisplay}
                    </div>
                  </div>
                )}

                {/* Messages - show user prompts, then the run log right after */}
                {session.messages
                  .filter((m) => {
                    if (m.role !== 'user') return false
                    const hasText = Boolean(m.content.trim())
                    const hasAttachments = Boolean(m.attachments?.length)
                    return hasText || hasAttachments
                  })
                  .map((m) => {
                    const runId = m.runId
                    const hasLog = Boolean(runId && runIdsWithEvents.has(runId))
                    const isActiveRun = Boolean(runId && currentRunId && runId === currentRunId)
                    const showPending = isActiveRun && (currentRunStatus === 'running' || currentRunStatus === 'queued')
                    return (
                      <div key={m.id} className="space-y-2">
                        <div className="flex justify-end">
                          <div className="min-w-0 max-w-full text-right">
                            <div className="inline-block max-w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 shadow-[var(--shadow-sm)]">
                              {m.content.trim() ? (
                                <div className="whitespace-pre-wrap break-words text-sm text-slate-800">{m.content}</div>
                              ) : null}
                              {m.attachments?.length ? (
                                <div className={['mt-2 grid gap-2', m.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'].join(' ')}>
                                  {m.attachments.slice(0, 10).map((a) =>
                                    tauriRuntime ? (
                                      <img
                                        key={a.path}
                                        src={convertFileSrc(a.path)}
                                        alt={a.name}
                                        className="h-32 w-56 max-w-full rounded-xl border border-[color:var(--color-border)] object-cover bg-white"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div
                                        key={a.path}
                                        className="rounded-xl border border-[color:var(--color-border)] bg-[#f8fafc] px-3 py-2 text-xs text-slate-700"
                                      >
                                        {a.name}
                                      </div>
                                    ),
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {new Date(m.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        {runId ? (
                          <div className="ml-0 sm:ml-10">
                            <AgentLogView runId={runId} />
                            {showPending && !hasLog ? (
                              <div className="flex items-center gap-3 py-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                                <span className="text-sm text-slate-500 italic">Working…</span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollAreaViewport>
        <ScrollBar />
      </ScrollArea>

      {showScrollToBottom ? (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
          <button
            type="button"
            onClick={handleScrollToBottom}
            className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50"
            title="Scroll to bottom"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}

      {showCommitModal ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 p-6">
          <div className="w-full max-w-[460px] rounded-[20px] bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.2)]">
            <div className="mb-4 flex items-start justify-between">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-900">
                <IconCommit className="h-4 w-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowCommitModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <IconX className="h-4 w-4" />
              </button>
            </div>

            <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">Commit your changes</h2>

            <div className="mt-4 space-y-2.5 text-[13px] text-slate-900">
              <div className="flex items-center justify-between">
                <div className="font-medium">Branch</div>
                <div className="flex items-center gap-2 text-slate-800">
                  <IconBranch className="h-3.5 w-3.5 text-slate-500" />
                  <span>{commitBranch || '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="font-medium">Changes</div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500">{commitChangedFiles.toLocaleString()} files</span>
                  <span className="text-emerald-600">+{commitAdded.toLocaleString()}</span>
                  <span className="text-rose-500">-{commitRemoved.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => setIncludeUnstaged((v) => !v)}
                  className={[
                    'relative h-7 w-12 rounded-full transition',
                    includeUnstaged ? 'bg-blue-500' : 'bg-slate-200',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all',
                      includeUnstaged ? 'left-6' : 'left-1',
                    ].join(' ')}
                  />
                </button>
                <span className="text-slate-900">Include unstaged</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 text-[13px] font-medium text-slate-900">Commit message</div>
              <input
                value={commitMessageDraft}
                onChange={(e) => setCommitMessageDraft(e.target.value)}
                placeholder="Leave blank to autogenerate a commit message"
                className="h-11 w-full rounded-[12px] border border-slate-200 bg-white px-3 text-[13px] text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-300"
              />
            </div>

            <div className="mt-4">
              <div className="mb-1.5 text-[13px] font-medium text-slate-900">Next steps</div>
              <div className="overflow-hidden rounded-[12px] border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCommitAction('commit')}
                  className="flex w-full items-center justify-between border-b border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 text-[13px] text-slate-800">
                    <IconCommit className="h-3.5 w-3.5" />
                    <span>Commit</span>
                  </div>
                  {commitAction === 'commit' ? <IconCheck className="h-4 w-4 text-slate-800" /> : <span />}
                </button>
                <button
                  type="button"
                  onClick={() => setCommitAction('commit_and_push')}
                  className="flex w-full items-center justify-between border-b border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 text-[13px] text-slate-800">
                    <IconArrowUp className="h-3.5 w-3.5" />
                    <span>Commit and push</span>
                  </div>
                  {commitAction === 'commit_and_push' ? <IconCheck className="h-4 w-4 text-slate-800" /> : <span />}
                </button>
                <button
                  type="button"
                  disabled
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] text-slate-400"
                >
                  <div className="flex items-center gap-3">
                    <IconGithub className="h-3.5 w-3.5" />
                    <span>Commit and create PR</span>
                  </div>
                  <span />
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={isCommitting}
              onClick={() => void handleCommitContinue()}
              className={[
                'mt-4 h-10 w-full rounded-xl text-[14px] font-medium text-white transition',
                isCommitting ? 'cursor-not-allowed bg-slate-500' : 'bg-black hover:bg-slate-900',
              ].join(' ')}
            >
              {isCommitting ? 'Working...' : 'Continue'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
