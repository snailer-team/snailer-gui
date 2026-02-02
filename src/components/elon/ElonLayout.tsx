import { useState } from 'react'
import { useAppStore } from '../../lib/store'
import { useAutoCycleScheduler } from '../../hooks/useAutoCycleScheduler'
import { AutoCycleControl } from './AutoCycleControl'
import { ElonGoalBar } from './ElonGoalBar'
import { ElonLeftPanel } from './ElonLeftPanel'
import { ElonPlanTree } from './ElonPlanTree'
import { ElonRightPanel } from './ElonRightPanel'
import { ElonStatusBar } from './ElonStatusBar'
import { ElonWorkflowPanel } from './ElonWorkflowPanel'
import { AgentInputNotificationBar } from './AgentInputNotificationBar'

export function ElonLayout() {
  const { elonX } = useAppStore()
  const hasPlan = elonX.planTree !== null
  const hasBroadcasts = elonX.broadcasts.length > 0
  const [centerTab, setCenterTab] = useState<'plan' | 'workflows'>(() => (hasPlan ? 'plan' : 'workflows'))

  // Initialize auto-cycle scheduler
  useAutoCycleScheduler()

  return (
    <div className="h-full flex flex-col gap-3 p-3">
      {/* Header: Goal Bar */}
      <div className="shrink-0">
        <ElonGoalBar />
      </div>

      {/* Auto-Cycle Control */}
      <div className="shrink-0">
        <AutoCycleControl />
      </div>

      {/* Main Content: 3-Column Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-[320px_1fr_320px] gap-3">
        {/* Left: Org + Performance Panel */}
        <div className="min-h-0">
          <ElonLeftPanel />
        </div>

        {/* Center: Plan Tree / Workflows */}
        <div className="min-h-0 flex flex-col gap-2">
          <div className="shrink-0 flex items-center justify-between px-1">
            <div className="inline-flex rounded-xl border border-black/10 bg-white/60 p-1">
              <button
                type="button"
                onClick={() => setCenterTab('plan')}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                  centerTab === 'plan'
                    ? 'bg-white text-black/75 shadow-sm border border-black/10'
                    : 'text-black/40 hover:text-black/60'
                }`}
              >
                📌 Plan Tree
              </button>
              <button
                type="button"
                onClick={() => setCenterTab('workflows')}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                  centerTab === 'workflows'
                    ? 'bg-white text-black/75 shadow-sm border border-black/10'
                    : 'text-black/40 hover:text-black/60'
                }`}
              >
                🔄 Live Workflows
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            {centerTab === 'workflows' ? (
              <ElonWorkflowPanel />
            ) : !hasPlan ? (
              <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-black/10 bg-white/50 p-6">
                <div className="text-4xl mb-4 opacity-30">🚀</div>
                <div className="text-lg font-semibold text-black/60 mb-2">ElonX HARD Mode</div>
                <div className="text-sm text-black/40 mb-4 text-center max-w-sm">
                  AI 소프트웨어 회사 운영체제
                </div>
                <div className="text-xs text-black/50 text-center max-w-md space-y-2">
                  <p><strong>1.</strong> 위 Goal Bar에 목표를 입력하고 Execute</p>
                  <p><strong>2.</strong> 또는 Auto-Cycle을 켜서 CEO가 자동으로 판단</p>
                  {hasBroadcasts && (
                    <p className="text-emerald-600">
                      ✓ {elonX.broadcasts.filter(b => b.status === 'active').length}개의 활성 브로드캐스트가 있습니다
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <ElonPlanTree />
            )}
          </div>
        </div>

        {/* Right: Evidence + Culture Panel */}
        <div className="min-h-0">
          <ElonRightPanel />
        </div>
      </div>

      {/* Agent Input Notification Bar */}
      <AgentInputNotificationBar />

      {/* Footer: Status Bar */}
      <div className="shrink-0">
        <ElonStatusBar />
      </div>
    </div>
  )
}

// Export all components for easier imports
export { AutoCycleControl } from './AutoCycleControl'
export { BroadcastTimeline } from './BroadcastTimeline'
export { ElonGoalBar } from './ElonGoalBar'
export { ElonLeftPanel } from './ElonLeftPanel'
export { ElonOrgPanelEnhanced } from './ElonOrgPanelEnhanced'
export { ElonOrgPanelContent } from './ElonOrgPanelContent'
export { ElonPerformancePanel } from './ElonPerformancePanel'
export { ElonPerformancePanelContent } from './ElonPerformancePanelContent'
export { ElonPlanTree } from './ElonPlanTree'
export { ElonEvidencePanel } from './ElonEvidencePanel'
export { ElonRightPanel } from './ElonRightPanel'
export { ElonCulturePanel } from './ElonCulturePanel'
export { ElonStatusBar } from './ElonStatusBar'
export { ElonWorkflowPanel } from './ElonWorkflowPanel'
export { AgentInputNotificationBar } from './AgentInputNotificationBar'
export { AgentInputRequestTimeline } from './AgentInputRequestTimeline'
export { SelfCorrectionPanel } from './SelfCorrectionPanel'
export { KnowledgeBasePanel } from './KnowledgeBasePanel'
export { MeetingSessionPanel } from './MeetingSessionPanel'
