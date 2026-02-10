/**
 * Auth Service for Snailer GUI
 * Handles login, logout, account switching
 * Uses daemon WebSocket RPC for device login flow
 */

import { invoke } from '@tauri-apps/api/core'
import type { DaemonClient } from './daemon'

export interface UserAuth {
  accessToken?: string
  refreshToken?: string
  accountId?: string
  email?: string
  name?: string
  expiresAt?: number
}

export interface DeviceCodeResponse {
  deviceCode: string
  userCode: string
  verificationUri: string
  verificationUriComplete: string
  expiresIn: number
  interval: number
}

export interface TokenResponse {
  accessToken: string
  refreshToken: string
  accountId: string
  email: string
  name: string
  expiresIn: number
}

class AuthService {
  private pollAbortController: AbortController | null = null
  private cachedAuth: UserAuth | null = null
  private daemonClient: DaemonClient | null = null

  setDaemonClient(client: DaemonClient | null) {
    this.daemonClient = client
  }

  private hasTauri(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as unknown as { __TAURI_INTERNALS__?: { invoke?: unknown } }).__TAURI_INTERNALS__?.invoke)
    )
  }

  private hasDaemon(): boolean {
    return this.daemonClient !== null && this.daemonClient.status === 'connected'
  }

  private shouldFallbackToTauri(errorMessage: string): boolean {
    const msg = errorMessage.toLowerCase()
    // Older daemon versions do not expose auth.* RPC methods.
    if (msg.includes('method not found')) return true
    // If daemon transport is flaky, desktop commands can still proceed.
    if (msg.includes('daemon not connected')) return true
    if (msg.includes('request timeout')) return true
    return false
  }

  private isPendingError(errorMessage: string): boolean {
    const msg = errorMessage.toLowerCase()
    return msg.includes('authorization_pending') || msg.includes('pending')
  }

  private isSlowDownError(errorMessage: string): boolean {
    const msg = errorMessage.toLowerCase()
    return msg.includes('slow_down')
  }

  private isExpiredError(errorMessage: string): boolean {
    const msg = errorMessage.toLowerCase()
    return msg.includes('expired_token') || msg.includes('device code expired')
  }

  private isTransientPollError(errorMessage: string): boolean {
    const msg = errorMessage.toLowerCase()
    return (
      msg.includes('unavailable') ||
      msg.includes('deadline exceeded') ||
      msg.includes('timed out') ||
      msg.includes('timeout') ||
      msg.includes('connection reset') ||
      msg.includes('connection refused') ||
      msg.includes('failed to connect')
    )
  }

  private isDeniedError(errorMessage: string): boolean {
    const msg = errorMessage.toLowerCase()
    return msg.includes('access_denied') || msg.includes('authorization_declined')
  }

  private setCachedAuth(auth: UserAuth | null) {
    this.cachedAuth = auth
  }

  async refresh(): Promise<UserAuth | null> {
    if (!this.hasTauri()) return this.cachedAuth
    const res = await invoke<TokenResponse | null>('auth_check')
    if (!res) {
      this.setCachedAuth(null)
      return null
    }
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = res.expiresIn > 0 ? now + res.expiresIn : undefined
    const auth: UserAuth = {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      accountId: res.accountId,
      email: res.email,
      name: res.name,
      expiresAt,
    }
    this.setCachedAuth(auth)
    return auth
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    const auth = this.getStoredAuth()
    if (!auth?.accessToken) return false
    // Check expiration
    if (auth.expiresAt && auth.expiresAt < Date.now() / 1000) {
      return false
    }
    return true
  }

  /**
   * Get stored auth data
   */
  getStoredAuth(): UserAuth | null {
    return this.cachedAuth
  }

  /**
   * Get current user email
   */
  getCurrentEmail(): string | null {
    return this.getStoredAuth()?.email ?? null
  }

  /**
   * Get current user name
   */
  getCurrentName(): string | null {
    return this.getStoredAuth()?.name ?? null
  }

  /**
   * Start device login flow
   * Returns device code info for user to complete auth in browser
   * Uses daemon RPC (auth.createDeviceCode) when connected.
   * Falls back to Tauri command when daemon auth RPC is unavailable.
   */
  async startDeviceLogin(): Promise<DeviceCodeResponse> {
    let daemonError: string | null = null

    // Try daemon RPC first (preferred - handles auth server connection internally)
    if (this.hasDaemon()) {
      try {
        const result = await this.daemonClient!.request<DeviceCodeResponse>('auth.createDeviceCode', {
          clientId: 'snailer-gui',
          scope: 'read write',
        })
        return result
      } catch (e) {
        daemonError = e instanceof Error ? e.message : String(e)
        if (!this.hasTauri() || !this.shouldFallbackToTauri(daemonError)) {
          throw new Error(`Failed to start device login: ${daemonError}`)
        }
      }
    }

    // Fallback to Tauri command (requires SNAILER_AUTH_ADDR)
    try {
      return await invoke<DeviceCodeResponse>('auth_start_device_login')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (daemonError) {
        throw new Error(`Failed to start device login (daemon: ${daemonError}; desktop fallback: ${msg})`)
      }
      throw new Error(`Failed to start device login (desktop app required): ${msg}`)
    }
  }

  /**
   * Poll for device token after user completes browser auth
   * Uses daemon RPC (auth.pollDeviceToken) when connected, falls back to Tauri command
   */
  async pollDeviceToken(
    deviceCode: string,
    interval: number,
    onStatus?: (status: 'pending' | 'complete' | 'expired' | 'error') => void
  ): Promise<TokenResponse | null> {
    this.pollAbortController = new AbortController()
    const maxAttempts = 60 // 5 minutes with 5 second interval
    let attempts = 0
    let currentInterval = interval

    let useDaemon = this.hasDaemon()

    while (attempts < maxAttempts) {
      if (this.pollAbortController.signal.aborted) {
        return null
      }

      await this.sleep(currentInterval * 1000)
      attempts++

      try {
        let result: TokenResponse

        if (useDaemon) {
          try {
            // Use daemon RPC
            result = await this.daemonClient!.request<TokenResponse>('auth.pollDeviceToken', {
              deviceCode,
              clientId: 'snailer-gui',
            })
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            if (!this.hasTauri() || !this.shouldFallbackToTauri(msg)) throw e
            useDaemon = false
            result = await invoke<TokenResponse>('auth_poll_device_token', { deviceCode })
          }
        } else {
          // Fallback to Tauri command
          result = await invoke<TokenResponse>('auth_poll_device_token', { deviceCode })
        }

        onStatus?.('complete')
        const now = Math.floor(Date.now() / 1000)
        this.setCachedAuth({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          accountId: result.accountId,
          email: result.email,
          name: result.name,
          expiresAt: result.expiresIn > 0 ? now + result.expiresIn : undefined,
        })
        return result
      } catch (e) {
        const rawMsg = e instanceof Error ? e.message : String(e)
        if (this.isPendingError(rawMsg)) {
          onStatus?.('pending')
          continue
        }
        if (this.isSlowDownError(rawMsg)) {
          currentInterval = Math.min(currentInterval + 1, 10)
          continue
        }
        if (this.isExpiredError(rawMsg)) {
          onStatus?.('expired')
          return null
        }
        if (this.isTransientPollError(rawMsg)) {
          onStatus?.('pending')
          continue
        }
        if (this.isDeniedError(rawMsg)) {
          onStatus?.('error')
          throw new Error('Login was denied in the browser. Please try again.')
        }
        onStatus?.('error')
        throw new Error(`Failed to complete device login: ${rawMsg}`)
      }
    }

    onStatus?.('expired')
    return null
  }

  /**
   * Cancel ongoing device token polling
   */
  cancelPoll(): void {
    this.pollAbortController?.abort()
    this.pollAbortController = null
  }

  /**
   * Login with API key directly
   */
  async loginWithApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
    // Validate API key format
    if (!apiKey.startsWith('sk-ant-') && !apiKey.startsWith('sk-')) {
      return { success: false, error: 'Invalid API key format. Should start with sk-ant- or sk-' }
    }

    try {
      await invoke('auth_set_api_key', { apiKey })
      this.setCachedAuth({
        accessToken: apiKey,
        refreshToken: '',
        accountId: '',
        email: 'API Key User',
        name: 'API Key',
      })
    } catch {
      return { success: false, error: 'Failed to save API key in secure storage.' }
    }

    return { success: true }
  }

  /**
   * Logout - clear stored auth
   * Uses daemon RPC (auth.logout) when connected, falls back to Tauri command
   */
  async logout(): Promise<void> {
    this.cancelPoll()
    this.setCachedAuth(null)

    // Use daemon RPC if connected
    if (this.hasDaemon()) {
      try {
        await this.daemonClient!.request('auth.logout')
        return
      } catch {
        // Fall through to Tauri command
      }
    }

    // Fallback to Tauri command
    try {
      await invoke('auth_logout')
    } catch {
      // OK if not supported
    }
  }

  /**
   * Open browser for account creation
   */
  openCreateAccount(): void {
    const signupUrl = 'https://console.anthropic.com/signup'
    window.open(signupUrl, '_blank', 'noopener,noreferrer')
  }

  /**
   * Open browser for login
   */
  async openLoginUrl(url: string): Promise<void> {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const authService = new AuthService()
