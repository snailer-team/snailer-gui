import { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

import { useAppStore } from '../lib/store'
import { Button } from './ui/button'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'

type AccountGetResult = {
  email?: string
  hasAccountToken?: boolean
  planName?: string
  status?: string | null
  usageUsed?: number | null
  usageLimit?: number | null
  period?: string | null
  isStarter?: boolean
  isPremium?: boolean
  planError?: string
}

type EnvStatus = {
  exists: boolean
  keysPresent: Set<string>
}

type Provider = {
  id: string
  label: string
  envVar: string
  placeholder?: string
  helper?: string
}

const PROVIDERS: Provider[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    envVar: 'CLAUDE_API_KEY',
    placeholder: 'sk-ant-…',
    helper: 'Claude models (Explorer/Backend/etc depending on preset)',
  },
  { id: 'openai', label: 'OpenAI (GPT)', envVar: 'OPENAI_API_KEY', placeholder: 'sk-…' },
  { id: 'google', label: 'Google (Gemini)', envVar: 'GOOGLE_API_KEY' },
  { id: 'xai', label: 'xAI (Grok)', envVar: 'XAI_API_KEY' },
  { id: 'minimax', label: 'MiniMax', envVar: 'MINIMAX_API_KEY' },
  { id: 'kimi', label: 'Kimi (Moonshot)', envVar: 'KIMI_API_KEY' },
]

function clamp01(x: number) {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function parseDotenvKeys(text: string): Set<string> {
  const out = new Set<string>()
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const afterExport = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
    const eq = afterExport.indexOf('=')
    if (eq <= 0) continue
    const key = afterExport.slice(0, eq).trim()
    if (!key) continue
    out.add(key)
  }
  return out
}

