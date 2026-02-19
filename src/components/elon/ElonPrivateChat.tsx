import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppStore } from '../../lib/store'

type PrivateChatMessage = {
  id: string
  role: 'user' | 'system'
  content: string
}

function formatRunStatus(status: string): string {
  if (status === 'running') return 'running'
  if (status === 'cooldown') return 'cooldown'
  if (status === 'paused') return 'paused'
  return 'idle'
}

function deriveLoaLevel(autonomyRate: number): 'L3' | 'L4' | 'L5' {
  if (autonomyRate >= 90) return 'L5'
  if (autonomyRate >= 70) return 'L4'
  return 'L3'
}

export function ElonPrivateChat() {
  const { elonX, projectPath } = useAppStore()
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<PrivateChatMessage[]>([
    {
      id: 'welcome',
      role: 'system',
      content: 'Private status chat is local-only. Ask: status, agents, cost, broadcasts, last cycle.',
    },
  ])

  const activeAgents = useMemo(
    () => Object.entries(elonX.agentStatuses).filter(([, s]) => s.status !== 'idle'),
    [elonX.agentStatuses],
  )
  const activeBroadcasts = useMemo(
    () => elonX.broadcasts.filter((b) => b.status === 'active').length,
    [elonX.broadcasts],
  )

  const buildReply = (input: string): string => {
    const text = input.toLowerCase()
    const lastRun = elonX.cycleRuns[0]
    const autoStatus = formatRunStatus(elonX.autoCycle.status)
    const loa = deriveLoaLevel(elonX.metrics.autonomyRate)

    if (/(status|상태|health)/.test(text)) {
      return [
        `System status: ${autoStatus}`,
        `Auto loop: ${elonX.autoCycle.enabled ? 'enabled' : 'disabled'}`,
        `Autonomy: ${loa} (${Math.round(elonX.metrics.autonomyRate)}%)`,
        `Active agents: ${activeAgents.length}`,
        `Active broadcasts: ${activeBroadcasts}`,
        `Project: ${projectPath || 'not selected'}`,
      ].join('\n')
    }

    if (/(agent|에이전트)/.test(text)) {
      if (activeAgents.length === 0) return 'No active agents right now.'
      const lines = activeAgents
        .slice(0, 8)
        .map(([id, s]) => `- ${id}: ${s.status}${s.currentTask ? ` (${s.currentTask.slice(0, 60)})` : ''}`)
      return `Active agent snapshot:\n${lines.join('\n')}`
    }

    if (/(cost|token|비용|토큰)/.test(text)) {
      return [
        `Estimated cost: $${elonX.metrics.estimatedCost.toFixed(4)}`,
        `Input tokens: ${elonX.metrics.totalInputTokens.toLocaleString()}`,
        `Output tokens: ${elonX.metrics.totalOutputTokens.toLocaleString()}`,
      ].join('\n')
    }

    if (/(broadcast|브로드캐스트|directive|지시)/.test(text)) {
      return `Broadcast status: active ${activeBroadcasts}, total ${elonX.broadcasts.length}.`
    }

    if (/(last|최근|cycle|실행)/.test(text)) {
      if (!lastRun) return 'No cycle history yet.'
      return [
        `Last cycle: ${lastRun.id.slice(0, 8)}`,
        `Status: ${lastRun.status}`,
        `Broadcasts: ${lastRun.broadcastIds.length}`,
        `Evidence: ${lastRun.evidenceIds.length}`,
      ].join('\n')
    }

    return 'Use a status query: status, agents, cost, broadcasts, last cycle.'
  }

  const send = (e: FormEvent) => {
    e.preventDefault()
    const input = draft.trim()
    if (!input) return

    const userMsg: PrivateChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    }
    const systemMsg: PrivateChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content: buildReply(input),
    }

    setMessages((prev) => [...prev, userMsg, systemMsg].slice(-20))
    setDraft('')
  }

  return (
    <div className="h-full min-h-0 rounded-2xl border border-black/10 bg-white/90 p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-800">Private Status Chat</div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
          local only
        </span>
      </div>

      <div className="mb-3 h-[calc(100%-92px)] overflow-y-auto rounded-xl border border-black/10 bg-slate-50 p-2">
        <div className="space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={[
                'rounded-lg px-2.5 py-2 text-xs leading-relaxed whitespace-pre-wrap',
                m.role === 'user'
                  ? 'ml-8 border border-blue-200 bg-blue-50 text-blue-800'
                  : 'mr-8 border border-slate-200 bg-white text-slate-700',
              ].join(' ')}
            >
              {m.content}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={send} className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask system status..."
          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-300"
        />
        <button
          type="submit"
          className="rounded-xl border border-black/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black"
        >
          Send
        </button>
      </form>
    </div>
  )
}
