import { fireEvent, render, screen } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { AgentEmployeesPanel } from '../AgentEmployeesPanel'
import { useAppStore } from '../../../lib/store'
import type { AgentEmployee, AgentTemplate } from '../../../lib/elonAgentRegistry'

jest.mock('sonner', () => ({
  toast: jest.fn(),
}))
jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}))

function employee(id: string): AgentEmployee {
  return {
    id,
    displayName: id,
    category: 'Engineering',
    roleTemplateId: 'wf:swe',
    autonomyLevel: 'high',
    toolScopes: ['terminal'],
    modelPolicy: { mode: 'auto' },
    maxParallelTasks: 1,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function template(id: string): AgentTemplate {
  return {
    templateId: `wf:${id}`,
    workflowId: id,
    promptBase: `${id} prompt`,
    defaultTools: ['terminal'],
    normProfile: 'default',
  }
}

describe('AgentEmployeesPanel', () => {
  const originalCrypto = globalThis.crypto
  let uuidSeq = 0

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(originalCrypto ?? {}),
        randomUUID: () => `agent-ui-uuid-${++uuidSeq}`,
      },
    })
  })

  afterAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    })
  })

  beforeEach(() => {
    localStorage.clear()
    const s = useAppStore.getState()
    ;(invoke as jest.Mock).mockReset()
    useAppStore.setState({
      daemon: {} as never,
      activeSessionId: 'session-ui-test',
      projectPath: '',
      prMode: false,
      elonFrame: {
        collapsed: false,
        problem: 'Autonomous UI-added assignment',
        constraints: 'safety and quality',
        verification: 'cycle complete',
      },
      elonRegistry: {
        agentEmployees: [employee('swe')],
        agentTemplates: [template('swe'), template('qa')],
        agentLifecycleEvents: [],
        agentAssignmentDecisions: [],
      },
      elonX: {
        ...s.elonX,
      },
    })
  })

  test('adds agent employee from UI form', () => {
    render(<AgentEmployeesPanel />)

    fireEvent.change(screen.getByPlaceholderText('eng-backend-04'), {
      target: { value: 'ui-added-eng-01' },
    })
    fireEvent.change(screen.getByPlaceholderText('Backend Engineer #4'), {
      target: { value: 'UI Added Engineer' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }))

    const ids = useAppStore.getState().elonRegistry.agentEmployees.map((e) => e.id)
    expect(ids).toContain('ui-added-eng-01')
  })

  test('terminate action is disabled while frame lock is enabled', () => {
    useAppStore.setState((st) => ({
      elonFrame: {
        ...st.elonFrame,
        collapsed: true,
      },
    }))
    render(<AgentEmployeesPanel />)

    const terminate = screen.getByRole('button', { name: 'Terminate' })
    expect(terminate).toBeDisabled()
  })

  test('UI-only add can flow into next auto-cycle assignment', async () => {
    const s = useAppStore.getState()
    useAppStore.setState({
      elonFrame: {
        collapsed: true,
        problem: 'Autonomous UI-added assignment',
        constraints: 'safety and quality',
        verification: 'cycle complete',
      },
      elonRegistry: {
        agentEmployees: [],
        agentTemplates: [template('custom-eng-ui-01')],
        agentLifecycleEvents: [],
        agentAssignmentDecisions: [],
      },
      elonX: {
        ...s.elonX,
        broadcasts: [],
        cycleRuns: [],
        agentStatuses: {},
      },
    })

    ;(invoke as jest.Mock).mockImplementation(async (command: string) => {
      if (command === 'xai_chat_completion') {
        return {
          content: JSON.stringify({
            cycleSummary: 'No leverage returned',
            topLeverage: [],
            broadcasts: [],
            needsExternalData: false,
          }),
          model: 'grok-4-1-fast',
          input_tokens: 100,
          output_tokens: 60,
        }
      }
      if (command === 'openai_chat_completion') {
        return {
          content: JSON.stringify({
            actions: [{ type: 'plan', title: 'Execute', detail: 'Done' }],
            status: 'completed',
            output: 'Completed by ui-added agent',
            improvements: ['Improved cycle output'],
          }),
          model: 'gpt-4o-mini',
          input_tokens: 60,
          output_tokens: 50,
        }
      }
      throw new Error(`Unexpected invoke command in test: ${command}`)
    })

    render(<AgentEmployeesPanel />)
    fireEvent.change(screen.getByPlaceholderText('eng-backend-04'), {
      target: { value: 'custom-eng-ui-01' },
    })
    fireEvent.change(screen.getByPlaceholderText('Backend Engineer #4'), {
      target: { value: 'Custom Eng UI 01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add employee' }))

    await useAppStore.getState().autoCycleRunNow()
    const state = useAppStore.getState()
    expect(
      state.elonRegistry.agentAssignmentDecisions.some(
        (d) => d.agentId === 'custom-eng-ui-01' && d.selectedBy === 'ceo',
      ),
    ).toBe(true)
    expect(state.elonX.agentStatuses['custom-eng-ui-01']?.lastOutput).toContain('Completed by ui-added agent')
  })
})
