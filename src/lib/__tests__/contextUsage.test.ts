import type { ChatMessage } from '../store'
import {
  estimateSessionTokens,
  inferModelContextWindow,
  resolveContextWindowUsage,
} from '../contextUsage'

function msg(content: string): ChatMessage {
  return {
    id: `m-${Math.random()}`,
    role: 'user',
    content,
    createdAt: Date.now(),
  }
}

describe('contextUsage helpers', () => {
  test('infers context window for gpt-5.3-codex', () => {
    expect(inferModelContextWindow('gpt-5.3-codex')).toBe(400_000)
  })

  test('falls back to estimated tokens when live context values are zero', () => {
    const messages = [msg('로그인 문제를 재현하고 원인 분석해줘')]
    const estimated = estimateSessionTokens(messages)
    const resolved = resolveContextWindowUsage({
      liveUsedTokens: 0,
      liveMaxTokens: 0,
      modelToken: 'claude-sonnet-4-6',
      messages,
    })

    expect(resolved.max).toBe(200_000)
    expect(resolved.used).toBe(estimated)
  })
})
