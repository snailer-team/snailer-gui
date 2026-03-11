import {
  detectPromptLocale,
  evaluatePromptComplexity,
} from '../promptComplexity'

describe('promptComplexity', () => {
  test('does not clarify a simple rename prompt', () => {
    const result = evaluatePromptComplexity('rename foo to bar in src/main.rs')
    expect(result.shouldClarify).toBe(false)
    expect(result.level).toBe('simple')
  })

  test('clarifies a complex refactor prompt using CLI parity rules', () => {
    const result = evaluatePromptComplexity(
      '전체 auth 모듈을 리팩토링하고 queue 처리도 통합해줘. 전반적으로 더 좋게 만들고 비동기 흐름도 정리해줘.',
    )
    expect(result.shouldClarify).toBe(true)
    expect(result.level).toBe('complex')
    expect(result.facets).toContain('risk')
    expect(result.facets).toContain('acceptance_criteria')
  })

  test('detects Korean prompt locale', () => {
    expect(detectPromptLocale('한국어로 설명해줘')).toBe('ko')
  })
})
