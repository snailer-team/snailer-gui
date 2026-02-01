import { useState } from 'react'
import { ElonOrgPanelContent } from './ElonOrgPanelContent'
import { ElonPerformancePanelContent } from './ElonPerformancePanelContent'

export function ElonLeftPanel() {
  const [activeTab, setActiveTab] = useState<'org' | 'performance'>('org')

  return (
    <div className="h-full flex flex-col rounded-2xl border border-black/10 bg-white/50 overflow-hidden">
      {/* Tab Header */}
      <div className="shrink-0 flex items-center border-b border-black/5 px-2 pt-2">
        <button
          type="button"
          onClick={() => setActiveTab('org')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'org'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>🏢</span>
          Org
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('performance')}
          className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold rounded-t-lg border-b-2 transition ${
            activeTab === 'performance'
              ? 'border-black/40 text-black/80 bg-white/50'
              : 'border-transparent text-black/40 hover:text-black/60'
          }`}
        >
          <span>📊</span>
          Performance
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'org' ? (
          <ElonOrgPanelContent />
        ) : (
          <ElonPerformancePanelContent />
        )}
      </div>
    </div>
  )
}
