import { useMemo } from 'react'

import { useAppStore } from '../lib/store'
import { ClarifyingQuestionsList, type ClarifyingQuestionData } from './ClarifyingQuestions'

export function ClarifyingPromptPanel() {
  const clarifyingQuestions = useAppStore((s) => s.clarifyingQuestions)
  const answerClarifyingQuestion = useAppStore((s) => s.answerClarifyingQuestion)

  const data: ClarifyingQuestionData[] = useMemo(
    () =>
      clarifyingQuestions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options.map((o) => ({ id: o.id, label: o.label, description: o.description })),
        allowMultiple: q.allowMultiple,
        allowCustom: q.allowCustom,
      })),
    [clarifyingQuestions],
  )

  if (data.length === 0) return null

  return (
    <div className="mx-auto w-full max-w-4xl">
      <ClarifyingQuestionsList
        questions={data}
        onAnswer={(qId, selectedIds, customText) => {
          void answerClarifyingQuestion(qId, selectedIds, customText)
        }}
      />
    </div>
  )
}

