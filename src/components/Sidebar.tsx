import { useMemo, useState } from 'react'

import { Button } from './ui/button'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'
import { useAppStore } from '../lib/store'
import { authService } from '../lib/authService'
import { LoginModal } from './LoginModal'
import { IconChatBubble, IconSettings, IconUser, IconLogOut } from './icons'

function StatusDot({ status }: { status: 'connected' | 'connecting' | 'starting' | 'disconnected' | 'error' }) {
  const cls =
    status === 'connected'
      ? 'bg-emerald-500/70'
      : status === 'connecting' || status === 'starting'
        ? 'bg-sky-500/70'
        : status === 'error'
          ? 'bg-rose-500/70'
          : 'bg-neutral-400/70'
  return <span className={['h-2.5 w-2.5 rounded-full', cls].join(' ')} />
}

function formatRecent(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return 'now'
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return 'now'
  const min = Math.floor(diffSec / 60)
  if (min < 60) return `${min}m`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}h`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}d`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week}w`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month}mo`
  const year = Math.floor(day / 365)
  return `${year}y`
}

function sessionDisplayTitle(name: string, previewText?: string) {
  const normalized = (previewText || '').replace(/\s+/g, ' ').trim()
  if (normalized.length > 0 && name.trim().toLowerCase() === 'new session') {
    return normalized
  }
  return name
}

function SegmentedToggle() {
  const { viewMode, setViewMode } = useAppStore()
  return (
    <div className="inline-flex rounded-full border border-slate-200 bg-slate-100 p-1">
      <button
        className={[
          'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition',
          viewMode === 'chat'
            ? 'border border-slate-200 bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:bg-white/70',
        ].join(' ')}
        onClick={() => setViewMode('chat')}
        title="Chat"
      >
        <IconChatBubble className="h-5 w-5" />
      </button>
      <button
        className={[
          'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition',
          viewMode !== 'chat'
            ? 'border border-slate-200 bg-white text-slate-800 shadow-sm'
            : 'text-slate-500 hover:bg-white/70',
        ].join(' ')}
        onClick={() => setViewMode('settings')}
        title="Settings"
      >
        <IconSettings className="h-5 w-5" />
      </button>
    </div>
  )
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" strokeLinejoin="round" />
    </svg>
  )
}

function IconNewSession({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
      <path d="M14 3v5h5" strokeLinejoin="round" />
      <path d="M12 10v8M8 14h8" strokeLinecap="round" />
    </svg>
  )
}

