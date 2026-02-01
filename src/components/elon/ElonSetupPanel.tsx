import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAppStore } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

type GhAuthStatus = 'ok' | 'not_logged_in' | 'unknown'

type GhCliStatus = {
  installed: boolean
  version?: string | null
  auth: GhAuthStatus
  authOutput?: string | null
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700' : 'border-red-500/20 bg-red-500/10 text-red-700',
      ].join(' ')}
    >
      {ok ? '✓' : '✗'} {label}
    </span>
  )
}

function CodeLine({ children }: { children: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-[11px] font-mono text-black/70">
      {children}
    </div>
  )
}

export function ElonSetupPanelContent() {
  const { projectPath } = useAppStore()
  const [status, setStatus] = useState<GhCliStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = (await invoke('github_cli_status', { cwd: projectPath })) as GhCliStatus
      setStatus(res)
    } catch (e) {
      setStatus(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [projectPath])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const ghInstalled = Boolean(status?.installed)
  const ghAuthed = status?.auth === 'ok'

  const nextStep = useMemo(() => {
    if (!status) return 'Check status'
    if (!status.installed) return 'Install GitHub CLI (gh)'
    if (status.auth !== 'ok') return 'Login with gh'
    return 'Ready'
  }, [status])

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-black/5">
        <div className="flex items-center gap-2">
          <span className="text-xs">🐙</span>
          <span className="text-[11px] font-semibold text-black/70">Setup</span>
          <span className="text-[10px] text-black/40">GitHub (gh) status</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-black/40">{nextStep}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 text-[10px] font-semibold text-black/60 hover:bg-white transition disabled:opacity-50"
            disabled={loading}
            title="Re-check gh status"
          >
            {loading ? 'Checking…' : 'Re-check'}
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          <div className="p-3 space-y-3">
            {/* Status */}
            <div className="rounded-xl border border-black/10 bg-white/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-black/70">GitHub CLI</div>
                <div className="flex items-center gap-2">
                  <Pill ok={ghInstalled} label="gh installed" />
                  <Pill ok={ghAuthed} label="authenticated" />
                </div>
              </div>

              <div className="mt-2 text-[10px] text-black/50">
                Project cwd: <span className="font-mono">{projectPath || '-'}</span>
              </div>

              {status?.version ? (
                <div className="mt-2 text-[10px] text-black/50">
                  gh version: <span className="font-mono text-black/70">{status.version}</span>
                </div>
              ) : null}

              {error ? (
                <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            {/* Guide */}
            {!ghInstalled ? (
              <div className="rounded-xl border border-black/10 bg-white/60 p-3">
                <div className="text-[11px] font-semibold text-black/70 mb-2">Install (macOS)</div>
                <div className="space-y-2">
                  <CodeLine>brew install gh</CodeLine>
                  <div className="text-[10px] text-black/50">
                    After install, click <span className="font-semibold">Re-check</span>.
                  </div>
                </div>
              </div>
            ) : !ghAuthed ? (
              <div className="rounded-xl border border-black/10 bg-white/60 p-3">
                <div className="text-[11px] font-semibold text-black/70 mb-2">Login (one-time)</div>
                <div className="space-y-2">
                  <CodeLine>gh auth login</CodeLine>
                  <div className="text-[10px] text-black/50">
                    This opens a browser for auth. We do not store your token; `gh` manages it.
                  </div>
                  {status?.authOutput ? (
                    <div className="mt-2 rounded-lg border border-black/10 bg-black/5 p-2 text-[10px] font-mono text-black/60 whitespace-pre-wrap">
                      {status.authOutput}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <div className="text-[11px] font-semibold text-emerald-800">Ready</div>
                <div className="mt-1 text-[10px] text-emerald-700">
                  GitHub read actions can run automatically via `gh` (PR/Issue/CI). Write actions require approval.
                </div>
              </div>
            )}

            {/* What we use */}
            <div className="rounded-xl border border-black/10 bg-white/60 p-3">
              <div className="text-[11px] font-semibold text-black/70 mb-2">Commands used (read)</div>
              <div className="space-y-1.5">
                <CodeLine>gh pr list --state open --limit 20</CodeLine>
                <CodeLine>gh issue list --state open --limit 20</CodeLine>
                <CodeLine>gh pr checks &lt;PR_NUMBER&gt;</CodeLine>
              </div>
              <div className="mt-2 text-[10px] text-black/50">
                If you need repo context, ensure you opened a GitHub repo folder and the remote is set.
              </div>
            </div>
          </div>
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  )
}

