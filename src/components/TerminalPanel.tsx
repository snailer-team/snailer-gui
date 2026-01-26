import { useEffect, useMemo, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import { useAppStore } from '../lib/store'

import 'xterm/css/xterm.css'

export function TerminalPanel() {
  const { sessions, activeSessionId } = useAppStore()
  const session = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  )
  const messages = useMemo(() => session?.messages ?? [], [session?.messages])

  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const lastCountRef = useRef<number>(0)

  useEffect(() => {
    if (!containerRef.current) return

    const term = new Terminal({
      fontSize: 12,
      fontFamily: 'SF Mono, Monaco, Menlo, monospace',
      convertEol: true,
      theme: {
        background: '#ffffff00',
        foreground: '#111827',
      },
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(containerRef.current)
    fit.fit()

    termRef.current = term
    fitRef.current = fit
    lastCountRef.current = 0

    const onResize = () => fit.fit()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [activeSessionId])

  useEffect(() => {
    const term = termRef.current
    if (!term) return
    const start = lastCountRef.current
    const next = messages.slice(start)
    lastCountRef.current = messages.length

    for (const m of next) {
      const prefix = m.role === 'user' ? '> ' : m.role === 'assistant' ? '' : '# '
      term.writeln((prefix + m.content).replace(/\n$/, ''))
    }
  }, [messages])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-black/10 bg-white/60 shadow-sm">
      <div ref={containerRef} className="h-full w-full p-2" />
    </div>
  )
}
