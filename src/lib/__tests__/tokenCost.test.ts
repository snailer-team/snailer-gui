import { calculateTokenCost } from '../store'

describe('calculateTokenCost', () => {
  test('applies GPT-5.3-Codex pricing for input/output tokens', () => {
    const cost = calculateTokenCost('gpt-5.3-codex', 1_000_000, 1_000_000)
    expect(cost).toBeCloseTo(15.75, 6) // 1.75 + 14.00
  })

  test('uses cached input pricing when cached input tokens are provided', () => {
    const cost = calculateTokenCost('gpt-5-3-codex', 1_000_000, 0, 500_000)
    // 500k uncached @ 1.75 + 500k cached @ 0.175 = 0.875 + 0.0875
    expect(cost).toBeCloseTo(0.9625, 6)
  })
})
