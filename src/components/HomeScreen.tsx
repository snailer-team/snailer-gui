import { useEffect, useMemo, useState } from 'react'

import { useAppStore } from '../lib/store'
import { InputBar } from './InputBar'

function Mascot() {
  const [lifted, setLifted] = useState(false)
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    const bob = window.setInterval(() => setLifted((v) => !v), 1400)
    const eye = window.setInterval(() => {
      setBlink(true)
      window.setTimeout(() => setBlink(false), 140)
    }, 3400)
    return () => {
      window.clearInterval(bob)
      window.clearInterval(eye)
    }
  }, [])

  return (
    <div
      className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--color-border)] bg-white shadow-[var(--shadow-sm)] transition-transform duration-700 ease-in-out"
      style={{ transform: lifted ? 'translateY(-3px) scale(1.02)' : 'translateY(0px) scale(1)' }}
    >
      <span className="pointer-events-none absolute left-2 top-2 h-1.5 w-1.5 rounded-[2px] bg-slate-300/70 animate-pulse" />
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-1.5 w-1.5 rounded-[2px] bg-slate-400/70 animate-pulse"
        style={{ animationDelay: '460ms' }}
      />
      <svg width="40" height="40" viewBox="0 0 32 32" fill="none" style={{ imageRendering: 'pixelated' }} aria-hidden>
        <rect x="15" y="3" width="2" height="2" fill="#0f172a" />
        <rect x="17" y="3" width="2" height="2" fill="#0f172a" />
        <rect x="13" y="5" width="2" height="2" fill="#0f172a" />
        <rect x="19" y="5" width="2" height="2" fill="#0f172a" />
        <rect x="11" y="7" width="2" height="2" fill="#0f172a" />
        <rect x="21" y="7" width="2" height="2" fill="#0f172a" />
        <rect x="11" y="9" width="2" height="2" fill="#0f172a" />
        <rect x="21" y="9" width="2" height="2" fill="#0f172a" />
        <rect x="13" y="11" width="2" height="2" fill="#0f172a" />
        <rect x="19" y="11" width="2" height="2" fill="#0f172a" />
        <rect x="15" y="13" width="2" height="2" fill="#0f172a" />
        <rect x="17" y="13" width="2" height="2" fill="#0f172a" />

        <rect x="15" y="5" width="2" height="2" fill="#334155" />
        <rect x="17" y="5" width="2" height="2" fill="#475569" />
        <rect x="13" y="7" width="2" height="2" fill="#475569" />
        <rect x="15" y="7" width="2" height="2" fill="#1f2937" />
        <rect x="17" y="7" width="2" height="2" fill="#111827" />
        <rect x="19" y="7" width="2" height="2" fill="#475569" />
        <rect x="13" y="9" width="2" height="2" fill="#64748b" />
        <rect x="15" y="9" width="2" height="2" fill="#334155" />
        <rect x="17" y="9" width="2" height="2" fill="#1f2937" />
        <rect x="19" y="9" width="2" height="2" fill="#64748b" />

        <rect x="5" y="13" width="2" height="2" fill="#111827" />
        <rect x="7" y="13" width="2" height="2" fill="#1f2937" />
        <rect x="9" y="13" width="2" height="2" fill="#334155" />
        <rect x="11" y="13" width="2" height="2" fill="#334155" />
        <rect x="5" y="15" width="2" height="2" fill="#111827" />
        <rect x="7" y="15" width="2" height="2" fill="#1f2937" />
        <rect x="9" y="15" width="2" height="2" fill="#334155" />
        <rect x="11" y="15" width="2" height="2" fill="#475569" />

        <rect x="4" y="11" width="2" height="2" fill="#111827" />
        <rect x="6" y="11" width="2" height="2" fill="#1f2937" />
        <rect x="5" y="12" width="1" height="1" fill={blink ? '#94a3b8' : '#f8fafc'} />
      </svg>
    </div>
  )
}

function baseName(p: string) {
  const cleaned = (p || '').replace(/\/$/, '')
  const parts = cleaned.split('/')
  return parts[parts.length - 1] || cleaned || 'snailer-gui'
}

export function HomeScreen() {
  const { projectPath, setDraftPrompt } = useAppStore()

  const folderLabel = useMemo(() => baseName(projectPath), [projectPath])
  const suggestions = useMemo(
    () => [
      'Build a classic Snake game in this repo.',
      'Create a one-page PDF summary of this app.',
      "Summarize last week\'s PRs by teammate and theme.",
    ],
    [],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex-1 overflow-hidden px-6 pt-4 sm:px-10">
        <div className="pointer-events-none absolute left-1/2 top-[22%] h-44 w-44 -translate-x-1/2 rounded-full bg-slate-200/55 blur-3xl" />

        <div className="flex h-full flex-col">
          <div className="flex-1 grid place-items-center">
            <div className="-mt-12 text-center">
              <div className="mb-5 flex justify-center">
                <Mascot />
              </div>
              <h1 className="text-[48px] font-semibold tracking-tight text-slate-900">Let&apos;s build</h1>
              <div className="mt-1 text-[16px] font-medium text-slate-500">{folderLabel}</div>
            </div>
          </div>

          <div className="mx-auto mb-3 w-full max-w-[760px]">
            <div className="mb-2 flex items-center justify-end text-[13px] text-slate-500">Explore more</div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setDraftPrompt(s)}
                  className="rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-left text-[13px] text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="pb-3">
            <InputBar />
          </div>
        </div>
      </div>
    </div>
  )
}
