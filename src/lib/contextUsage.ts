import type { ChatMessage } from './store'

const DEFAULT_CONTEXT_WINDOW = 200_000

export function inferModelContextWindow(modelToken: string): number {
  const normalized = String(modelToken || '').trim().toLowerCase()
  if (!normalized) return DEFAULT_CONTEXT_WINDOW
  if (normalized.includes('gpt-5.3-codex')) return 400_000
  if (normalized.includes('gpt-5')) return 400_000
  if (normalized.includes('claude')) return 200_000
  if (normalized.includes('kimi')) return 128_000
  if (normalized.includes('minimax')) return 128_000
  if (normalized.includes('gpt-4o')) return 128_000
  return DEFAULT_CONTEXT_WINDOW
}

export function estimateTextTokens(text: string): number {
  const raw = String(text ?? '')
  if (!raw) return 0
  const bytes =
    typeof TextEncoder !== 'undefined'
      ? new TextEncoder().encode(raw).length
      : raw.length * 2
  // Empirical coarse estimate for multilingual prompts: ~3.2 bytes/token
  return Math.max(1, Math.ceil(bytes / 3.2))
}

export function estimateSessionTokens(messages: ChatMessage[]): number {
  let total = 0
  for (const message of messages) {
    total += estimateTextTokens(message.content)
    total += 8 // role/metadata overhead
    if (message.attachments?.length) {
      for (const attachment of message.attachments) {
        total += estimateTextTokens(attachment.name)
      }
    }
  }
  return total
}

export function resolveContextWindowUsage(params: {
  liveUsedTokens: number
  liveMaxTokens: number
  modelToken: string
  messages: ChatMessage[]
}) {
  const estimatedUsed = estimateSessionTokens(params.messages)
  const inferredMax = inferModelContextWindow(params.modelToken)
  const max = params.liveMaxTokens > 0 ? params.liveMaxTokens : inferredMax
  const usedCandidate = params.liveUsedTokens > 0 ? params.liveUsedTokens : estimatedUsed
  const used = Math.min(Math.max(0, usedCandidate), max)
  return { used, max }
}
