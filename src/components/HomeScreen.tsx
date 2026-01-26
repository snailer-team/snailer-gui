import { useMemo, useState, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../lib/store'
import { IconFolder, IconChevronDown, IconSend } from './icons'
import { Button } from './ui/button'

// Pixel Art Snail Mascot
function Mascot() {
  return (
    <div className="flex justify-center">
      <svg width="80" height="80" viewBox="0 0 32 32" fill="none" style={{ imageRendering: 'pixelated' }}>
        {/* Shell - Pastel colors */}
        <rect x="16" y="4" width="2" height="2" fill="#A7C7E7" />
        <rect x="18" y="4" width="2" height="2" fill="#A7C7E7" />
        <rect x="20" y="4" width="2" height="2" fill="#A7C7E7" />
        <rect x="14" y="6" width="2" height="2" fill="#A7C7E7" />
        <rect x="16" y="6" width="2" height="2" fill="#B2D8B2" />
        <rect x="18" y="6" width="2" height="2" fill="#B2D8B2" />
        <rect x="20" y="6" width="2" height="2" fill="#B2D8B2" />
        <rect x="22" y="6" width="2" height="2" fill="#A7C7E7" />
        <rect x="12" y="8" width="2" height="2" fill="#A7C7E7" />
        <rect x="14" y="8" width="2" height="2" fill="#B2D8B2" />
        <rect x="16" y="8" width="2" height="2" fill="#FFF3A3" />
        <rect x="18" y="8" width="2" height="2" fill="#FFF3A3" />
        <rect x="20" y="8" width="2" height="2" fill="#B2D8B2" />
        <rect x="22" y="8" width="2" height="2" fill="#B2D8B2" />
        <rect x="24" y="8" width="2" height="2" fill="#A7C7E7" />
        <rect x="12" y="10" width="2" height="2" fill="#A7C7E7" />
        <rect x="14" y="10" width="2" height="2" fill="#B2D8B2" />
        <rect x="16" y="10" width="2" height="2" fill="#FFF3A3" />
        <rect x="18" y="10" width="2" height="2" fill="#A7C7E7" />
        <rect x="20" y="10" width="2" height="2" fill="#B2D8B2" />
        <rect x="22" y="10" width="2" height="2" fill="#B2D8B2" />
        <rect x="24" y="10" width="2" height="2" fill="#A7C7E7" />
        <rect x="14" y="12" width="2" height="2" fill="#A7C7E7" />
        <rect x="16" y="12" width="2" height="2" fill="#B2D8B2" />
        <rect x="18" y="12" width="2" height="2" fill="#B2D8B2" />
        <rect x="20" y="12" width="2" height="2" fill="#B2D8B2" />
        <rect x="22" y="12" width="2" height="2" fill="#A7C7E7" />
        <rect x="16" y="14" width="2" height="2" fill="#A7C7E7" />
        <rect x="18" y="14" width="2" height="2" fill="#A7C7E7" />
        <rect x="20" y="14" width="2" height="2" fill="#A7C7E7" />

        {/* Body - Pink */}
        <rect x="4" y="12" width="2" height="2" fill="#F8C8DC" />
        <rect x="6" y="12" width="2" height="2" fill="#F8C8DC" />
        <rect x="4" y="14" width="2" height="2" fill="#F8C8DC" />
        <rect x="6" y="14" width="2" height="2" fill="#FDE7EF" />
        <rect x="8" y="14" width="2" height="2" fill="#FDE7EF" />
        <rect x="10" y="14" width="2" height="2" fill="#FDE7EF" />
        <rect x="12" y="14" width="2" height="2" fill="#F8C8DC" />
        <rect x="4" y="16" width="2" height="2" fill="#F8C8DC" />
        <rect x="6" y="16" width="2" height="2" fill="#FDE7EF" />
        <rect x="8" y="16" width="2" height="2" fill="#FDE7EF" />
        <rect x="10" y="16" width="2" height="2" fill="#FDE7EF" />
        <rect x="12" y="16" width="2" height="2" fill="#F8C8DC" />
        <rect x="6" y="18" width="2" height="2" fill="#F8C8DC" />
        <rect x="8" y="18" width="2" height="2" fill="#F8C8DC" />
        <rect x="10" y="18" width="2" height="2" fill="#F8C8DC" />
        <rect x="12" y="18" width="2" height="2" fill="#F8C8DC" />

        {/* Eyes */}
        <rect x="5" y="13" width="1" height="1" fill="#1F2937" />
        <rect x="7" y="13" width="1" height="1" fill="#1F2937" />

        {/* Antenna */}
        <rect x="4" y="10" width="1" height="2" fill="#F8C8DC" />
        <rect x="7" y="10" width="1" height="2" fill="#F8C8DC" />
        <rect x="3" y="9" width="2" height="1" fill="#FFF3A3" />
        <rect x="6" y="9" width="2" height="1" fill="#FFF3A3" />
      </svg>
    </div>
  )
}

function baseName(p: string) {
  const cleaned = (p || '').replace(/\/$/, '')
  const parts = cleaned.split('/')
  return parts[parts.length - 1] || cleaned || 'Select folder'
}

function SuggestionCard({ title, tag, onClick }: { title: string; tag: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-2xl border border-black/5 bg-white p-4 text-left transition-all hover:border-black/10 hover:shadow-md"
    >
      <div className="text-[15px] font-medium text-gray-800">{title}</div>
      <div className="mt-2">
        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
          {tag}
        </span>
      </div>
    </button>
  )
}

export function HomeScreen() {
  const {
    daemon,
    projectPath,
    projectPathDraft,
    setProjectPathDraft,
    setProjectPath,
    model,
    mode,
    modelItems,
    draftPrompt,
    setDraftPrompt,
    sendPrompt,
    currentRunStatus,
    appendToDraftPrompt,
  } = useAppStore()

  const [showPathInput, setShowPathInput] = useState(false)
  const pathInputRef = useRef<HTMLInputElement>(null)

  const busy = currentRunStatus === 'running' || currentRunStatus === 'queued' || currentRunStatus === 'awaiting_approval'
  const folderLabel = useMemo(() => baseName(projectPath), [projectPath])
  const models = modelItems.length ? modelItems : [{ label: model, token: model, desc: '' }]
  const modeChoices = useMemo(
    () => [
      { label: 'Classic', token: 'classic' },
      { label: 'Team Orchestrator', token: 'team-orchestrator' },
    ],
    [],
  )

  const handleSubmit = () => {
    const prompt = draftPrompt.trim()
    if (!prompt || busy) return
    setDraftPrompt('')
    void sendPrompt(prompt)
  }

  const handleFolderClick = async () => {
    // Try to open native folder picker via Tauri
    try {
      const result = await invoke<string | null>('pick_folder')
      if (result) {
        setProjectPathDraft(result)
        void setProjectPath(result)
        return
      }
    } catch {
      // Fallback to showing path input
    }
    // Show path input if native picker not available
    setShowPathInput(true)
    setProjectPathDraft(projectPath)
    setTimeout(() => pathInputRef.current?.focus(), 100)
  }

  const handleApplyPath = () => {
    if (projectPathDraft.trim()) {
      void setProjectPath(projectPathDraft.trim())
      setShowPathInput(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header Mode Toggle */}
      <div className="px-8 pt-6">
        <div className="inline-flex items-center rounded-full border border-black/10 bg-white p-1 shadow-sm">
          {modeChoices.map((m) => {
            const active = mode === m.token
            return (
              <button
                key={m.token}
                disabled={!daemon || busy}
                onClick={async () => {
                  useAppStore.setState({ mode: m.token })
                  await daemon?.settingsSet({ mode: m.token })
                }}
                className={[
                  'rounded-full px-3 py-1.5 text-sm font-medium transition',
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
      </div>

      {/* Main Content - Centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-8">
        <div className="w-full max-w-2xl">
          {/* Mascot */}
          <div className="mb-8">
            <Mascot />
          </div>

          {/* Main Card */}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-lg">
            {/* Top Row - Folder & Environment */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                className="flex items-center gap-2 rounded-full border border-black/10 bg-gray-50 px-4 py-2 text-sm font-medium transition hover:bg-gray-100"
                onClick={handleFolderClick}
                title={projectPath || 'Select folder'}
              >
                <IconFolder className="h-4 w-4 text-gray-500" />
                <span className="max-w-[180px] truncate">{folderLabel}</span>
                <IconChevronDown className="h-3 w-3 text-gray-400" />
              </button>

              <div className="flex items-center gap-2 rounded-full border border-black/10 bg-gray-50 px-4 py-2 text-sm">
                <span className="text-gray-500">Environment</span>
                <span className="font-medium text-gray-800">Local</span>
              </div>

              <div className="ml-auto">
                <select
                  value={model}
                  onChange={async (e) => {
                    const next = e.target.value
                    useAppStore.setState({ model: next })
                    await daemon?.settingsSet({ model: next })
                  }}
                  className="rounded-full border border-black/10 bg-gray-50 px-4 py-2 text-sm font-medium outline-none transition hover:bg-gray-100"
                >
                  {models.map((m) => (
                    <option key={m.token} value={m.token}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={draftPrompt}
                disabled={busy}
                onChange={(e) => setDraftPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                placeholder="Find and fix TODOs in the codebase..."
                className="min-h-[140px] w-full resize-none rounded-2xl border border-black/10 bg-gray-50 px-5 py-4 text-[15px] leading-relaxed outline-none transition placeholder:text-gray-400 focus:border-pastelBlue focus:bg-white focus:ring-2 focus:ring-pastelBlue/30"
              />
              <div className="absolute bottom-4 right-4">
                <Button
                  variant="primary"
                  size="icon"
                  disabled={busy || !draftPrompt.trim()}
                  onClick={handleSubmit}
                  className="h-10 w-10 rounded-xl bg-pastelBlue hover:bg-pastelBlue/80"
                  title="Send (Enter)"
                >
                  <IconSend className="h-5 w-5 text-gray-700" />
                </Button>
              </div>
            </div>

            {/* Path Input - shown when folder button clicked */}
            {showPathInput && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  ref={pathInputRef}
                  value={projectPathDraft}
                  onChange={(e) => setProjectPathDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleApplyPath()
                    }
                    if (e.key === 'Escape') {
                      setShowPathInput(false)
                    }
                  }}
                  placeholder="/path/to/project"
                  className="flex-1 rounded-xl border border-black/10 bg-gray-50 px-4 py-2.5 font-mono text-sm outline-none transition placeholder:text-gray-400 focus:border-pastelBlue focus:ring-2 focus:ring-pastelBlue/30"
                />
                <Button
                  variant="default"
                  onClick={handleApplyPath}
                  disabled={!daemon || !projectPathDraft.trim()}
                  className="rounded-xl px-4"
                >
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowPathInput(false)}
                  className="rounded-xl px-3"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Status */}
            <div className="mt-3 text-center text-xs text-gray-400">
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/15 border-t-black/40" />
                  <span className="inline-flex items-center gap-1">
                    <span>Running</span>
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/25"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/25"
                        style={{ animationDelay: '120ms' }}
                      />
                      <span
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/25"
                        style={{ animationDelay: '240ms' }}
                      />
                    </span>
                  </span>
                </span>
              ) : daemon ? (
                'Ready'
              ) : (
                'Disconnected'
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            <SuggestionCard
              title="Create/Update CLAUDE.md"
              tag="CLAUDE.md"
              onClick={() => appendToDraftPrompt('Create or update my CLAUDE.md file.\n')}
            />
            <SuggestionCard
              title="Find and Fix TODOs"
              tag="TODO"
              onClick={() => appendToDraftPrompt('Search for a TODO comment and fix it.\n')}
            />
            <SuggestionCard
              title="Improve Tests"
              tag="tests"
              onClick={() => appendToDraftPrompt('Recommend areas to improve our tests.\n')}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 pb-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-black/5 bg-white/60 px-4 py-3 text-center text-xs text-gray-500">
            Snailer can read, modify, and execute files in this folder. Use only with trusted folders.
          </div>
        </div>
      </div>
    </div>
  )
}
