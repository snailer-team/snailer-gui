import { useMemo } from 'react'
import { useAppStore } from '../../lib/store'
import { AgentInputRequestCard } from './AgentInputRequestCard'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

export function AgentInputRequestTimeline() {
  const { elonX, agentSubmitInput, agentDismissInput } = useAppStore()
  const { agentInputRequests } = elonX

  const pendingRequests = useMemo(
    () => agentInputRequests.filter((r) => r.status === 'pending'),
    [agentInputRequests],
  )

  const recentRequests = useMemo(
    () => agentInputRequests.filter((r) => r.status !== 'pending').slice(0, 20),
    [agentInputRequests],
  )

  if (agentInputRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-4xl mb-3 opacity-30">📋</div>
        <div className="text-sm font-medium text-black/40">No input requests</div>
        <div className="text-xs text-black/30 mt-1">
          Agent input requests will appear here when agents need credentials or configuration
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <ScrollAreaViewport className="h-full">
        <div className="p-4 space-y-4">
          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Pending Requests
                </span>
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  {pendingRequests.length}
                </span>
              </div>
              <div className="space-y-2">
                {pendingRequests.map((r) => (
                  <AgentInputRequestCard
                    key={r.id}
                    request={r}
                    onSubmit={agentSubmitInput}
                    onDismiss={agentDismissInput}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent History */}
          {recentRequests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">
                  Recent History
                </span>
              </div>
              <div className="space-y-2">
                {recentRequests.map((r) => (
                  <AgentInputRequestCard
                    key={r.id}
                    request={r}
                    onSubmit={agentSubmitInput}
                    onDismiss={agentDismissInput}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollAreaViewport>
      <ScrollBar />
    </ScrollArea>
  )
}
