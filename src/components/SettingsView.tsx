import { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

import { useAppStore } from '../lib/store'
import { authService } from '../lib/authService'
import { Button } from './ui/button'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'
import { LoginModal } from './LoginModal'

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
  path?: string | null
  keysPresent: Set<string>
}

type BudgetStatus = {
  plan: string
  isStarter: boolean
  envMainOverride?: number | null
  mainLimitUsd: number
  mainSpentUsd: number
  minimaxLimitUsd: number
  minimaxSpentUsd: number
  month: number
  year: number
}

type SnailerCliStatus = {
  installed: boolean
  cliPath?: string | null
  npmAvailable: boolean
  usingBundledNode: boolean
  bundledNodePath?: string | null
  prefixDir: string
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
  { id: 'xai', label: 'Grok (xAI)', envVar: 'XAI_API_KEY' },
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

function parseDotenvValue(text: string, lookupKey: string): string | null {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const afterExport = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
    const eq = afterExport.indexOf('=')
    if (eq <= 0) continue
    const key = afterExport.slice(0, eq).trim()
    if (key !== lookupKey) continue
    let value = afterExport.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) value = value.slice(1, -1)
    return value
  }
  return null
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
  const connect = useAppStore((s) => s.connect)
  const projectPath = useAppStore((s) => s.projectPath)
  const mode = useAppStore((s) => s.mode)
  const model = useAppStore((s) => s.model)
  const workMode = useAppStore((s) => s.workMode)
  const prMode = useAppStore((s) => s.prMode)
  const teamConfigName = useAppStore((s) => s.teamConfigName)
  const contextBudget = useAppStore((s) => s.orchestrator.contextBudget)

  const [account, setAccount] = useState<AccountGetResult | null>(null)
  const [accountLoading, setAccountLoading] = useState(false)

  // Auth state (mirrors Sidebar behavior, surfaced in /account section)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMode, setLoginMode] = useState<'login' | 'switch'>('login')
  const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isLoggedIn())
  const [userEmail, setUserEmail] = useState<string | null>(() => authService.getCurrentEmail())
  const [userName, setUserName] = useState<string | null>(() => authService.getCurrentName())

  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetDraftUsd, setBudgetDraftUsd] = useState<string>('')

  const [cliStatus, setCliStatus] = useState<SnailerCliStatus | null>(null)
  const [cliLoading, setCliLoading] = useState(false)
  const [cliInstalling, setCliInstalling] = useState(false)

  const [envStatus, setEnvStatus] = useState<EnvStatus>({ exists: false, path: null, keysPresent: new Set() })
  const [envLoading, setEnvLoading] = useState(false)
  const [sharedEnvPath, setSharedEnvPath] = useState<string | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState(PROVIDERS[0]?.id ?? 'anthropic')
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [savedKeyTail, setSavedKeyTail] = useState<string | null>(null)

  const selectedProvider = useMemo(
    () => PROVIDERS.find((p) => p.id === selectedProviderId) ?? PROVIDERS[0],
    [selectedProviderId],
  )

  const planFlags = useMemo(() => {
    const hasAccountToken = Boolean(account?.hasAccountToken)
    const isPremium = Boolean(account?.isPremium)
    const isStarter = Boolean(account?.isStarter)
    return { hasAccountToken, isPremium, isStarter }
  }, [account])

  const keyPolicy = useMemo(() => {
    const localConfigured = Boolean(selectedProvider?.envVar && envStatus.keysPresent.has(selectedProvider.envVar))
    const managedConfigured =
      !localConfigured &&
      planFlags.hasAccountToken &&
      (planFlags.isPremium || (planFlags.isStarter && selectedProviderId === 'google'))

    const effectiveConfigured = localConfigured || managedConfigured
    const sourceLabel = localConfigured ? 'Shared .env' : managedConfigured ? 'Snailer-managed' : '—'

    const requirementHint =
      planFlags.isPremium && planFlags.hasAccountToken
        ? 'Premium: provider keys are issued by Snailer. Local keys are optional fallback.'
        : planFlags.isStarter && planFlags.hasAccountToken
          ? selectedProviderId === 'google'
            ? 'Starter: Gemini key is issued by Snailer when logged in. Local key is optional.'
            : 'Starter: set your provider key (Snailer may also fetch keys for some models when logged in).'
          : 'Not logged in: set your provider keys in .env.'

    return { localConfigured, managedConfigured, effectiveConfigured, sourceLabel, requirementHint }
  }, [envStatus.keysPresent, planFlags, selectedProvider, selectedProviderId])

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

  const refreshEnvFileConfig = async () => {
    try {
      const globalPath = await invoke<string>('env_global_path')
      setSharedEnvPath(globalPath)
      await invoke<string>('env_ensure_file_at_path', { path: globalPath } as unknown as Record<string, unknown>)
      await invoke<void>('snailer_env_file_set', { path: globalPath } as unknown as Record<string, unknown>)
    } catch {
      // Non-fatal; leave defaults.
    }
  }

  const refreshEnv = async () => {
    setEnvLoading(true)
    try {
      const res = await invoke<{
        found: boolean
        selectedPath?: string | null
        allFoundPaths: string[]
        demonstrateOrder: string[]
      }>('env_find', { projectPath, project_path: projectPath } as unknown as Record<string, unknown>)

      const envPath = res.selectedPath || null
      if (!envPath) {
        setEnvStatus({ exists: false, path: null, keysPresent: new Set() })
        return
      }

      const text = await invoke<string>(
        'fs_read_text',
        { path: envPath, maxBytes: 200_000, max_bytes: 200_000 } as unknown as Record<string, unknown>,
      )
      setEnvStatus({ exists: true, path: envPath, keysPresent: parseDotenvKeys(text) })
    } catch {
      setEnvStatus({ exists: false, path: null, keysPresent: new Set() })
    } finally {
      setEnvLoading(false)
    }
  }

  const refreshSelectedKeyTail = async () => {
    if (!selectedProvider?.envVar) {
      setSavedKeyTail(null)
      return
    }
    if (!envStatus.exists || !envStatus.path) {
      setSavedKeyTail(null)
      return
    }
    if (!envStatus.keysPresent.has(selectedProvider.envVar)) {
      setSavedKeyTail(null)
      return
    }
    try {
      const text = await invoke<string>(
        'fs_read_text',
        { path: envStatus.path, maxBytes: 200_000, max_bytes: 200_000 } as unknown as Record<string, unknown>,
      )
      const v = parseDotenvValue(text, selectedProvider.envVar)
      if (!v) {
        setSavedKeyTail(null)
        return
      }
      const tail = v.length > 4 ? v.slice(-4) : v
      setSavedKeyTail(tail)
    } catch {
      setSavedKeyTail(null)
    }
  }

  const checkEnv = async () => {
    setEnvLoading(true)
    try {
      const res = await invoke<{
        found: boolean
        selectedPath?: string | null
        allFoundPaths: string[]
        demonstrateOrder: string[]
      }>('env_find', { projectPath, project_path: projectPath } as unknown as Record<string, unknown>)

      const envPath = res.selectedPath || null
      if (!envPath) {
        setEnvStatus({ exists: false, path: null, keysPresent: new Set() })
        toast('.env not found', { description: 'No .env yet — click Create .env or Save below to create it.' })
        return
      }
      const text = await invoke<string>(
        'fs_read_text',
        { path: envPath, maxBytes: 200_000, max_bytes: 200_000 } as unknown as Record<string, unknown>,
      )
      const keys = parseDotenvKeys(text)
      setEnvStatus({ exists: true, path: envPath, keysPresent: keys })
      toast('.env loaded', { description: `${keys.size} key(s) found · ${envPath}` })
    } catch (e) {
      setEnvStatus({ exists: false, path: null, keysPresent: new Set() })
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.toLowerCase().includes('no such file') || msg.toLowerCase().includes('os error 2')) {
        toast('.env not found', { description: 'No .env yet — click Create .env or Save below to create it.' })
      } else {
        toast('.env not found', { description: msg })
      }
    } finally {
      setEnvLoading(false)
    }
  }

  const createEnvFile = async () => {
    setEnvLoading(true)
    try {
      const globalPath = sharedEnvPath || (await invoke<string>('env_global_path'))
      await invoke<string>('env_ensure_file_at_path', { path: globalPath } as unknown as Record<string, unknown>)
      toast('.env created')
      await refreshEnv()
    } catch (e) {
      toast('Failed to create .env', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setEnvLoading(false)
    }
  }

  const refreshBudget = async () => {
    setBudgetLoading(true)
    try {
      const res = await invoke<BudgetStatus>('budget_get_status')
      setBudgetStatus(res)
      if (!budgetDraftUsd) setBudgetDraftUsd(String(Math.round(res.mainLimitUsd)))
    } catch (e) {
      toast('Failed to load budget', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBudgetLoading(false)
    }
  }

  const refreshCliStatus = async () => {
    setCliLoading(true)
    try {
      const res = await invoke<SnailerCliStatus>('snailer_cli_status')
      setCliStatus(res)
    } catch (e) {
      setCliStatus(null)
      toast('Failed to check Snailer CLI', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setCliLoading(false)
    }
  }

  const installCli = async () => {
    setCliInstalling(true)
    try {
      // Kill existing daemon before repair/install
      await invoke('engine_kill')
      // Small delay to ensure process is fully terminated
      await new Promise((r) => setTimeout(r, 500))

      await invoke<string>('snailer_cli_ensure_installed')
      toast('Snailer CLI installed')
      await refreshCliStatus()

      // Reconnect to start fresh daemon
      await connect()
      toast('Daemon restarted')
    } catch (e) {
      toast('Failed to install Snailer CLI', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setCliInstalling(false)
    }
  }

  useEffect(() => {
    void (async () => {
      const auth = await authService.refresh()
      setIsLoggedIn(authService.isLoggedIn())
      setUserEmail(auth?.email ?? null)
      setUserName(auth?.name ?? null)
      await refreshAccount()
      await refreshEnvFileConfig()
      await refreshEnv()
      await refreshBudget()
      await refreshCliStatus()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daemon, projectPath])

  useEffect(() => {
    void refreshSelectedKeyTail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProviderId, envStatus.exists, envStatus.path])

  const handleLogout = async () => {
    try {
      await authService.logout()
      setIsLoggedIn(false)
      setUserEmail(null)
      setUserName(null)
      toast('Logged out')
      await refreshAccount()
    } catch (e) {
      toast('Logout failed', { description: e instanceof Error ? e.message : String(e) })
    }
  }

  const saveBudget = async () => {
    const v = Number(budgetDraftUsd)
    if (!Number.isFinite(v) || v < 0) {
      toast('Invalid budget', { description: 'Enter a non-negative number (USD).' })
      return
    }
    setBudgetLoading(true)
    try {
      const res = await invoke<BudgetStatus>(
        'budget_set_main_limit',
        { mainLimitUsd: v, main_limit_usd: v } as unknown as Record<string, unknown>,
      )
      setBudgetStatus(res)
      toast('Budget updated', { description: `Main monthly budget set to $${v.toFixed(0)}` })
    } catch (e) {
      toast('Failed to update budget', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBudgetLoading(false)
    }
  }

  const saveApiKey = async () => {
    if (!selectedProvider) return
    const value = apiKeyDraft.trim()
    if (!value) {
      toast('API key is empty', { description: 'Paste your key and try again.' })
      return
    }

    try {
      const globalPath = sharedEnvPath || (await invoke<string>('env_global_path'))
      await invoke<string>(
        'env_upsert_key_at_path',
        {
          path: globalPath,
          envVar: selectedProvider.envVar,
          env_var: selectedProvider.envVar,
          value,
        } as unknown as Record<string, unknown>,
      )

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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!daemon || accountLoading}
                    onClick={() => void refreshAccount()}
                  >
                    {accountLoading ? 'Refreshing…' : 'Refresh'}
                  </Button>
                  {isLoggedIn && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleLogout()}
                    >
                      Logout
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-black/5 bg-white/70 p-3">
                  <div className="text-xs text-black/45">Email</div>
                  <div className="mt-1 text-sm text-black/80">
                    {userName || userEmail || account?.email || '—'}
                  </div>
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

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-black/45">
                  {isLoggedIn ? (
                    <>
                      Signed in as <span className="text-black/70">{userName || userEmail}</span>
                    </>
                  ) : (
                    'Not signed in'
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isLoggedIn ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLoginMode('switch')
                          setShowLoginModal(true)
                        }}
                      >
                        Switch account
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => void handleLogout()}>
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setLoginMode('login')
                        setShowLoginModal(true)
                      }}
                    >
                      Login
                    </Button>
                  )}
                </div>
              </div>

              {account?.planError ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {account.planError}
                </div>
              ) : null}
            </div>

            {/* Snailer CLI */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/80">Snailer CLI</div>
                  <div className="text-xs text-black/50 mt-1">Required to run the engine (installed per-user under ~/.snailer)</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" disabled={cliLoading || cliInstalling} onClick={() => void refreshCliStatus()}>
                    {cliLoading ? 'Checking…' : 'Refresh'}
                  </Button>
                  <Button size="sm" disabled={cliInstalling} onClick={() => void installCli()}>
                    {cliInstalling ? 'Installing…' : cliStatus?.installed ? 'Repair' : 'Install'}
                  </Button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-black/5 bg-white/70 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-black/60">Status</div>
                  <div className={cliStatus?.installed ? 'text-green-700 font-medium' : 'text-black/50'}>
                    {cliStatus ? (cliStatus.installed ? 'installed' : 'not installed') : '—'}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-black/60">CLI path</div>
                  <div className="font-mono text-black/80 truncate max-w-[60%]">{cliStatus?.cliPath || '—'}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-black/60">Install dir</div>
                  <div className="font-mono text-black/70 truncate max-w-[60%]">{cliStatus?.prefixDir || '—'}</div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-black/60">npm available</div>
                  <div className={cliStatus?.npmAvailable ? 'text-black/80' : 'text-black/50'}>
                    {cliStatus ? (cliStatus.npmAvailable ? 'yes' : 'no') : '—'}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-black/60">Bundled Node</div>
                  <div className="font-mono text-black/70 truncate max-w-[60%]">
                    {cliStatus?.bundledNodePath ? (cliStatus.usingBundledNode ? `active · ${cliStatus.bundledNodePath}` : cliStatus.bundledNodePath) : '—'}
                  </div>
                </div>
              </div>

              {cliStatus && !cliStatus.npmAvailable ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  npm is not available yet. Click Install to auto-download Node.js and install the CLI.
                </div>
              ) : null}
            </div>

            {/* /start-with-api-key */}
            <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-black/80">/start-with-api-key</div>
                  <div className="text-xs text-black/50 mt-1">
                    Provider keys are stored in a shared <span className="font-mono">~/.snailer/.env</span> so you don’t need to reconfigure per workspace.
                  </div>
                  <div className="text-xs text-black/45 mt-1">
                    No API key is needed for <span className="font-mono">minimax-m2</span> and{' '}
                    <span className="font-mono">kimi-k2</span>/<span className="font-mono">kimi-k2.5</span>.
                  </div>
                  <div className="text-xs text-black/45 mt-1">{keyPolicy.requirementHint}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={envLoading}
                  onClick={() => void checkEnv()}
                >
                  {envLoading ? 'Checking…' : 'Check .env'}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/5 bg-white/70 p-3">
                <div>
                  <div className="text-xs text-black/45">Shared .env</div>
                  <div className="mt-1 text-xs text-black/40 font-mono">{sharedEnvPath || '—'}</div>
                </div>
              </div>

              {!envStatus.exists ? (
                <div className="mt-3 flex items-center justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    disabled={envLoading}
                    onClick={() => void createEnvFile()}
                    className="rounded-xl"
                  >
                    Create .env
                  </Button>
                </div>
              ) : null}

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
                  <div className="mt-2 text-[11px] text-black/40">
                    Saved keys are not displayed here. Paste a new key to update.
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-black/45">
                      Status:{' '}
                      <span className={keyPolicy.effectiveConfigured ? 'text-green-700' : 'text-black/50'}>
                        {keyPolicy.effectiveConfigured ? 'configured' : 'not set'}
                      </span>
                      {keyPolicy.effectiveConfigured ? (
                        <span className="ml-2 text-black/40">
                          ({keyPolicy.sourceLabel}
                          {keyPolicy.localConfigured && savedKeyTail ? ` ••••${savedKeyTail}` : ''})
                        </span>
                      ) : null}
                    </div>
                    <Button size="sm" disabled={!apiKeyDraft.trim()} onClick={() => void saveApiKey()}>
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-black/45">
                {envStatus.exists ? (
                  <>
                    Detected <span className="font-mono">.env</span> · <span className="font-mono">{Array.from(envStatus.keysPresent).length}</span> keys
                    {envStatus.path ? (
                      <>
                        {' '}
                        · <span className="font-mono">{envStatus.path}</span>
                      </>
                    ) : null}
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

                <div className="mt-4 border-t border-black/5 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-black/80">Monthly budget</div>
                      <div className="mt-1 text-xs text-black/50">
                        Tune monthly limits like CLI <span className="font-mono">/budget</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" disabled={budgetLoading} onClick={() => void refreshBudget()}>
                      {budgetLoading ? 'Loading…' : 'Refresh'}
                    </Button>
                  </div>

	                  <div className="mt-3 rounded-xl border border-black/5 bg-white/70 p-3">
	                    <div className="flex items-center justify-between text-sm">
	                      <div className="text-black/60">
	                        {budgetStatus ? (
	                          <>
	                            {budgetStatus.year}-{String(budgetStatus.month).padStart(2, '0')}
	                          </>
	                        ) : (
	                          '—'
	                        )}
	                      </div>
	                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="text-black/55">Main models</div>
                        <div className="font-mono text-black/70">
                          ${budgetStatus?.mainSpentUsd?.toFixed?.(2) ?? '—'} / ${budgetStatus?.mainLimitUsd?.toFixed?.(2) ?? '—'}
                        </div>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full bg-black/60"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                budgetStatus && budgetStatus.mainLimitUsd > 0
                                  ? (budgetStatus.mainSpentUsd / budgetStatus.mainLimitUsd) * 100
                                  : 0,
                              ),
                            )}%`,
                          }}
                        />
                      </div>

	                      <div className="mt-3 flex items-center justify-between text-xs">
	                        <div className="text-black/55">MiniMax / Kimi</div>
	                        <div className="font-mono text-black/70">
	                          ${budgetStatus?.minimaxSpentUsd?.toFixed?.(2) ?? '—'} / limited budget
	                        </div>
	                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full bg-black/40"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                budgetStatus && budgetStatus.minimaxLimitUsd > 0
                                  ? (budgetStatus.minimaxSpentUsd / budgetStatus.minimaxLimitUsd) * 100
                                  : 0,
                              ),
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={budgetDraftUsd}
                        onChange={(e) => setBudgetDraftUsd(e.target.value)}
                        className="w-28 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-black/10"
                        placeholder="15"
                        disabled={budgetLoading || Boolean(budgetStatus?.envMainOverride)}
                      />
                      <div className="text-xs text-black/50">USD (main models)</div>
                      <div className="ml-auto">
                        <Button
                          size="sm"
                          disabled={budgetLoading || Boolean(budgetStatus?.envMainOverride) || !budgetDraftUsd.trim()}
                          onClick={() => void saveBudget()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>

                    {budgetStatus?.envMainOverride ? (
                      <div className="mt-2 text-xs text-amber-700">
                        Env override detected: <span className="font-mono">SNAILER_BUDGET_MAIN={budgetStatus.envMainOverride}</span>. Unset it to edit here.
                      </div>
                    ) : null}
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
                  onClick={() => window.open('https://snailer.ai/account', '_blank', 'noopener,noreferrer')}
                >
                  Open
                </Button>
              </div>
            </div>
          </div>
        </div>
      </ScrollAreaViewport>
      <ScrollBar />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        mode={loginMode}
        onSuccess={(email, name) => {
          setIsLoggedIn(true)
          setUserEmail(email)
          setUserName(name || null)
          setShowLoginModal(false)
          void refreshAccount()
          toast('Signed in', { description: name ? `${name} · ${email}` : email })
        }}
      />
    </ScrollArea>
  )
}
