import { useState } from 'react'
import { useAppStore } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

export function MeetingSessionPanel() {
  const sessions = useAppStore((s) => s.elonX.meetingSessions)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (sessions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl mb-3 opacity-30">🤝</div>
        <div className="text-sm font-medium text-black/50">No meetings yet</div>
        <div className="text-xs text-black/35 mt-1">Meetings are triggered for complex or strategic tasks</div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <ScrollAreaViewport className="h-full">
        <div className="p-2 space-y-2">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.id
            const consensusPct = Math.round(session.consensusLevel * 100)

            return (
              <div key={session.id} className="rounded-xl border border-black/10 bg-white/60 overflow-hidden">
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-black/5 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold text-black/60 shrink-0">
                      {session.participants.map((p) => p.toUpperCase()).join(', ')}
                    </span>
                    {session.status === 'running' && (
                      <span className="shrink-0 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold text-white animate-pulse">
                        LIVE
                      </span>
                    )}
                    {session.status === 'failed' && (
                      <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
                        FAILED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === 'completed' && (
                      <span className="text-[10px] text-black/40">{consensusPct}%</span>
                    )}
                    <span className="text-[11px] text-black/40">{isExpanded ? '▾' : '▸'}</span>
                  </div>
                </button>

                {/* Topic */}
                <div className="px-3 pb-1.5 overflow-hidden">
                  <div className="text-[10px] text-black/50 break-words">"{session.topic.slice(0, 100)}"</div>
                </div>

                {/* Expanded Transcript */}
                {isExpanded && (
                  <div className="border-t border-black/5 px-3 py-2 space-y-1.5 overflow-hidden">
                    {session.messages.map((msg, i) => (
                      <div key={i} className="text-[10px] break-words">
                        <span className="font-semibold text-violet-600">
                          {msg.agentId.toUpperCase()} (R{msg.roundNumber}):
                        </span>{' '}
                        <span className="text-black/60 break-words">{msg.content}</span>
                      </div>
                    ))}

                    {/* Decision Box */}
                    {session.decision && (
                      <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-50/50 px-3 py-2 overflow-hidden">
                        <div className="text-[9px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                          Decision
                        </div>
                        <div className="text-[10px] text-emerald-800 break-words">{session.decision}</div>
                        {session.consensusLevel > 0 && (
                          <div className="mt-1 text-[9px] text-emerald-600">
                            Consensus: {consensusPct}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollAreaViewport>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  )
}
