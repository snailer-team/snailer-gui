import { planCycleBroadcasts } from '../elonBroadcastPlanner'
import type { CeoLlmOutput } from '../store'

function llmOutput(broadcasts: Array<{ to: string; message: string; expiresMins: number }>): CeoLlmOutput {
  return {
    cycleSummary: 'summary',
    topLeverage: [],
    broadcasts,
    needsExternalData: false,
  }
}

describe('elonBroadcastPlanner', () => {
  test('uses sanitized CEO broadcasts when available', () => {
    const result = planCycleBroadcasts({
      objective: 'Ship feature',
      constraints: '',
      activeAgentIds: ['pm', 'custom-eng-01'],
      factorySelectedAgentIds: ['custom-eng-01'],
      factoryReason: 'Complexity 30',
      llmOutput: llmOutput([{ to: 'custom-eng-01', message: 'Implement login', expiresMins: 30 }]),
      sanitizedBroadcasts: [{ to: 'custom-eng-01', message: 'Implement login', expiresMins: 30 }],
    })

    expect(result.usedFallback).toBe(false)
    expect(result.directives).toHaveLength(1)
    expect(result.directives[0]?.to).toBe('custom-eng-01')
    expect(result.directives[0]?.message).toContain('Implement login')
  })

  test('falls back to factory selected agents when CEO broadcasts are empty', () => {
    const result = planCycleBroadcasts({
      objective: 'Ship feature',
      constraints: 'security',
      activeAgentIds: ['pm', 'custom-eng-01'],
      factorySelectedAgentIds: ['custom-eng-01'],
      factoryReason: 'Complexity 48 -> target 2',
      llmOutput: llmOutput([]),
      sanitizedBroadcasts: [],
    })

    expect(result.usedFallback).toBe(true)
    expect(result.directives.map((d) => d.to)).toContain('custom-eng-01')
    expect(result.directives[0]?.message).toContain('Factory fallback')
  })
})

