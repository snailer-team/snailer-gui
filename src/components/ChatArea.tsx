import { useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from './ui/badge'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'
import { AgentLogView } from './AgentLogView'
import { ClarifyingQuestionsList } from './ClarifyingQuestions'
import { TypewriterTitle } from './TypewriterTitle'
import { useAppStore } from '../lib/store'
import type { ClarifyingQuestionData } from './ClarifyingQuestions'

export function ChatArea() {
  const {
    sessions,
    activeSessionId,
    currentRunStatus,
    daemon,
    mode,
    model,
    clarifyingQuestions,
    answerClarifyingQuestion,
  } = useAppStore()

  const session = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )

  // Get agentEvents from the active session
  const agentEvents = session?.agentEvents ?? []

  // Track if we should animate title (only for new sessions/prompts)
  const [animatingTitle, setAnimatingTitle] = useState<string | null>(null)
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
      const firstMessage = session.messages[0].content
      const title = firstMessage.length > 50 ? firstMessage.slice(0, 47) + '...' : firstMessage
      setAnimatingTitle(title)
    }

    lastSessionIdRef.current = session.id
    lastMessageCountRef.current = currentMessageCount
  }, [session?.id, session?.messages.length])

  const lastContent = session?.messages.at(-1)?.content ?? ''
  const lastMsg = session?.messages.at(-1) ?? null
  const bottomRef = useRef<HTMLDivElement>(null)
  const busy = currentRunStatus === 'running' || currentRunStatus === 'queued'
  const modeChoices = useMemo(
    () => [
      { label: 'Classic', token: 'classic' },
      { label: 'Team Orchestrator', token: 'team-orchestrator' },
    ],
    [],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages.length, lastContent, agentEvents.length, clarifyingQuestions.length])

  // Convert store clarifying questions to component format
  const clarifyingQuestionsData: ClarifyingQuestionData[] = clarifyingQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      description: o.description,
    })),
    allowMultiple: q.allowMultiple,
    allowCustom: q.allowCustom,
  }))

  // Format model name for display
  const modelDisplay = model?.replace('claude-', '').replace('-20', ' ').replace(/(\d)/, ' $1') || 'Opus 4.5'

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white/60 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-tight">{session ? session.name : 'Session'}</div>
          <div className="text-xs text-black/45">Streaming · Diff · Approvals · Logs</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-full border border-black/10 bg-white/70 p-1 shadow-sm sm:inline-flex">
            {modeChoices.map((m) => {
              const active = mode === m.token
              return (
                <button
                  key={m.token}
                  disabled={!daemon || busy}
                  onClick={() => {
                    void (async () => {
                      useAppStore.setState({ mode: m.token })
                      await daemon?.settingsSet({ mode: m.token })
                    })()
                  }}
                  className={[
                    'rounded-full px-2.5 py-1 text-xs font-medium transition',
                    active ? 'bg-black/5 text-gray-800' : 'text-gray-500 hover:bg-black/5',
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
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black/50" />
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

      <ScrollArea className="flex-1">
        <ScrollAreaViewport className="h-full">
          <div className="mx-auto w-full max-w-4xl px-6 py-6 space-y-4">
            {!session ? (
              <div className="rounded-2xl bg-white/70 p-6 shadow-sm">
                <div className="text-lg font-semibold tracking-tight">Snailer GUI</div>
                <div className="mt-1 text-sm text-[color:var(--color-text-secondary)]">
                  Select a session from the left or create a new one, then enter your request below.
                </div>
                <div className="mt-4 text-sm text-[color:var(--color-text-secondary)]">
                  Example: <span className="font-mono">"Find and fix the build error in this project"</span>
                </div>
              </div>
            ) : session.messages.length === 0 ? (
              <div className="rounded-2xl bg-white/70 p-6 shadow-sm text-sm text-[color:var(--color-text-secondary)]">
                No messages yet. Enter a prompt below.
              </div>
            ) : (
              <>
                {/* Animated session title - show on first message */}
                {animatingTitle && session.messages.length >= 1 && (
                  <div className="mb-6">
                    <div className="inline-block rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
                      <TypewriterTitle
                        text={animatingTitle}
                        speed={25}
                        className="text-base font-semibold text-gray-900"
                        onComplete={() => {
                          // Keep showing for a moment after complete
                          setTimeout(() => setAnimatingTitle(null), 2000)
                        }}
                      />
                    </div>
                    <div className="mt-1.5 text-xs text-gray-400">
                      Now · {modelDisplay}
                    </div>
                  </div>
                )}

                {/* Messages - only show user messages, agent activity is shown in AgentLogView */}
                {session.messages
                  .filter((m) => m.role === 'user')
                  .map((m) => (
                    <div key={m.id} className="flex gap-3 flex-row-reverse">
                      <div className="h-9 w-9 shrink-0 rounded-2xl shadow-sm grid place-items-center bg-white/80 border border-black/5">
                        <span className="text-xs font-semibold text-black/60">You</span>
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <div className="inline-block max-w-full rounded-2xl px-4 py-3 shadow-sm border border-black/5 bg-white border-gray-200">
                          <div className="whitespace-pre-wrap break-words text-sm text-gray-800">{m.content}</div>
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                          {new Date(m.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
              </>
            )}

            {/* Agent activity log - show when there are events */}
            {agentEvents.length > 0 && (
              <AgentLogView />
            )}

            {/* Clarifying Questions - show when there are questions */}
            {clarifyingQuestionsData.length > 0 && (
              <ClarifyingQuestionsList
                questions={clarifyingQuestionsData}
                onAnswer={(qId, selectedIds, customText) => {
                  void answerClarifyingQuestion(qId, selectedIds, customText)
                }}
              />
            )}

            {/* Loading indicator when waiting for first response */}
            {session && busy && lastMsg?.role === 'user' && agentEvents.length === 0 ? (
              <div className="flex items-center gap-3 py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                <span className="text-sm text-gray-500 italic">Thought for 2s</span>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </ScrollAreaViewport>
        <ScrollBar />
      </ScrollArea>
    </div>
  )
}