export function Sidebar() {
  const {
    connectionStatus,
    sessions,
    activeSessionId,
    selectSession,
    createSession,
    daemon,
    projectPath,
    mode,
    lastStandardMode,
    setUiMode,
    currentRunStatus,
  } = useAppStore()

  // Auth state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMode, setLoginMode] = useState<'login' | 'switch'>('login')
  const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isLoggedIn())
  const [userEmail, setUserEmail] = useState<string | null>(() => authService.getCurrentEmail())
  const [userName, setUserName] = useState<string | null>(() => authService.getCurrentName())
  const [showUserMenu, setShowUserMenu] = useState(false)

  const subtitle = useMemo(() => {
    if (connectionStatus === 'connected') return 'Ready'
    if (connectionStatus === 'connecting' || connectionStatus === 'starting') return 'Connecting…'
    if (connectionStatus === 'error') return 'Error'
    return 'Disconnected'
  }, [connectionStatus])

  const busy =
    currentRunStatus === 'running' ||
    currentRunStatus === 'queued' ||
    currentRunStatus === 'awaiting_approval'
  const elonEnabled = mode === 'elon'

  const sessionDiff = (s: (typeof sessions)[number]) => {
    let added = 0
    let removed = 0
    for (const e of s.agentEvents) {
      if (e.type !== 'FileOp') continue
      added += e.linesAdded ?? 0
      removed += e.linesRemoved ?? 0
    }
    return { added, removed }
  }

  return (
    <aside
      className="h-full flex flex-col border-r border-slate-200 bg-slate-100"
      style={{ fontFamily: "'IBM Plex Sans KR', 'SUIT', 'Pretendard', 'Noto Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif" }}
    >
      <div className="px-4 pt-5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status={connectionStatus} />
            <div className="text-sm font-semibold tracking-tight text-slate-800">Snailer</div>
            <div className="text-xs text-slate-500">{subtitle}</div>
            {!elonEnabled ? null : (
              <div className="ml-1 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold tracking-wide text-slate-700">
                <IconBolt className="h-3.5 w-3.5" />
                ElonX HARD
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="New Session (⌘N)"
            disabled={!daemon || !projectPath}
            onClick={async () => {
              try {
                console.log('[Sidebar] Creating new session (sparkle)...')
                const id = await createSession('New Session')
                console.log('[Sidebar] Created session:', id)
                selectSession(id)
              } catch (e) {
                console.error('[Sidebar] Failed to create session:', e)
              }
            }}
            className="rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <IconNewSession className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-4">
          <SegmentedToggle />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="text-xs font-semibold tracking-wide text-slate-700">ElonX HARD</div>
          <button
            type="button"
            role="switch"
            aria-checked={elonEnabled}
            disabled={!daemon || busy}
            onClick={() => void setUiMode(elonEnabled ? lastStandardMode : 'elon')}
            className={[
              'relative inline-flex h-6 w-10 items-center rounded-full transition',
              elonEnabled ? 'bg-slate-700' : 'bg-slate-300',
              !daemon || busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-400',
            ].join(' ')}
            title={elonEnabled ? 'Disable ElonX HARD' : 'Enable ElonX HARD'}
          >
            <span
              className={[
                'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition',
                elonEnabled ? 'translate-x-4' : 'translate-x-1',
              ].join(' ')}
            />
          </button>
        </div>
      </div>


      <div className="mt-6 flex items-center px-4 shrink-0">
        <div className="text-sm font-semibold tracking-tight text-slate-700">Sessions</div>
      </div>

      <ScrollArea className="mt-2 flex-1 min-h-0 px-2">
        <ScrollAreaViewport className="h-full">
          <div className="space-y-0.5 px-2 pb-4">
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No sessions. Create a new session to start.
              </div>
            ) : (
              sessions.map((s) => {
                const active = s.id === activeSessionId
                const firstUserMessage = s.messages.find((m) => m.role === 'user')?.content
                const title = sessionDisplayTitle(s.name, firstUserMessage)
                const diff = sessionDiff(s)
                const hasDiff = diff.added > 0 || diff.removed > 0
                return (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectSession(s.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectSession(s.id)
                      }
                    }}
                    className={[
                      'group w-full rounded-xl px-3 py-1.5 text-left transition',
                      active ? 'bg-slate-200/80' : 'hover:bg-white/60',
                    ].join(' ')}
                  >
                    <div className="grid w-full grid-cols-[minmax(0,1fr)_110px] items-center gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        {active ? <span className="shrink-0 text-[18px] leading-none text-slate-700">›</span> : null}
                        <div
                          className={[
                            'min-w-0 truncate pr-1 text-[12px] leading-5',
                            active ? 'font-medium text-slate-900' : 'font-normal text-slate-900',
                          ].join(' ')}
                          title={title}
                        >
                          {title}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center justify-end gap-1.5 whitespace-nowrap pl-1 text-[12px] leading-none">
                        {hasDiff ? (
                          <>
                            <span className="font-medium text-emerald-600">+{diff.added}</span>
                            <span className="font-medium text-rose-600">-{diff.removed}</span>
                          </>
                        ) : null}
                        <span className="font-normal text-slate-400">{formatRecent(s.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollAreaViewport>
        <ScrollBar />
      </ScrollArea>

      <div className="px-4 pb-4 shrink-0">
        {/* Auth Section */}
        <div className="border-t border-slate-200 pt-4">
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50 hover:shadow-sm"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <IconUser className="h-4 w-4 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{userName || userEmail}</div>
                  {userName && userEmail && (
                    <div className="truncate text-xs text-slate-500">{userEmail}</div>
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      setLoginMode('switch')
                      setShowLoginModal(true)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <IconUser className="h-4 w-4 text-slate-500" />
                    <span>Switch Account</span>
                  </button>
                  <button
                    onClick={async () => {
                      setShowUserMenu(false)
                      await authService.logout()
                      setIsLoggedIn(false)
                      setUserEmail(null)
                      setUserName(null)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <IconLogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="default"
              className="w-full rounded-2xl"
              onClick={() => {
                setLoginMode('login')
                setShowLoginModal(true)
              }}
            >
              <IconUser className="mr-2 h-4 w-4" />
              Login
            </Button>
          )}
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Shortcuts: <span className="font-mono">⌘K</span> Command · <span className="font-mono">⌘N</span> New Session
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={(email, name) => {
          setIsLoggedIn(true)
          setUserEmail(email)
          setUserName(name || null)
          setShowLoginModal(false)
        }}
        mode={loginMode}
      />
    </aside>
  )
}
