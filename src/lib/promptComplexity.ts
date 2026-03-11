/**
 * Prompt complexity analysis - mirrors snailer CLI logic (elonAgentFactory.ts)
 * Used to determine clarifying process depth before sending a run.
 */

export type PromptComplexity = 'simple' | 'moderate' | 'complex'

const KEYWORD_WEIGHTS: Array<[RegExp, number]> = [
  [/\b(migrate|refactor|rewrite)\b/g, 8],
  [/\b(security|auth|permission|compliance)\b/g, 7],
  [/\b(performance|latency|scale|scaling|throughput)\b/g, 6],
  [/\b(multi-agent|autonomous|orchestrator|workflow)\b/g, 6],
  [/\b(ci|test|build|deploy|release)\b/g, 5],
  [/\b(ui|ux|design|frontend)\b/g, 4],
  [/\b(api|backend|database|schema)\b/g, 4],
]

export function calculatePromptComplexityScore(prompt: string): number {
  const text = prompt.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean).length
  let score = Math.min(60, Math.round(words * 0.45))
  for (const [rx, weight] of KEYWORD_WEIGHTS) {
    const matches = text.match(rx)
    if (matches) score += matches.length * weight
  }
  return Math.max(5, Math.min(100, score))
}

export function classifyPromptComplexity(prompt: string): PromptComplexity {
  const score = calculatePromptComplexityScore(prompt)
  if (score <= 20) return 'simple'
  if (score <= 50) return 'moderate'
  return 'complex'
}
