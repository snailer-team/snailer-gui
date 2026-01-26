import { useState } from 'react'
import { Button } from './ui/button'

// Question mark icon
function IconQuestion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 6.5a2 2 0 113 1.732V9M8 11.5v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Chevron icons for pagination
function IconChevronUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M4 10l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export interface ClarifyingOption {
  id: string
  label: string
  description?: string
}

export interface ClarifyingQuestionData {
  id: string
  question: string
  options: ClarifyingOption[]
  allowMultiple?: boolean
  allowCustom?: boolean
}

interface ClarifyingQuestionProps {
  question: ClarifyingQuestionData
  questionNumber: number
  totalQuestions: number
  onAnswer: (questionId: string, selectedIds: string[], customText?: string) => void
  onSkip?: (questionId: string) => void
  onPrev?: () => void
  onNext?: () => void
}

// Letter badge component
function LetterBadge({ letter, selected }: { letter: string; selected?: boolean }) {
  return (
    <div
      className={[
        'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors',
        selected
          ? 'bg-amber-500 text-white'
          : 'bg-gray-100 text-gray-500',
      ].join(' ')}
    >
      {letter}
    </div>
  )
}

export function ClarifyingQuestion({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  onSkip,
  onPrev,
  onNext,
}: ClarifyingQuestionProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customText, setCustomText] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  const handleToggle = (optionId: string) => {
    const newSelected = new Set(selected)
    if (question.allowMultiple) {
      if (newSelected.has(optionId)) {
        newSelected.delete(optionId)
      } else {
        newSelected.add(optionId)
      }
    } else {
      newSelected.clear()
      newSelected.add(optionId)
    }
    setSelected(newSelected)
    setShowCustomInput(false)
    setCustomText('')
  }

  const handleOtherClick = () => {
    setShowCustomInput(true)
    setSelected(new Set())
  }

  const handleSubmit = () => {
    if (showCustomInput && customText.trim()) {
      onAnswer(question.id, [], customText.trim())
    } else if (selected.size > 0) {
      onAnswer(question.id, Array.from(selected))
    }
  }

  const canSubmit = selected.size > 0 || (showCustomInput && customText.trim())

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <IconQuestion className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Questions</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-400">
          <button
            onClick={onPrev}
            disabled={questionNumber <= 1}
            className="p-0.5 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <IconChevronUp className="h-4 w-4" />
          </button>
          <span>{questionNumber} of {totalQuestions}</span>
          <button
            onClick={onNext}
            disabled={questionNumber >= totalQuestions}
            className="p-0.5 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <IconChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question content */}
      <div className="px-4 py-4">
        <div className="text-sm font-semibold text-gray-900 mb-4">
          {questionNumber}. {question.question}
        </div>

        {/* Options */}
        <div className="space-y-1">
          {question.options.map((option, index) => {
            const isSelected = selected.has(option.id)
            const letter = letters[index] || String(index + 1)

            return (
              <button
                key={option.id}
                onClick={() => handleToggle(option.id)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                  isSelected
                    ? 'bg-gray-100'
                    : 'hover:bg-gray-50',
                ].join(' ')}
              >
                <LetterBadge letter={letter} selected={isSelected} />
                <span className={[
                  'text-sm',
                  isSelected ? 'font-medium text-gray-900' : 'text-gray-700',
                ].join(' ')}>
                  {option.label}
                </span>
              </button>
            )
          })}

          {/* Other option */}
          {question.allowCustom !== false && (
            <button
              onClick={handleOtherClick}
              className={[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                showCustomInput ? 'bg-gray-100' : 'hover:bg-gray-50',
              ].join(' ')}
            >
              <LetterBadge
                letter={letters[question.options.length] || 'X'}
                selected={showCustomInput}
              />
              <span className={[
                'text-sm',
                showCustomInput ? 'font-medium text-gray-900' : 'text-gray-400',
              ].join(' ')}>
                Other...
              </span>
            </button>
          )}
        </div>

        {/* Custom text input */}
        {showCustomInput && (
          <div className="mt-3 pl-9">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Type your answer..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
        {onSkip && (
          <button
            onClick={() => onSkip(question.id)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Skip
          </button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}

interface ClarifyingQuestionsListProps {
  questions: ClarifyingQuestionData[]
  onAnswer: (questionId: string, selectedIds: string[], customText?: string) => void
  onSkipAll?: () => void
}

export function ClarifyingQuestionsList({ questions, onAnswer, onSkipAll: _onSkipAll }: ClarifyingQuestionsListProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (questions.length === 0) return null

  const currentQuestion = questions[currentIndex]
  if (!currentQuestion) return null

  const handleAnswer = (questionId: string, selectedIds: string[], customText?: string) => {
    onAnswer(questionId, selectedIds, customText)
    // Move to next question or stay if this was the last
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handleSkip = (questionId: string) => {
    // Move to next question
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Last question skipped - trigger skip answer
      onAnswer(questionId, [])
    }
  }

  return (
    <ClarifyingQuestion
      question={currentQuestion}
      questionNumber={currentIndex + 1}
      totalQuestions={questions.length}
      onAnswer={handleAnswer}
      onSkip={handleSkip}
      onPrev={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
      onNext={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
    />
  )
}