function ContextGrid({ used, max }: { used: number; max: number }) {
  const ratio = max > 0 ? clamp01(used / max) : 0
  const filled = Math.round(ratio * 100)
  const cells = useMemo(() => Array.from({ length: 100 }, (_, i) => i < filled), [filled])

  return (
    <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-black/80">/context</div>
          <div className="text-xs text-black/50 mt-1">Current context window usage</div>
        </div>
        <div className="text-xs font-mono text-black/60">
          {used.toLocaleString()} / {max.toLocaleString()} tokens
        </div>
      </div>

      <div className="mt-3 grid grid-cols-10 gap-1">
        {cells.map((on, idx) => (
          <div
            key={idx}
            className={[
              'h-2 w-2 rounded-[4px]',
              on ? 'bg-black/70' : 'bg-black/10',
            ].join(' ')}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-black/55">
        <div>{Math.round(ratio * 100)}%</div>
        <div className="font-mono">{max > 0 ? `${(max - used).toLocaleString()} left` : ''}</div>
      </div>
    </div>
  )
}

export function SettingsView() {
  const daemon = useAppStore((s) => s.daemon)
  const projectPath = useAppStore((s) => s.projectPath)
  const mode = useAppStore((s) => s.mode)
  const model = useAppStore((s) => s.model)
  const workMode = useAppStore((s) => s.workMode)
  const prMode = useAppStore((s) => s.prMode)
  const teamConfigName = useAppStore((s) => s.teamConfigName)
  const contextBudget = useAppStore((s) => s.orchestrator.contextBudget)

  const [account, setAccount] = useState<AccountGetResult | null>(null)
  const [accountLoading, setAccountLoading] = useState(false)

  const [envStatus, setEnvStatus] = useState<EnvStatus>({ exists: false, keysPresent: new Set() })
  const [envLoading, setEnvLoading] = useState(false)
  const [selectedProviderId, setSelectedProviderId] = useState(PROVIDERS[0]?.id ?? 'anthropic')
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [addGitignore, setAddGitignore] = useState(true)

  const selectedProvider = useMemo(
    () => PROVIDERS.find((p) => p.id === selectedProviderId) ?? PROVIDERS[0],
    [selectedProviderId],
  )

  const refreshAccount = async () => {
    if (!daemon) return
    setAccountLoading(true)
    try {
      const res = await daemon.accountGet()
      setAccount(res)
    } catch (e) {
      setAccount({ planError: e instanceof Error ? e.message : 'Failed to load account' })
    } finally {
      setAccountLoading(false)
    }
  }

  const refreshEnv = async () => {
    setEnvLoading(true)
    try {
      const envPath = `${projectPath.replace(/\/$/, '')}/.env`
      const text = await invoke<string>('fs_read_text', { path: envPath, maxBytes: 200_000 })
      setEnvStatus({ exists: true, keysPresent: parseDotenvKeys(text) })
    } catch {
      setEnvStatus({ exists: false, keysPresent: new Set() })
    } finally {
      setEnvLoading(false)
    }
  }

  useEffect(() => {
    void refreshAccount()
    void refreshEnv()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daemon, projectPath])

  const saveApiKey = async () => {
    if (!selectedProvider) return
    const value = apiKeyDraft.trim()
    if (!value) {
      toast('API key is empty', { description: 'Paste your key and try again.' })
      return
    }

    try {
      await invoke<string>('env_upsert_key', {
        projectPath,
        envVar: selectedProvider.envVar,
        value,
      })

      if (addGitignore) {
        await invoke<void>('gitignore_ensure_line', { projectPath, line: '.env' })
      }

      setApiKeyDraft('')
      toast('Saved', { description: `${selectedProvider.envVar} updated in .env` })
      await refreshEnv()
    } catch (e) {
      toast('Failed to save', { description: e instanceof Error ? e.message : String(e) })
    }
  }

  const setWorkMode = async (next: 'plan' | 'build' | 'review') => {
    if (!daemon) return
    useAppStore.setState({ workMode: next })
    await daemon.settingsSet({ workMode: next })
  }

  const setPrMode = async (next: boolean) => {
    if (!daemon) return
    useAppStore.setState({ prMode: next })
    await daemon.settingsSet({ prMode: next })
  }

  const setTeamConfigName = async (next: string) => {
    if (!daemon) return
    useAppStore.setState({ teamConfigName: next })
    await daemon.settingsSet({ teamConfigName: next })
  }

  return (
    <ScrollArea className="h-full">
      <ScrollAreaViewport className="h-full">
        <div className="px-8 py-8">
          <div className="mx-auto w-full max-w-3xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-semibold tracking-tight text-black/90">Settings</div>
                <div className="mt-1 text-sm text-black/50">
                  Workspace, keys, budgets, and orchestrator defaults.
                </div>
              </div>
              <div className="text-xs font-mono text-black/50">
                {mode} · {model}
              </div>
            </div>

            {/* /account */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/80">/account</div>
                  <div className="text-xs text-black/50 mt-1">Plan and account status</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!daemon || accountLoading}
                  onClick={() => void refreshAccount()}
                >
                  {accountLoading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/5 bg-white/70 p-3">
                  <div className="text-xs text-black/45">Email</div>
                  <div className="mt-1 text-sm text-black/80">{account?.email || '—'}</div>
                </div>
                <div className="rounded-xl border border-black/5 bg-white/70 p-3">
                  <div className="text-xs text-black/45">Plan</div>
                  <div className="mt-1 text-sm text-black/80">
                    {account?.planName || (account?.planError ? 'Unavailable' : '—')}
                    {account?.isStarter ? <span className="ml-2 text-xs text-black/50">(Starter)</span> : null}
                    {account?.isPremium ? <span className="ml-2 text-xs text-black/50">(Premium)</span> : null}
                  </div>
                </div>
              </div>

              {account?.planError ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {account.planError}
                </div>
              ) : null}
            </div>

            {/* /start-with-api-key */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/80">/start-with-api-key</div>
                  <div className="text-xs text-black/50 mt-1">
                    Save your provider API keys into <span className="font-mono">.env</span> (Starter plan).
                  </div>
                </div>
                <Button variant="ghost" size="sm" disabled={envLoading} onClick={() => void refreshEnv()}>
                  {envLoading ? 'Checking…' : 'Check .env'}
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/5 bg-white/70 p-3">
                  <div className="text-xs text-black/45">Provider</div>
                  <select
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                    value={selectedProviderId}
                    onChange={(e) => setSelectedProviderId(e.target.value)}
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs text-black/45 font-mono">{selectedProvider.envVar}</div>
                  {selectedProvider.helper ? (
                    <div className="mt-1 text-xs text-black/40">{selectedProvider.helper}</div>
                  ) : null}
                </div>

                <div className="rounded-xl border border-black/5 bg-white/70 p-3">
                  <div className="text-xs text-black/45">API key</div>
                  <input
                    type="password"
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                    placeholder={selectedProvider.placeholder || 'Paste your key'}
                    value={apiKeyDraft}
                    onChange={(e) => setApiKeyDraft(e.target.value)}
                  />
                  <label className="mt-2 flex items-center gap-2 text-xs text-black/55">
                    <input
                      type="checkbox"
                      checked={addGitignore}
                      onChange={(e) => setAddGitignore(e.target.checked)}
                    />
                    Add <span className="font-mono">.env</span> to <span className="font-mono">.gitignore</span>
                  </label>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-black/45">
                      Status:{' '}
                      <span className={envStatus.keysPresent.has(selectedProvider.envVar) ? 'text-green-700' : 'text-black/50'}>
                        {envStatus.keysPresent.has(selectedProvider.envVar) ? 'configured' : 'not set'}
                      </span>
                    </div>
                    <Button size="sm" disabled={!projectPath || !apiKeyDraft.trim()} onClick={() => void saveApiKey()}>
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-black/45">
                {envStatus.exists ? (
                  <>
                    Detected <span className="font-mono">.env</span> in project root ·{' '}
                    <span className="font-mono">{Array.from(envStatus.keysPresent).length}</span> keys
                  </>
                ) : (
                  <>
                    No <span className="font-mono">.env</span> found yet — it will be created on first save.
                  </>
                )}
              </div>
            </div>

            {/* /usage + /budget + /cost */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
                <div className="text-sm font-semibold text-black/80">/usage</div>
                <div className="mt-1 text-xs text-black/50">Usage stats and limits</div>
                <div className="mt-3 rounded-xl border border-black/5 bg-white/70 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-black/60">Used</div>
                    <div className="font-mono text-black/80">{account?.usageUsed ?? '—'}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-black/60">Limit</div>
                    <div className="font-mono text-black/80">{account?.usageLimit ?? '—'}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-black/60">Period</div>
                    <div className="font-mono text-black/80">{account?.period ?? '—'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
                <div className="text-sm font-semibold text-black/80">/budget · /cost</div>
                <div className="mt-1 text-xs text-black/50">Session totals (from live agent events)</div>
                <div className="mt-3 rounded-xl border border-black/5 bg-white/70 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-black/60">Input / Output</div>
                    <div className="font-mono text-black/80">
                      {contextBudget.inputTokens.toLocaleString()} / {contextBudget.outputTokens.toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-black/60">Cost</div>
                    <div className="font-mono text-black/80">${contextBudget.totalCost.toFixed(4)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-black/60">Tokens saved</div>
                    <div className="font-mono text-black/80">{contextBudget.tokensSaved.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>

            <ContextGrid used={contextBudget.windowUsedTokens} max={contextBudget.windowMaxTokens} />

            {/* Orchestrator defaults */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
              <div className="text-sm font-semibold text-black/80">Team Orchestrator</div>
              <div className="mt-1 text-xs text-black/50">Defaults used when mode is team-orchestrator</div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/5 bg-white/70 p-3">
                  <div className="text-xs text-black/45">Team config</div>
                  <select
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                    value={teamConfigName}
                    onChange={(e) => void setTeamConfigName(e.target.value)}
                    disabled={!daemon}
                  >
                    <option value="ShipFast">ShipFast</option>
                    <option value="QualityFirst">QualityFirst</option>
                    <option value="BudgetFriendly">BudgetFriendly</option>
                    {teamConfigName !== 'ShipFast' &&
                    teamConfigName !== 'QualityFirst' &&
                    teamConfigName !== 'BudgetFriendly' ? (
                      <option value={teamConfigName}>{teamConfigName}</option>
                    ) : null}
                  </select>
                </div>

                <div className="rounded-xl border border-black/5 bg-white/70 p-3">
                  <div className="text-xs text-black/45">Work mode</div>
                  <div className="mt-1 flex gap-2">
                    {(['plan', 'build', 'review'] as const).map((w) => (
                      <button
                        key={w}
                        disabled={!daemon}
                        onClick={() => void setWorkMode(w)}
                        className={[
                          'flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition',
                          workMode === w ? 'border-black/20 bg-black/5 text-black/80' : 'border-black/10 bg-white text-black/60 hover:bg-black/5',
                          !daemon ? 'cursor-not-allowed opacity-60' : '',
                        ].join(' ')}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-black/55">
                    <input
                      type="checkbox"
                      checked={prMode}
                      disabled={!daemon}
                      onChange={(e) => void setPrMode(e.target.checked)}
                    />
                    PR mode (plan for pull request style changes)
                  </label>
                </div>
              </div>
            </div>

            {/* /upgrade-plan */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/80">/upgrade-plan</div>
                  <div className="mt-1 text-xs text-black/50">Manage your subscription</div>
                </div>
                <Button
                  size="sm"
                  onClick={() => window.open('https://snailer.ai/account', '_blank')}
                >
                  Open
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollBar />
    </ScrollArea>
  )
}
