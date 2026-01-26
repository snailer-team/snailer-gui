import { useEffect, useMemo, useState } from 'react'

import { Button } from './ui/button'
import { useAppStore } from '../lib/store'
import type { PromptStage } from '../lib/daemon'

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        'inline-flex h-5 w-5 items-center justify-center rounded-md border',
        checked ? 'border-sky-600 bg-sky-600' : 'border-black/15 bg-white',
      ].join(' ')}
    >
      {checked ? (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-white" fill="none">
          <path
            d="M3.5 8.5l2.5 2.5 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  )
}

function Stepper({ stages, index }: { stages: PromptStage[]; index: number }) {
  const items = useMemo(() => [...stages.map((s) => s.name), 'Submit'], [stages])
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-black/70">
      {items.map((label, i) => {
        const active = i === index
        const done = i < index
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={[
                'inline-flex h-5 w-5 items-center justify-center rounded-md text-xs font-semibold',
                done ? 'bg-emerald-600 text-white' : active ? 'bg-sky-600 text-white' : 'bg-black/10 text-black/50',
              ].join(' ')}
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={[active ? 'font-semibold text-black/85' : 'text-black/55'].join(' ')}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function needsInput(stage: PromptStage, selectedIdx: number | null) {
  if (selectedIdx == null) return false
  const opt = stage.options[selectedIdx]
  return Boolean(opt?.requiresInput)
}

export function PromptStageWizard() {
  const wizard = useAppStore((s) => s.promptStageWizard)
  const cancel = useAppStore((s) => s.cancelPromptStageWizard)
  const complete = useAppStore((s) => s.completePromptStageWizard)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Array<string | null>>([])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [customText, setCustomText] = useState('')

  useEffect(() => {
    if (!wizard) return
    setStep(0)
    setAnswers(Array.from({ length: wizard.stages.length }, () => null))
    setSelectedIdx(null)
    setCustomText('')
  }, [wizard?.originalPrompt])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!wizard) return
      if (e.key === 'Escape') {
        e.preventDefault()
        cancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [wizard, cancel])

  if (!wizard) return null

  const stages = wizard.stages
  const isSummary = step >= stages.length
  const totalSteps = stages.length + 1
  const stage = isSummary ? null : stages[step]

  const canNext = (() => {
    if (isSummary) return true
    if (!stage) return false
    if (selectedIdx == null) return false
    if (needsInput(stage, selectedIdx)) return Boolean(customText.trim())
    return true
  })()

  const title = isSummary ? 'Confirm' : stage?.question ?? 'Clarify'

  const submitLabel = step === stages.length - 1 ? 'Next' : 'Next'

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-2xl border border-black/10 bg-white/80 shadow-sm backdrop-blur overflow-hidden">
        <div className="px-5 py-4 border-b border-black/5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-black/80">Clarify</div>
              <div className="mt-1">
                <Stepper stages={stages} index={step} />
              </div>
            </div>
            <div className="text-xs font-mono text-black/50">
              {Math.min(step + 1, totalSteps)} / {totalSteps}
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="text-[15px] font-semibold text-black/85">{title}</div>

          {!isSummary ? (
            <div className="mt-4 space-y-2">
              {stage!.options.map((opt, idx) => {
                const selected = selectedIdx === idx
                return (
                  <button
                    key={`${stage!.name}:${idx}`}
                    onClick={() => {
                      setSelectedIdx(idx)
                      if (!opt.requiresInput) setCustomText('')
                    }}
                    className={[
                      'w-full rounded-xl border px-4 py-3 text-left transition',
                      selected ? 'border-sky-600 bg-sky-50' : 'border-black/10 bg-white hover:bg-black/5',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox checked={selected} />
                        <div>
                          <div className="text-sm font-medium text-black/85">{opt.title}</div>
                          <div className="mt-1 text-xs text-black/55">{opt.description}</div>
                        </div>
                      </div>
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-black/5 px-2 text-xs font-mono text-black/50">
                        {idx + 1}
                      </span>
                    </div>
                  </button>
                )
              })}

              {selectedIdx != null && needsInput(stage!, selectedIdx) ? (
                <div className="mt-3">
                  <input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Type your answer…"
                    className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400"
                    autoFocus
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {stages.map((s, i) => (
                <div key={s.name} className="flex items-start justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-black/55">{s.name}</div>
                    <div className="mt-1 text-sm text-black/80">{answers[i] ?? '(skipped)'}</div>
                  </div>
                  <span className="text-xs font-mono text-black/45">{i + 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-black/5 bg-white/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancel()}
              className="rounded-xl"
            >
              Cancel
            </Button>
            {!isSummary ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = answers.slice()
                  next[step] = null
                  setAnswers(next)
                  setSelectedIdx(null)
                  setCustomText('')
                  setStep(step + 1)
                }}
                className="rounded-xl"
              >
                Skip
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(Math.max(0, step - 1))}
                className="rounded-xl"
              >
                Back
              </Button>
            )}
          </div>

          {!isSummary ? (
            <Button
              variant="primary"
              size="sm"
              disabled={!canNext}
              onClick={() => {
                if (selectedIdx == null) return
                const opt = stage!.options[selectedIdx]
                const v = opt.requiresInput ? customText.trim() : opt.detail
                const next = answers.slice()
                next[step] = v || null
                setAnswers(next)
                setSelectedIdx(null)
                setCustomText('')
                setStep(step + 1)
              }}
              className="rounded-xl"
            >
              {submitLabel} →
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => void complete(answers)}
              className="rounded-xl"
            >
              Submit →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
