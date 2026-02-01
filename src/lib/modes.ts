export const UI_MODE_STORAGE_KEY = 'snailer.uiMode'

export type UiModeToken = 'classic' | 'team-orchestrator' | 'elon'

export function isUiModeToken(v: string): v is UiModeToken {
  return v === 'classic' || v === 'team-orchestrator' || v === 'elon'
}

export function loadPersistedUiMode(): UiModeToken | null {
  try {
    const v = window.localStorage.getItem(UI_MODE_STORAGE_KEY)
    if (v && isUiModeToken(v)) return v
    return null
  } catch {
    return null
  }
}

export function persistUiMode(mode: UiModeToken) {
  try {
    window.localStorage.setItem(UI_MODE_STORAGE_KEY, mode)
  } catch {
    // ignore (e.g., storage blocked)
  }
}

export function uiModeToDaemonMode(mode: UiModeToken): 'classic' | 'team-orchestrator' {
  return mode === 'elon' ? 'classic' : mode
}

export function ensureElonModeItem(items: Array<{ label: string; token: string }>): Array<{ label: string; token: string }> {
  if (items.some((m) => m.token === 'elon')) return items
  return [...items, { label: 'ElonX HARD', token: 'elon' }]
}

export function applyElonPromptPrefix(prompt: string): string {
  return applyElonPromptPrefixWithFrame(prompt)
}

export type ElonFrame = {
  problem?: string
  constraints?: string
  verification?: string
}

export function applyElonPromptPrefixWithFrame(prompt: string, frame?: ElonFrame): string {
  const lines: string[] = ['ElonX HARD:']
  const problem = frame?.problem?.trim()
  const constraints = frame?.constraints?.trim()
  const verification = frame?.verification?.trim()
  if (problem) lines.push(`Problem: ${problem}`)
  if (constraints) lines.push(`Constraints: ${constraints}`)
  if (verification) lines.push(`Verification: ${verification}`)
  lines.push(
    '- Keep it short & sharp. No fluff.',
    '- Use first principles: challenge assumptions, reduce to fundamentals.',
    '- Optimize for speed and correctness. Prefer simple, high-leverage changes.',
    '- If uncertain, ask the minimum clarifying questions, then proceed.',
  )
  return `${lines.join('\n')}\n\n${prompt}`
}
