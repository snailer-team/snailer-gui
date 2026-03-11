import { useEffect, useMemo, useState } from 'react'

import { Button } from './ui/button'
import { useAppStore } from '../lib/store'
import type { PromptStage } from '../lib/daemon'
import { getPromptLocaleStrings } from '../lib/promptComplexity'

function StepRail({ stages, index }: { stages: PromptStage[]; index: number }) {
  const items = useMemo(() => [...stages.map((stage) => stage.name), 'Run'], [stages])

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((label, itemIndex) => {
        const isActive = itemIndex === index
        const isDone = itemIndex < index
        return (
          <div key={`${label}-${itemIndex}`} className="flex items-center gap-2">
            <span
              className={[
                'grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors',
                isDone
                  ? 'bg-emerald-400 text-[#07130d]'
                  : isActive
                    ? 'bg-amber-300 text-[#2a1800]'
                    : 'bg-white/10 text-white/45',
              ].join(' ')}
            >
              {isDone ? '✓' : itemIndex + 1}
            </span>
            <span className={['text-xs uppercase tracking-[0.22em]', isActive ? 'text-white/88' : 'text-white/38'].join(' ')}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function requiresInput(stage: PromptStage, selectedIdx: number | null) {
  if (selectedIdx == null) return false
  return Boolean(stage.options[selectedIdx]?.requiresInput)
}

export function PromptStageWizard() {
  const wizard = useAppStore((state) => state.promptStageWizard)
  const cancel = useAppStore((state) => state.cancelPromptStageWizard)
  const complete = useAppStore((state) => state.completePromptStageWizard)
  const complexity = useAppStore((state) => state.promptComplexity)

  const localeStrings = getPromptLocaleStrings(wizard?.locale ?? 'en')
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
  }, [wizard])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!wizard) return
      if (event.key === 'Escape') {
        event.preventDefault()
        cancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [wizard, cancel])

  if (!wizard) return null

  const stages = wizard.stages
  const isSummary = step >= stages.length
  const currentStage = isSummary ? null : stages[step]
  const totalSteps = stages.length + 1
  const title = isSummary ? localeStrings.confirm : currentStage?.question ?? localeStrings.clarify

  const canContinue = (() => {
    if (isSummary) return true
    if (!currentStage || selectedIdx == null) return false
    if (requiresInput(currentStage, selectedIdx)) return Boolean(customText.trim())
    return true
  })()

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#101216] text-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
        <div className="border-b border-white/8 bg-[radial-gradient(circle_at_top_left,_rgba(249,205,86,0.16),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)] px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/34">
                  {localeStrings.clarify}
                </span>
                {complexity ? (
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]',
                      complexity === 'complex'
                        ? 'bg-rose-400/20 text-rose-200'
                        : complexity === 'moderate'
                          ? 'bg-amber-300/18 text-amber-100'
                          : 'bg-white/10 text-white/52',
                    ].join(' ')}
                  >
                    {complexity}
                  </span>
                ) : null}
              </div>
              <StepRail stages={stages} index={step} />
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-mono text-white/48">
              {localeStrings.questionOf(Math.min(step + 1, totalSteps), totalSteps)}
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="max-w-2xl">
            <div className="text-[26px] font-semibold tracking-tight text-white">{title}</div>
            {wizard.originalPrompt ? (
              <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/60">
                {wizard.originalPrompt}
              </div>
            ) : null}
          </div>

          {!isSummary ? (
            <div className="grid gap-3 md:grid-cols-2">
              {currentStage?.options.map((option, index) => {
                const selected = selectedIdx === index
                return (
                  <button
                    key={`${currentStage.name}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedIdx(index)
                      if (!option.requiresInput) setCustomText('')
                    }}
                    className={[
                      'rounded-[24px] border px-4 py-4 text-left transition duration-200',
                      selected
                        ? 'border-amber-300/70 bg-amber-200/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : 'border-white/8 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.05]',
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="text-base font-semibold text-white">{option.title}</div>
                        <div className="text-sm leading-6 text-white/58">{option.description}</div>
                      </div>
                      <span
                        className={[
                          'grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-semibold',
                          selected ? 'bg-amber-300 text-[#241600]' : 'bg-white/8 text-white/48',
                        ].join(' ')}
                      >
                        {index + 1}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid gap-3">
              {stages.map((stage, index) => (
                <div
                  key={stage.name}
                  className="flex items-start justify-between gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4"
                >
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-white/36">{stage.name}</div>
                    <div className="mt-2 text-sm leading-6 text-white/74">{answers[index] ?? '…'}</div>
                  </div>
                  <div className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-mono text-white/42">{index + 1}</div>
                </div>
              ))}
            </div>
          )}

          {!isSummary && currentStage && requiresInput(currentStage, selectedIdx) ? (
            <div className="rounded-[24px] border border-amber-200/12 bg-black/20 p-4">
              <input
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder={localeStrings.answerPlaceholder}
                className="w-full rounded-[18px] border border-white/8 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50 focus:ring-2 focus:ring-amber-300/20"
                autoFocus
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 bg-black/18 px-6 py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => cancel()} className="rounded-full border border-white/10 bg-white/[0.03] px-4 text-white/72 hover:bg-white/[0.08] hover:text-white">
              {localeStrings.cancel}
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
                className="rounded-full px-4 text-white/52 hover:bg-white/[0.08] hover:text-white"
              >
                {localeStrings.skip}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(Math.max(0, step - 1))}
                className="rounded-full px-4 text-white/52 hover:bg-white/[0.08] hover:text-white"
              >
                {localeStrings.back}
              </Button>
            )}
          </div>

          {!isSummary ? (
            <Button
              variant="primary"
              size="md"
              disabled={!canContinue}
              onClick={() => {
                if (!currentStage || selectedIdx == null) return
                const option = currentStage.options[selectedIdx]
                const value = option.requiresInput ? customText.trim() : option.detail
                const next = answers.slice()
                next[step] = value || null
                setAnswers(next)
                setSelectedIdx(null)
                setCustomText('')
                setStep(step + 1)
              }}
              className="rounded-full bg-[#f0c14b] px-5 text-[#18120a] hover:bg-[#f6cf63]"
            >
              {localeStrings.next}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => void complete(answers)}
              className="rounded-full bg-[#4ade80] px-5 text-[#072111] hover:bg-[#64ec92]"
            >
              {localeStrings.submit}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
