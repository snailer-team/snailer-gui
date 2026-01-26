import { useMemo } from 'react'

import { Button } from './ui/button'
import { useAppStore } from '../lib/store'
import { IconChevronDown, IconFolder, IconSend } from './icons'

function baseName(p: string) {
  const cleaned = (p || '').replace(/\/$/, '')
  const parts = cleaned.split('/')
  return parts[parts.length - 1] || cleaned || 'Select folder'
}

export function Composer() {
  const {
    daemon,
    projectPath,
    projectPathDraft,
    setProjectPathDraft,
    setProjectPath,
    model,
    modelItems,
    draftPrompt,
    setDraftPrompt,
    sendPrompt,
    currentRunStatus,
  } = useAppStore()

  const busy = currentRunStatus === 'running' || currentRunStatus === 'queued' || currentRunStatus === 'awaiting_approval'

  const folderLabel = useMemo(() => baseName(projectPath), [projectPath])
  const models = modelItems.length ? modelItems : [{ label: model, token: model, desc: '' }]

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="snailer-card rounded-[22px] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="snailer-pill flex items-center gap-2 rounded-2xl px-3 py-2 text-sm"
            onClick={() => {
              // For now, focus the sidebar workspace input by putting cursor into draft.
              setProjectPathDraft(projectPathDraft || projectPath)
            }}
            title={projectPath}
          >
            <IconFolder className="h-5 w-5 text-black/60" />
            <span className="max-w-[220px] truncate font-medium">{folderLabel}</span>
            <IconChevronDown className="h-4 w-4 text-black/50" />
          </button>

          <div className="snailer-pill flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
            <span className="text-black/60">Environment</span>
            <span className="font-medium">Local</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={model}
              onChange={async (e) => {
                const next = e.target.value
                useAppStore.setState({ model: next })
                await daemon?.settingsSet({ model: next })
              }}
              className="snailer-pill rounded-2xl px-3 py-2 text-sm font-medium outline-none"
            >
              {models.map((m) => (
                <option key={m.token} value={m.token}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-3">
          <textarea
            value={draftPrompt}
            disabled={busy}
            onChange={(e) => setDraftPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (busy) return
                const prompt = draftPrompt.trim()
                if (!prompt) return
                setDraftPrompt('')
                void sendPrompt(prompt)
              }
            }}
            placeholder="예: 코드베이스에서 작은 TODO를 찾아서 처리해줘"
            className="min-h-[120px] w-full resize-none rounded-2xl border border-black/10 bg-white/70 px-4 py-4 text-[15px] leading-6 outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
          />

          <div className="flex flex-col items-end justify-between">
            <Button
              variant="primary"
              size="icon"
              disabled={busy || !draftPrompt.trim()}
              onClick={() => {
                const prompt = draftPrompt.trim()
                if (!prompt) return
                setDraftPrompt('')
                void sendPrompt(prompt)
              }}
              className="h-12 w-12 rounded-2xl shadow-sm"
              title="Run"
            >
              <IconSend className="h-6 w-6" />
            </Button>

            <div className="text-xs text-black/45">
              {busy ? 'Running…' : daemon ? 'Ready' : 'Disconnected'}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={projectPathDraft}
            onChange={(e) => setProjectPathDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void setProjectPath(projectPathDraft)
              }
            }}
            placeholder="/path/to/project"
            className="snailer-pill w-full rounded-2xl px-3 py-2 text-xs font-mono text-black/70 outline-none"
          />
          <Button size="sm" onClick={() => void setProjectPath(projectPathDraft)} disabled={!daemon}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
