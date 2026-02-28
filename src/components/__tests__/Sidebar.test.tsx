import { act, fireEvent, render, screen } from '@testing-library/react'

import { Sidebar } from '../Sidebar'
import { useAppStore } from '../../lib/store'

jest.mock('../../lib/authService', () => ({
  authService: {
    isLoggedIn: jest.fn(() => false),
    getCurrentEmail: jest.fn(() => null),
    getCurrentName: jest.fn(() => null),
    logout: jest.fn(async () => {}),
  },
}))

jest.mock('../LoginModal', () => ({
  LoginModal: () => null,
}))

describe('Sidebar session menu', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test('opens dot-menu and deletes a session', async () => {
    const createSession = jest.fn(async () => 'new-session-id')
    const deleteSession = jest.fn(async () => undefined)
    const selectSession = jest.fn()

    useAppStore.setState({
      connectionStatus: 'connected',
      daemon: {} as never,
      projectPath: '/tmp/project',
      sessions: [
        {
          id: 's1',
          name: 'New Session',
          updatedAt: Date.now(),
          messages: [{ id: 'm1', role: 'user', content: 'first prompt', createdAt: Date.now() }],
          agentEvents: [],
        },
      ],
      activeSessionId: 's1',
      createSession: createSession as never,
      deleteSession: deleteSession as never,
      selectSession: selectSession as never,
    })

    render(<Sidebar />)

    const actionButtons = screen.getAllByLabelText('Session actions')
    fireEvent.click(actionButtons[0]!)

    const deleteButton = screen.getByRole('button', { name: 'Delete session' })
    expect(deleteButton).toBeInTheDocument()

    fireEvent.click(deleteButton)

    await act(async () => {
      jest.advanceTimersByTime(170)
      await Promise.resolve()
    })

    expect(deleteSession).toHaveBeenCalledWith('s1')
  })
})

