/**
 * Auth Service for Snailer GUI
 * Handles login, logout, account switching
 */

import { invoke } from '@tauri-apps/api/core'

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

const AUTH_STORAGE_KEY = 'snailer.auth'
const AUTH_SERVER = 'https://auth.snailer.dev'

class AuthService {
  private pollAbortController: AbortController | null = null

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
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!stored) return null
      return JSON.parse(stored) as UserAuth
    } catch {
      return null
    }
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
   * Save auth data to storage
   */
  private saveAuth(auth: UserAuth): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth))
  }

  /**
   * Clear stored auth data
   */
  private clearAuth(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  /**
   * Start device login flow
   * Returns device code info for user to complete auth in browser
   */
  async startDeviceLogin(): Promise<DeviceCodeResponse> {
    // Try to use Tauri invoke for native gRPC call
    try {
      const result = await invoke<DeviceCodeResponse>('auth_start_device_login')
      return result
    } catch {
      // Fallback: direct HTTP request (for web preview)
      const response = await fetch(`${AUTH_SERVER}/device/code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: 'snailer-gui',
          scope: 'read write',
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to start device login: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        verificationUriComplete: data.verification_uri_complete,
        expiresIn: data.expires_in,
        interval: data.interval || 5,
      }
    }
  }

  /**
   * Poll for device token after user completes browser auth
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

    while (attempts < maxAttempts) {
      if (this.pollAbortController.signal.aborted) {
        return null
      }

      await this.sleep(currentInterval * 1000)
      attempts++

      try {
        // Try Tauri invoke first
        try {
          const result = await invoke<TokenResponse>('auth_poll_device_token', { deviceCode })
          onStatus?.('complete')
          this.saveAuth({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            accountId: result.accountId,
            email: result.email,
            name: result.name,
            expiresAt: Math.floor(Date.now() / 1000) + result.expiresIn,
          })
          return result
        } catch (e) {
          const error = e as Error
          if (error.message?.includes('authorization_pending')) {
            onStatus?.('pending')
            continue
          }
          if (error.message?.includes('slow_down')) {
            currentInterval = Math.min(currentInterval + 1, 10)
            continue
          }
          if (error.message?.includes('expired_token')) {
            onStatus?.('expired')
            return null
          }
          throw e
        }
      } catch {
        // Fallback: HTTP polling
        try {
          const response = await fetch(`${AUTH_SERVER}/device/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: 'snailer-gui',
              device_code: deviceCode,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
          })

          if (response.status === 200) {
            const data = await response.json()
            onStatus?.('complete')
            const auth: UserAuth = {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              accountId: data.account_id,
              email: data.email,
              name: data.name,
              expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
            }
            this.saveAuth(auth)
            return {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              accountId: data.account_id,
              email: data.email,
              name: data.name,
              expiresIn: data.expires_in,
            }
          }

          if (response.status === 428 || response.status === 400) {
            const data = await response.json()
            if (data.error === 'authorization_pending') {
              onStatus?.('pending')
              continue
            }
            if (data.error === 'slow_down') {
              currentInterval = Math.min(currentInterval + 1, 10)
              continue
            }
            if (data.error === 'expired_token') {
              onStatus?.('expired')
              return null
            }
          }
        } catch {
          onStatus?.('error')
        }
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

    // Save as API key auth
    const auth: UserAuth = {
      accessToken: apiKey,
      email: 'API Key User',
      name: 'API Key',
    }

    this.saveAuth(auth)

    // Try to verify with daemon
    try {
      await invoke('auth_set_api_key', { apiKey })
    } catch {
      // OK if daemon doesn't support this
    }

    return { success: true }
  }

  /**
   * Logout - clear stored auth
   */
  async logout(): Promise<void> {
    this.cancelPoll()
    this.clearAuth()

    // Notify daemon
    try {
      await invoke('auth_logout')
    } catch {
      // OK if daemon doesn't support this
    }
  }

  /**
   * Open browser for account creation
   */
  openCreateAccount(): void {
    const signupUrl = 'https://console.anthropic.com/signup'
    window.open(signupUrl, '_blank')
  }

  /**
   * Open browser for login
   */
  async openLoginUrl(url: string): Promise<void> {
    window.open(url, '_blank')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const authService = new AuthService()
