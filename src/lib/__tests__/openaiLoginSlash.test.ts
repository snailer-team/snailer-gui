import {
  formatOpenAiLoginStatus,
  parseOpenAiLoginSlashCommand,
} from '../openaiLoginSlash'

describe('openai login slash command parsing', () => {
  test('parses base command', () => {
    expect(parseOpenAiLoginSlashCommand('/openai-login')).toBe('start')
  })

  test('parses status/logout/no-browser variants', () => {
    expect(parseOpenAiLoginSlashCommand('/openai-login status')).toBe('status')
    expect(parseOpenAiLoginSlashCommand('/openai-login logout')).toBe('logout')
    expect(parseOpenAiLoginSlashCommand('/openai-login --no-browser')).toBe('no-browser')
  })

  test('formats status text', () => {
    const text = formatOpenAiLoginStatus({
      connected: true,
      source: 'oauth',
      status: 'connected',
      hasRefreshToken: true,
      identity: 'dev@example.com',
      expiresAt: 1_800_000_000,
    })
    expect(text).toContain('OpenAI login: connected')
    expect(text).toContain('source: oauth')
    expect(text).toContain('identity: dev@example.com')
  })
})
