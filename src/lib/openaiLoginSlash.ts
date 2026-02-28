export type OpenAiLoginStatusSnapshot = {
  connected: boolean
  source: string
  status: string
  storage?: string | null
  expiresAt?: number | null
  hasRefreshToken: boolean
  identity?: string | null
  accountId?: string | null
  scope?: string | null
}

export type OpenAiLoginStartResult = {
  connected: boolean
  browserOpened: boolean
  authorizeUrl: string
  redirectUri: string
  port: number
  warning?: string | null
  status: OpenAiLoginStatusSnapshot
}

export type OpenAiLoginSlashAction = 'start' | 'status' | 'logout' | 'no-browser' | 'help'

export function parseOpenAiLoginSlashCommand(input: string): OpenAiLoginSlashAction | null {
  const trimmed = String(input ?? '').trim()
  if (!trimmed.toLowerCase().startsWith('/openai-login')) return null

  const parts = trimmed.split(/\s+/g).map((p) => p.trim()).filter(Boolean)
  const arg = String(parts[1] ?? '').toLowerCase()

  if (!arg) return 'start'
  if (arg === 'status') return 'status'
  if (arg === 'logout') return 'logout'
  if (arg === 'no-browser' || arg === '--no-browser') return 'no-browser'
  if (arg === 'help') return 'help'
  return 'help'
}

function formatUnixSeconds(ts?: number | null): string {
  if (!ts || !Number.isFinite(ts)) return '—'
  try {
    return new Date(ts * 1000).toLocaleString()
  } catch {
    return '—'
  }
}

export function formatOpenAiLoginStatus(status: OpenAiLoginStatusSnapshot): string {
  return [
    `OpenAI login: ${status.connected ? 'connected' : 'not connected'}`,
    `status: ${status.status || '—'}`,
    `source: ${status.source || '—'}`,
    `identity: ${status.identity || status.accountId || '—'}`,
    `expires: ${formatUnixSeconds(status.expiresAt ?? null)}`,
    `refresh_token: ${status.hasRefreshToken ? 'yes' : 'no'}`,
    `scope: ${status.scope || '—'}`,
  ].join('\n')
}

export const OPENAI_LOGIN_SLASH_HELP = [
  '/openai-login',
  '/openai-login status',
  '/openai-login logout',
  '/openai-login no-browser',
].join('\n')
