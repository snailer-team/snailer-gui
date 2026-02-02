import { useMemo } from 'react'
import { useAppStore } from '../../lib/store'
import { AgentInputRequestCard } from './AgentInputRequestCard'

export function AgentInputNotificationBar() {
  const { elonX, agentSubmitInput, agentDismissInput } = useAppStore()

  const pendingRequests = useMemo(
    () => elonX.agentInputRequests.filter((r) => r.status === 'pending'),
    [elonX.agentInputRequests],
  )

  if (pendingRequests.length === 0) return null

  const latest = pendingRequests[0]
  const remaining = pendingRequests.length - 1

  return (
    <div className="shrink-0 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <AgentInputRequestCard
          request={latest}
          onSubmit={agentSubmitInput}
          onDismiss={agentDismissInput}
          compact
        />
      </div>
      {remaining > 0 && (
        <span className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          +{remaining}
        </span>
      )}
    </div>
  )
}
