import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'

import { SettingsView } from '../SettingsView'
import { useAppStore } from '../../lib/store'

jest.mock('sonner', () => ({
  toast: jest.fn(),
}))

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}))

jest.mock('../../lib/authService', () => ({
  authService: {
    isLoggedIn: jest.fn(() => false),
    getCurrentEmail: jest.fn(() => null),
    getCurrentName: jest.fn(() => null),
    refresh: jest.fn(async () => null),
    logout: jest.fn(async () => undefined),
  },
}))

jest.mock('../LoginModal', () => ({
  LoginModal: () => null,
}))

describe('SettingsView OpenAI login integration', () => {
  beforeEach(() => {
    localStorage.clear()
    ;(invoke as jest.Mock).mockReset()
    ;(invoke as jest.Mock).mockImplementation(async (command: string) => {
      switch (command) {
        case 'env_global_path':
          return '/Users/test/.snailer/.env'
        case 'env_ensure_file_at_path':
          return '/Users/test/.snailer/.env'
        case 'snailer_env_file_set':
          return undefined
        case 'env_find':
          return {
            found: true,
            selectedPath: '/Users/test/.snailer/.env',
            allFoundPaths: ['/Users/test/.snailer/.env'],
            demonstrateOrder: ['/Users/test/.snailer/.env'],
          }
        case 'fs_read_text':
          return 'OPENAI_API_KEY=sk-test\n'
        case 'openai_login_status':
          return {
            connected: false,
            source: 'none',
            status: 'disconnected',
            storage: null,
            expiresAt: null,
            hasRefreshToken: false,
            identity: null,
            accountId: null,
            scope: null,
          }
        case 'openai_login_start':
          return {
            connected: true,
            browserOpened: true,
            authorizeUrl: 'https://auth.openai.com',
            redirectUri: 'http://127.0.0.1:1455/callback',
            port: 1455,
            status: {
              connected: true,
              source: 'oauth',
              status: 'connected',
              storage: 'keyring',
              expiresAt: 9999999999,
              hasRefreshToken: true,
              identity: 'tester@example.com',
              accountId: 'acc_test',
              scope: 'openid profile',
            },
          }
        case 'engine_kill':
          return undefined
        case 'budget_get_status':
          return {
            plan: 'free',
            isStarter: false,
            envMainOverride: null,
            mainLimitUsd: 50,
            mainSpentUsd: 2,
            minimaxLimitUsd: 0,
            minimaxSpentUsd: 0,
            month: 2,
            year: 2026,
          }
        case 'snailer_cli_status':
          return {
            installed: true,
            cliPath: '/Users/test/.snailer/bin/snailer',
            npmAvailable: true,
            usingBundledNode: false,
            bundledNodePath: null,
            prefixDir: '/Users/test/.snailer',
          }
        default:
          return undefined
      }
    })

    const s = useAppStore.getState()
    useAppStore.setState({
      daemon: null,
      connect: jest.fn(async () => undefined),
      projectPath: '/tmp/project',
      mode: 'classic',
      model: 'gpt-5.3-codex',
      sessions: [],
      activeSessionId: null,
      orchestrator: {
        ...s.orchestrator,
        contextBudget: {
          ...s.orchestrator.contextBudget,
          windowUsedTokens: 0,
          windowMaxTokens: 0,
        },
      },
    })
  })

  test('shows OpenAI login panel in settings regardless of selected provider', async () => {
    render(<SettingsView />)

    const panel = await screen.findByTestId('openai-login-panel')
    expect(panel).toBeInTheDocument()
    expect(screen.getByText('/openai-login')).toBeInTheDocument()
  })

  test('connect button triggers openai_login_start command', async () => {
    render(<SettingsView />)

    const connectButton = await screen.findByRole('button', { name: 'Connect OpenAI' })
    fireEvent.click(connectButton)

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith(
        'openai_login_start',
        expect.objectContaining({ noBrowser: false }),
      )
    })
  })
})

