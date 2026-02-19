import { useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'

import { useAppStore } from '../lib/store'
import { authService } from '../lib/authService'
import { LoginModal } from './LoginModal'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginMode, setLoginMode] = useState<'login' | 'switch'>('login')
  const [isLoggedIn, setIsLoggedIn] = useState(() => authService.isLoggedIn())
  const [userEmail, setUserEmail] = useState<string | null>(() => authService.getCurrentEmail())
  const [userName, setUserName] = useState<string | null>(() => authService.getCurrentName())

  const {
    slashItems,
    modeItems,
    modelItems,
    appendToDraftPrompt,
    createSession,
    selectSession,
    daemon,
  } = useAppStore()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const mod = isMac ? e.metaKey : e.ctrlKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        void (async () => {
          const id = await createSession('New Session')
          selectSession(id)
        })()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [createSession, selectSession])

  const modeCommands = useMemo(
    () =>
      (modeItems.length ? modeItems : [{ label: 'Classic', token: 'classic' }]).map((m) => ({
        id: `mode:${m.token}`,
        label: `Mode: ${m.label}`,
        run: async () => {
          await useAppStore.getState().setUiMode(m.token)
        },
      })),
    [modeItems],
  )

  const modelCommands = useMemo(
    () =>
      (modelItems.length ? modelItems : []).map((m) => ({
        id: `model:${m.token}`,
        label: `Model: ${m.label}`,
        run: async () => {
          useAppStore.setState({ model: m.token })
          await daemon?.settingsSet({ model: m.token })
        },
      })),
    [modelItems, daemon],
  )

  const workCommands = useMemo(
    () =>
      (['plan', 'build', 'review'] as const).map((w) => ({
        id: `work:${w}`,
        label: `Work: ${w}`,
        run: async () => {
          useAppStore.setState({ workMode: w })
          await daemon?.settingsSet({ workMode: w })
        },
      })),
    [daemon],
  )

  return (
    <>
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

      {/* Command Palette */}
      {!open ? null : (
      <div
        className="fixed inset-0 z-50 grid place-items-start bg-black/20 p-6"
        onMouseDown={() => setOpen(false)}
      >
      <div
        className="w-full max-w-xl rounded-2xl border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-md)] backdrop-blur"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Command className="[&_[cmdk-input]]:w-full [&_[cmdk-input]]:rounded-2xl [&_[cmdk-input]]:border-0 [&_[cmdk-input]]:bg-transparent [&_[cmdk-input]]:px-4 [&_[cmdk-input]]:py-4 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:outline-none">
          <Command.Input autoFocus placeholder="Search... (e.g., mode, model, /help)" />
          <Command.List className="max-h-[420px] overflow-auto p-2">
            <Command.Empty className="px-3 py-4 text-sm text-[color:var(--color-text-secondary)]">
              No results
            </Command.Empty>

            <Command.Group heading="Quick" className="px-2 py-2 text-xs text-[color:var(--color-text-muted)]">
              <Command.Item
                value="New Session"
                onSelect={() => {
                  void (async () => {
                    const id = await createSession('New Session')
                    selectSession(id)
                    setOpen(false)
                  })()
                }}
                className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
              >
                New Session
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-slate-100" />

            <Command.Group heading="Account" className="px-2 py-2 text-xs text-[color:var(--color-text-muted)]">
              {!isLoggedIn ? (
                <>
                  <Command.Item
                    value="login"
                    onSelect={() => {
                      setOpen(false)
                      setLoginMode('login')
                      setShowLoginModal(true)
                    }}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    <div className="font-mono">/login</div>
                    <div className="text-xs text-[color:var(--color-text-muted)]">Login to Snailer account</div>
                  </Command.Item>
                  <Command.Item
                    value="create-account"
                    onSelect={() => {
                      setOpen(false)
                      authService.openCreateAccount()
                    }}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    <div className="font-mono">/create-account</div>
                    <div className="text-xs text-[color:var(--color-text-muted)]">Create new Anthropic account</div>
                  </Command.Item>
                </>
              ) : (
                <>
                  <Command.Item
                    value={`user ${userEmail} ${userName}`}
                    className="cursor-default rounded-xl px-3 py-2 text-sm"
                  >
                    <div className="text-xs text-[color:var(--color-text-muted)]">Currently logged in:</div>
                    <div className="font-medium">{userName || userEmail}</div>
                  </Command.Item>
                  <Command.Item
                    value="switch-account"
                    onSelect={() => {
                      setOpen(false)
                      setLoginMode('switch')
                      setShowLoginModal(true)
                    }}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    <div className="font-mono">/switch-account</div>
                    <div className="text-xs text-[color:var(--color-text-muted)]">Switch to another account</div>
                  </Command.Item>
                  <Command.Item
                    value="logout"
                    onSelect={async () => {
                      setOpen(false)
                      await authService.logout()
                      setIsLoggedIn(false)
                      setUserEmail(null)
                      setUserName(null)
                    }}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    <div className="font-mono">/logout</div>
                    <div className="text-xs text-[color:var(--color-text-muted)]">Logout</div>
                  </Command.Item>
                </>
              )}
            </Command.Group>

            <Command.Separator className="my-2 h-px bg-slate-100" />

            <Command.Group heading="Mode" className="px-2 py-2 text-xs text-[color:var(--color-text-muted)]">
              {modeCommands.map((c) => (
                <Command.Item
                  key={c.id}
                  value={c.label}
                  onSelect={() => {
                    void c.run()
                    setOpen(false)
                  }}
                  className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                >
                  {c.label}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Work" className="px-2 py-2 text-xs text-[color:var(--color-text-muted)]">
              {workCommands.map((c) => (
                <Command.Item
                  key={c.id}
                  value={c.label}
                  onSelect={() => {
                    void c.run()
                    setOpen(false)
                  }}
                  className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                >
                  {c.label}
                </Command.Item>
              ))}
            </Command.Group>

            {modelCommands.length ? (
              <Command.Group heading="Model" className="px-2 py-2 text-xs text-[color:var(--color-text-muted)]">
                {modelCommands.map((c) => (
                  <Command.Item
                    key={c.id}
                    value={c.label}
                    onSelect={() => {
                      void c.run()
                      setOpen(false)
                    }}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                  >
                    {c.label}
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Separator className="my-2 h-px bg-slate-100" />

            <Command.Group heading="Slash" className="px-2 py-2 text-xs text-[color:var(--color-text-muted)]">
              {slashItems.slice(0, 80).map((s) => (
                <Command.Item
                  key={s.cmd}
                  value={`${s.cmd} ${s.desc}`}
                  onSelect={() => {
                    void (async () => {
                      if (s.cmd === '/account') {
                        const res = await daemon?.accountGet()
                        const email = res?.email || userEmail || 'Unknown'
                        const plan = res?.planName ? `${res.planName}` : 'Unknown'
                        const usage =
                          res?.usageUsed != null && res?.usageLimit != null
                            ? `${res.usageUsed} / ${res.usageLimit}`
                            : res?.usageUsed != null
                              ? `${res.usageUsed}`
                              : ''
                        useAppStore.setState({
                          lastToast: {
                            title: `Account: ${email}`,
                            message: res?.planError
                              ? `Plan: ${plan} (error: ${res.planError})`
                              : `Plan: ${plan}${usage ? ` · Usage: ${usage}` : ''}`,
                          },
                        })
                        setOpen(false)
                        return
                      }

                      appendToDraftPrompt(`${s.cmd} `)
                      setOpen(false)
                    })()
                  }}
                  className="cursor-pointer rounded-xl px-3 py-2 text-sm hover:bg-slate-100"
                >
                  <div className="font-mono">{s.cmd}</div>
                  <div className="text-xs text-[color:var(--color-text-muted)]">{s.desc}</div>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
      )}
    </>
  )
}
