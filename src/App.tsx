import { useEffect, useMemo } from 'react'
import { Toaster, toast } from 'sonner'

import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { InputBar } from './components/InputBar'
import { ApprovalBar } from './components/ApprovalBar'
import { RightPanel } from './components/RightPanel'
import { CommandPalette } from './components/CommandPalette'
import { HomeScreen } from './components/HomeScreen'
import { PromptStageWizard } from './components/PromptStageWizard'
import { ClarifyingPromptPanel } from './components/ClarifyingPromptPanel'
import { SettingsView } from './components/SettingsView'
import { ElonLayout } from './components/elon'
import { useAppStore } from './lib/store'

export default function App() {
  const {
    connect,
    connectionStatus,
    error,
    clearError,
    lastToast,
    viewMode,
    sessions,
    activeSessionId,
    mode,
    promptStageWizard,
    clarifyingQuestions,
    pendingApprovals,
  } = useAppStore()
  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )
  const isSettingsView = viewMode !== 'chat'
  const isElonMode = mode === 'elon'
  const showHome =
    viewMode === 'chat' &&
    !isElonMode &&
    (!activeSession || activeSession.messages.length === 0) &&
    !promptStageWizard &&
    clarifyingQuestions.length === 0 &&
    pendingApprovals.length === 0
  const isOrchestratorMode = mode.toLowerCase().includes('orchestrator') || mode.toLowerCase().includes('team')
  const showSplitRightPanel = viewMode === 'chat' && isOrchestratorMode && !isElonMode

  // Auto-connect on mount
  useEffect(() => {
    const hasTauri =
      typeof window !== 'undefined' &&
      Boolean((window as unknown as { __TAURI_INTERNALS__?: { invoke?: unknown } }).__TAURI_INTERNALS__?.invoke)
    if (!hasTauri) return
    if (connectionStatus === 'disconnected') {
      console.log('[App] Auto-connecting to daemon...')
      void connect()
    }
  }, [connect, connectionStatus])

  useEffect(() => {
    if (!lastToast) return
    toast(lastToast.title, { description: lastToast.message })
  }, [lastToast])

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#FAF9F6]">
      <Toaster position="top-right" richColors />
      <CommandPalette />

      {error && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div className="rounded-2xl border border-red-200 bg-white px-5 py-3 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-semibold text-red-600">오류: </span>
                <span className="text-gray-600">{error}</span>
              </div>
              <button
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
                onClick={clearError}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-[300px] flex-shrink-0 border-r border-black/5 bg-[#F5F3EE]">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex">
          {isSettingsView ? (
            <div className="h-full w-full overflow-hidden">
              <SettingsView />
            </div>
          ) : isElonMode ? (
            <div className="h-full w-full overflow-hidden bg-[#FAF9F6]">
              <ElonLayout />
            </div>
          ) : (
            <>
              <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
                {showHome ? (
                  <HomeScreen />
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-hidden">
                      <ChatArea />
                    </div>
                    <div className="flex-shrink-0 border-t border-black/5 bg-white/50">
                      <ApprovalBar />
                      <div className="px-4 pt-4">
                        <PromptStageWizard />
                      </div>
                      <div className="px-4 pt-4">
                        <ClarifyingPromptPanel />
                      </div>
                      <div className="p-4">
                        <InputBar />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {showSplitRightPanel ? (
                <div className="h-full w-[420px] flex-shrink-0 border-l border-black/5 bg-white/30 p-4">
                  <RightPanel />
                </div>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
