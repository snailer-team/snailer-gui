import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { authService, type DeviceCodeResponse } from '../lib/authService'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (email: string, name?: string) => void
  mode?: 'login' | 'switch'
}

type LoginStep = 'select' | 'device' | 'apikey' | 'polling' | 'success' | 'error'

export function LoginModal({ isOpen, onClose, onSuccess, mode = 'login' }: LoginModalProps) {
  const [step, setStep] = useState<LoginStep>('select')
  const [deviceCode, setDeviceCode] = useState<DeviceCodeResponse | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pollStatus, setPollStatus] = useState<string>('Waiting for authentication...')

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select')
      setDeviceCode(null)
      setApiKey('')
      setError(null)
      setCopied(false)
      setPollStatus('Waiting for authentication...')
    } else {
      authService.cancelPoll()
    }
  }, [isOpen])

  const handleDeviceLogin = useCallback(async () => {
    setStep('device')
    setError(null)

    try {
      const code = await authService.startDeviceLogin()
      setDeviceCode(code)
      setStep('polling')

      // Open browser
      await authService.openLoginUrl(code.verificationUriComplete)

      // Start polling
      const result = await authService.pollDeviceToken(code.deviceCode, code.interval, (status) => {
        switch (status) {
          case 'pending':
            setPollStatus('Waiting for authentication...')
            break
          case 'complete':
            setPollStatus('Authentication successful!')
            break
          case 'expired':
            setPollStatus('Device code expired. Please try again.')
            setStep('error')
            setError('Device code expired. Please try again.')
            break
          case 'error':
            setPollStatus('An error occurred. Please try again.')
            setStep('error')
            setError('An error occurred. Please try again.')
            break
        }
      })

      if (result) {
        setStep('success')
        setTimeout(() => {
          onSuccess(result.email, result.name)
          onClose()
        }, 1500)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start device login')
      setStep('error')
    }
  }, [onSuccess, onClose])

  const handleApiKeyLogin = useCallback(async () => {
    if (!apiKey.trim()) return

    const result = await authService.loginWithApiKey(apiKey.trim())
    if (result.success) {
      setStep('success')
      setTimeout(() => {
        onSuccess('API Key User', 'API Key')
        onClose()
      }, 1000)
    } else {
      setError(result.error || 'Failed to login with API key')
      setStep('error')
    }
  }, [apiKey, onSuccess, onClose])

  const handleCopyUserCode = useCallback(async () => {
    if (!deviceCode?.userCode) return
    try {
      await navigator.clipboard.writeText(deviceCode.userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = deviceCode.userCode
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [deviceCode])

  const handleCancel = useCallback(() => {
    authService.cancelPoll()
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-1000 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-[color:var(--color-border)] bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            {mode === 'switch' ? 'Switch Account' : 'Login to Snailer'}
          </h2>
          <button
            onClick={handleCancel}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content based on step */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Choose your login method:</p>

            <button
              onClick={handleDeviceLogin}
              className="flex w-full items-center gap-4 rounded-2xl border border-[color:var(--color-border)] p-4 text-left transition hover:border-black/20 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Login with Browser</div>
                <div className="text-sm text-slate-500">Sign in via your web browser</div>
              </div>
            </button>

            <button
              onClick={() => setStep('apikey')}
              className="flex w-full items-center gap-4 rounded-2xl border border-[color:var(--color-border)] p-4 text-left transition hover:border-black/20 hover:bg-slate-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-semibold">Login with API Key</div>
                <div className="text-sm text-slate-500">Enter your Anthropic API key directly</div>
              </div>
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={() => authService.openCreateAccount()}
                className="text-sm text-blue-600 hover:underline"
              >
                Don't have an account? Create one
              </button>
            </div>
          </div>
        )}

        {step === 'device' && (
          <div className="flex flex-col items-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            <p className="mt-4 text-slate-600">Starting device login...</p>
          </div>
        )}

        {step === 'polling' && deviceCode && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[#f8fafc] p-4">
              <p className="mb-2 text-sm text-slate-500">Your verification code:</p>
              <div className="flex items-center justify-between">
                <code className="text-2xl font-bold tracking-wider">{deviceCode.userCode}</code>
                <button
                  onClick={handleCopyUserCode}
                  className="rounded-xl bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Enter this code in your browser to complete authentication.
              <br />
              The browser should open automatically.
            </p>

            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-500">{pollStatus}</span>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={handleCancel} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button
                variant="default"
                onClick={() => authService.openLoginUrl(deviceCode.verificationUriComplete)}
                className="flex-1 rounded-xl"
              >
                Open Browser
              </Button>
            </div>
          </div>
        )}

        {step === 'apikey' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Enter your Anthropic API key. You can get one from{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Anthropic Console
              </a>
              .
            </p>

            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleApiKeyLogin()
                }
              }}
              placeholder="sk-ant-..."
              className="w-full rounded-xl border border-[color:var(--color-border)] bg-[#f8fafc] px-4 py-3 font-mono text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              autoFocus
            />

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep('select')} className="flex-1 rounded-xl">
                Back
              </Button>
              <Button
                variant="primary"
                onClick={handleApiKeyLogin}
                disabled={!apiKey.trim()}
                className="flex-1 rounded-xl"
              >
                Login
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-800">Login Successful!</p>
            <p className="text-sm text-slate-500">Redirecting...</p>
          </div>
        )}

        {step === 'error' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-800">Login Failed</p>
              <p className="mt-2 text-center text-sm text-slate-500">{error}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleCancel} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setStep('select')} className="flex-1 rounded-xl">
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
