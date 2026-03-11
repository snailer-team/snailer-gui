export type PromptComplexity = 'simple' | 'moderate' | 'complex'
export type PromptLocale = 'ko' | 'en' | 'ja' | 'zh' | 'other'

export interface PromptComplexityDecision {
  score: number
  shouldClarify: boolean
  reasons: string[]
  facets: string[]
  level: PromptComplexity
}

export interface PromptLocaleStrings {
  clarify: string
  confirm: string
  cancel: string
  skip: string
  back: string
  next: string
  submit: string
  answerPlaceholder: string
  questions: string
  questionOf: (index: number, total: number) => string
  other: string
  continueLabel: string
}

export function evaluatePromptComplexity(prompt: string): PromptComplexityDecision {
  const trimmed = String(prompt ?? '').trim()
  const lower = trimmed.toLowerCase()
  const chars = trimmed.length
  const lines = trimmed.split(/\r?\n/).length

  let score = 0
  const reasons: string[] = []
  const facets = ['intent', 'scope', 'constraints']

  if (chars >= 150) {
    score += 2
    reasons.push('prompt_length>=150')
  }
  if (chars >= 350) {
    score += 2
    reasons.push('prompt_length>=350')
  }
  if (lines >= 3) {
    score += 1
    reasons.push('multi_line_prompt')
  }

  const complexityKeywords = [
    'refactor',
    'integrate',
    'architecture',
    'migrate',
    'rework',
    'end-to-end',
    'e2e',
    'performance',
    'security',
    'queue',
    'async',
    'orchestrator',
    '리팩토링',
    '통합',
    '아키텍처',
    '마이그레이션',
  ]
  const matchedKeywords = complexityKeywords.filter((kw) => lower.includes(kw))
  if (matchedKeywords.length > 0) {
    score += 2
    reasons.push(`complexity_keywords=${matchedKeywords.join(',')}`)
    facets.push('risk')
  }

  const separators = [' and ', ' then ', ' also ', ' plus ', '그리고', '또', '그리고 나서']
  const separatorHits = separators.filter((sep) => lower.includes(sep)).length
  if (separatorHits >= 1) {
    score += 1
    reasons.push('multi_goal_signal')
    facets.push('prioritization')
  }

  const ambiguityTerms = [
    'improve',
    'optimize',
    'clean up',
    'better',
    'nicely',
    'overall',
    '적당히',
    '전반적으로',
    '깔끔하게',
    '좋게',
  ]
  const ambiguityHits = ambiguityTerms.filter((term) => lower.includes(term)).length
  if (ambiguityHits > 0) {
    score += 2
    reasons.push(`ambiguity_terms=${ambiguityHits}`)
    facets.push('acceptance_criteria')
  }

  const shouldClarify = score >= 3 || (chars >= 120 && ambiguityHits > 0) || matchedKeywords.length >= 2
  const level: PromptComplexity = shouldClarify ? 'complex' : score >= 2 ? 'moderate' : 'simple'

  return {
    score,
    shouldClarify,
    reasons,
    facets: [...new Set(facets)].sort(),
    level,
  }
}

export function classifyPromptComplexity(prompt: string): PromptComplexity {
  return evaluatePromptComplexity(prompt).level
}

export function detectPromptLocale(prompt: string): PromptLocale {
  const text = String(prompt ?? '')
  if (/[가-힣]/.test(text)) return 'ko'
  if (/[ぁ-んァ-ヶ]/.test(text)) return 'ja'
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'
  if (/[A-Za-z]/.test(text)) return 'en'
  return 'other'
}

export function getPromptLocaleStrings(locale: PromptLocale): PromptLocaleStrings {
  if (locale === 'ko') {
    return {
      clarify: 'Clarifying Process',
      confirm: '확인',
      cancel: '취소',
      skip: '건너뛰기',
      back: '이전',
      next: '다음',
      submit: '작업 시작',
      answerPlaceholder: '답변을 입력하세요…',
      questions: '질문',
      questionOf: (index, total) => `${index} / ${total}`,
      other: '직접 입력',
      continueLabel: '계속',
    }
  }
  if (locale === 'ja') {
    return {
      clarify: 'Clarifying Process',
      confirm: '確認',
      cancel: 'キャンセル',
      skip: 'スキップ',
      back: '戻る',
      next: '次へ',
      submit: '開始',
      answerPlaceholder: '回答を入力してください…',
      questions: '質問',
      questionOf: (index, total) => `${index} / ${total}`,
      other: 'その他',
      continueLabel: '続行',
    }
  }
  if (locale === 'zh') {
    return {
      clarify: 'Clarifying Process',
      confirm: '确认',
      cancel: '取消',
      skip: '跳过',
      back: '返回',
      next: '下一步',
      submit: '开始执行',
      answerPlaceholder: '请输入你的回答…',
      questions: '问题',
      questionOf: (index, total) => `${index} / ${total}`,
      other: '其他',
      continueLabel: '继续',
    }
  }
  return {
    clarify: 'Clarifying Process',
    confirm: 'Confirm',
    cancel: 'Cancel',
    skip: 'Skip',
    back: 'Back',
    next: 'Next',
    submit: 'Start task',
    answerPlaceholder: 'Type your answer…',
    questions: 'Questions',
    questionOf: (index, total) => `${index} / ${total}`,
    other: 'Other',
    continueLabel: 'Continue',
  }
}
