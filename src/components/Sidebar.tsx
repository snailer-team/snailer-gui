import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from './ui/button'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'
import { useAppStore } from '../lib/store'
import { authService } from '../lib/authService'
import { LoginModal } from './LoginModal'
import { IconChatBubble, IconSettings, IconSparkle, IconUser, IconLogOut } from './icons'

function baseName(p: string) {
  const cleaned = (p || '').replace(/\/$/, '')
  const parts = cleaned.split('/')
  return parts[parts.length - 1] || cleaned || ''
}

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

function SegmentedToggle() {
  const { viewMode, setViewMode } = useAppStore()
  return (
    <div className="inline-flex rounded-full bg-black/5 p-1">
      <button
        className={[
          'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition',
          viewMode === 'chat' ? 'bg-white shadow-sm' : 'hover:bg-white/60',
        ].join(' ')}
        onClick={() => setViewMode('chat')}
        title="Chat"
      >
        <IconChatBubble className="h-5 w-5 text-black/70" />
      </button>
      <button
        className={[
          'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm transition',
          viewMode !== 'chat' ? 'bg-white shadow-sm' : 'hover:bg-white/60',
        ].join(' ')}
        onClick={() => setViewMode('settings')}
        title="Settings"
      >
        <IconSettings className="h-5 w-5 text-black/70" />
      </button>
    </div>
  )
}

export function Sidebar() {
  const {
    connectionStatus,
    sessions,
    activeSessionId,
    selectSession,
    createSession,
    deleteSession,
    daemon,
    projectPath,
  } = useAppStore()

  // Auth state
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMode, setLoginMode] = useState<'login' | 'switch'>('login')
  const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isLoggedIn())
  const [userEmail, setUserEmail] = useState<string | null>(() => authService.getCurrentEmail())
  const [userName, setUserName] = useState<string | null>(() => authService.getCurrentName())
  const [showUserMenu, setShowUserMenu] = useState(false)

  const [openSessionMenuId, setOpenSessionMenuId] = useState<string | null>(null)
  const sessionMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!openSessionMenuId) return
    const onDown = (e: MouseEvent) => {
      const el = sessionMenuRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setOpenSessionMenuId(null)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [openSessionMenuId])

  useEffect(() => {
    void (async () => {
      const auth = await authService.refresh()
      setIsLoggedIn(authService.isLoggedIn())
      setUserEmail(auth?.email ?? null)
      setUserName(auth?.name ?? null)
    })()
  }, [])

  const subtitle = useMemo(() => {
    if (connectionStatus === 'connected') return 'Ready'
    if (connectionStatus === 'connecting' || connectionStatus === 'starting') return 'Connecting…'
    if (connectionStatus === 'error') return 'Error'
    return 'Disconnected'
  }, [connectionStatus])

  return (
    <aside className="h-full flex flex-col border-r border-black/5 bg-[#f6f3ea]">
      <div className="px-4 pt-5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusDot status={connectionStatus} />
            <div className="text-sm font-semibold tracking-tight">Snailer</div>
            <div className="text-xs text-black/45">{subtitle}</div>
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
            className="rounded-xl"
          >
            <IconSparkle className="h-5 w-5 text-black/55" />
          </Button>
        </div>

        <div className="mt-4">
          <SegmentedToggle />
        </div>
      </div>


      <div className="mt-6 flex items-center px-4 shrink-0">
        <div className="text-sm font-semibold tracking-tight text-black/80">Sessions</div>
      </div>

      <ScrollArea className="mt-2 flex-1 min-h-0 px-2">
        <ScrollAreaViewport className="h-full">
          <div className="space-y-1 px-2 pb-4">
            {sessions.length === 0 ? (
              <div className="rounded-2xl bg-white/60 p-4 text-sm text-black/55">
                No sessions. Create a new session to start.
              </div>
            ) : (
              sessions.map((s) => {
                const active = s.id === activeSessionId
                const repo = baseName(s.projectPath || projectPath)
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
                      'group w-full rounded-2xl px-4 py-3 text-left transition',
                      active ? 'bg-white shadow-sm' : 'hover:bg-white/70',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          selectSession(s.id)
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-[15px] font-semibold tracking-tight text-black/90">
                          {s.name}
                        </div>
                        <div className="mt-1 truncate text-sm text-black/50">{repo || 'workspace'}</div>
                      </button>

                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 rounded-full bg-black/5 px-2 py-0.5 text-xs font-mono text-black/55">
                          {s.activityCount ?? 0}
                        </span>

                        <div className="relative" ref={openSessionMenuId === s.id ? sessionMenuRef : null}>
                          <button
                            className="rounded-xl p-1.5 text-black/45 opacity-0 transition hover:bg-black/5 hover:text-black/70 group-hover:opacity-100"
                            title="Session menu"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenSessionMenuId((cur) => (cur === s.id ? null : s.id))
                            }}
                          >
                            <span className="block text-lg leading-none">⋯</span>
                          </button>

                          {openSessionMenuId === s.id ? (
                            <div className="absolute right-0 top-8 z-50 w-44 rounded-2xl border border-black/10 bg-white py-2 shadow-lg">
                              <button
                                className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenSessionMenuId(null)
                                  void deleteSession(s.id)
                                }}
                              >
                                <span>End Session</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
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
        <Button
          variant="default"
          className="w-full rounded-2xl relative z-10 bg-black text-white hover:bg-black/90 shadow-sm"
          disabled={!daemon || !projectPath}
          onClick={() => {
            console.log('[Sidebar] Button clicked, sessions before:', sessions.length)
            console.log('[Sidebar] daemon:', !!daemon, 'projectPath:', projectPath)

            if (!daemon || !projectPath) {
              console.log('[Sidebar] Cannot create - daemon or projectPath missing')
              return
            }

            const sessionName = 'Session ' + new Date().toLocaleTimeString()
            console.log('[Sidebar] Creating session:', sessionName)

            createSession(sessionName)
              .then((id) => {
                console.log('[Sidebar] Created session with id:', id)
                console.log('[Sidebar] Sessions after create:', useAppStore.getState().sessions.length)
                selectSession(id)
              })
              .catch((e) => {
                console.error('[Sidebar] Failed to create session:', e)
              })
          }}
        >
          New Session
        </Button>

        {/* Auth Section */}
        <div className="mt-4 border-t border-black/5 pt-4">
          {isLoggedIn ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/60 px-4 py-3 text-left transition hover:bg-white"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5">
                  <IconUser className="h-4 w-4 text-black/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-black/80">{userName || userEmail}</div>
                  {userName && userEmail && (
                    <div className="truncate text-xs text-black/45">{userEmail}</div>
                  )}
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl border border-black/10 bg-white py-2 shadow-lg">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      setLoginMode('switch')
                      setShowLoginModal(true)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-50"
                  >
                    <IconUser className="h-4 w-4 text-black/60" />
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

        <div className="mt-3 text-xs text-black/45">
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
