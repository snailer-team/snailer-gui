import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../store'
import type { AgentEmployee, AgentTemplate } from '../elonAgentRegistry'

jest.mock('@tauri-apps/api/core', () => ({
  invoke: jest.fn(),
}))

function employee(id: string): AgentEmployee {
  return {
    id,
    displayName: id,
    category: 'Engineering',
    roleTemplateId: `wf:${id}`,
    autonomyLevel: 'high',
    toolScopes: ['terminal'],
    modelPolicy: { mode: 'auto' },
    maxParallelTasks: 1,
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

function template(id: string, normProfile: 'strict' | 'default' | 'fast' = 'default'): AgentTemplate {
  return {
    templateId: `wf:${id}`,
    workflowId: id,
    promptBase: `${id} prompt`,
    defaultTools: ['terminal'],
    normProfile,
  }
}

describe('elon auto-cycle integration', () => {
  const originalCrypto = globalThis.crypto
  let uuidSeq = 0

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        ...(originalCrypto ?? {}),
        randomUUID: () => `test-uuid-${++uuidSeq}`,
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
    ;(invoke as jest.Mock).mockReset()
    const s = useAppStore.getState()
    useAppStore.setState({
      daemon: {} as never,
      activeSessionId: 'session-test',
      projectPath: '',
      prMode: false,
      elonFrame: {
        collapsed: true,
        problem: 'Implement autonomous cycle routing',
        constraints: 'security and quality',
        verification: 'cycle completes with assignment',
      },
      elonRegistry: {
        agentEmployees: [employee('custom-eng-ui-01')],
        agentTemplates: [template('custom-eng-ui-01', 'default')],
        agentLifecycleEvents: [],
        agentAssignmentDecisions: [],
      },
      elonX: {
        ...s.elonX,
        autoCycle: {
          ...s.elonX.autoCycle,
          enabled: false,
          status: 'idle',
          consecutiveFailures: 0,
          nextRunAt: null,
          lastRunAt: null,
        },
        broadcasts: [],
        cycleRuns: [],
        agentStatuses: {},
        reasoningTraces: [],
        knowledgeBase: [],
        directMessages: [],
        agentTokenUsages: [],
        metrics: {
          ...s.elonX.metrics,
          cycleStartMs: 0,
          autonomyRate: 100,
          loaLevel: 'L5',
          completedTasks: 0,
          totalTasks: 0,
          estimatedCost: 0,
          interventions: 0,
          lastCycleViolationCount: 0,
          lastCycleNormDecisionCount: 0,
          lastFactoryHeadcount: 0,
          lastFactoryComplexityScore: 0,
          lastFactoryReason: '',
          totalInputTokens: 0,
          totalOutputTokens: 0,
        },
      },
    })
  })

  test('UI-added employee gets factory assignment and cycle completes', async () => {
    const seenStatuses: string[] = []
    let prevStatus: string | undefined
    const unsubscribe = useAppStore.subscribe((nextState) => {
      const status = nextState.elonX.agentStatuses['custom-eng-ui-01']?.status
      if (!status || status === prevStatus) return
      prevStatus = status
      seenStatuses.push(status)
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
          input_tokens: 120,
          output_tokens: 80,
        }
      }
      if (command === 'openai_chat_completion') {
        return {
          content: JSON.stringify({
            actions: [{ type: 'plan', title: 'Plan next task', detail: 'Prepared next step' }],
            status: 'completed',
            output: 'Completed by custom agent',
            improvements: ['Improved assignment stability'],
          }),
          model: 'gpt-4o-mini',
          input_tokens: 80,
          output_tokens: 60,
        }
      }
      throw new Error(`Unexpected invoke command in test: ${command}`)
    })

    await useAppStore.getState().autoCycleRunNow()
    unsubscribe()

    const state = useAppStore.getState()
    expect(state.elonX.cycleRuns[0]?.status).toBe('completed')
    expect(state.elonX.broadcasts.some((b) => b.toAgentIds.includes('custom-eng-ui-01'))).toBe(true)
    expect(
      state.elonRegistry.agentAssignmentDecisions.some(
        (d) => d.agentId === 'custom-eng-ui-01' && d.selectedBy === 'factory',
      ),
    ).toBe(true)
    expect(
      state.elonRegistry.agentAssignmentDecisions.some(
        (d) => d.agentId === 'custom-eng-ui-01' && d.selectedBy === 'ceo',
      ),
    ).toBe(true)
    expect(state.elonX.metrics.completedTasks).toBeGreaterThan(0)
    expect(state.elonX.agentStatuses['custom-eng-ui-01']?.status).toBe('idle')
    expect(state.elonX.agentStatuses['custom-eng-ui-01']?.lastOutput).toContain('Completed by custom agent')
    expect(seenStatuses).toContain('planning')
    expect(seenStatuses).toContain('acting')
  })

  test('cycle selection state can be linked to right panel filters', () => {
    const store = useAppStore.getState()
    expect(store.elonX.selectedCycleRunId).toBeNull()

    store.elonSelectCycleRun('cycle-abc-123')
    expect(useAppStore.getState().elonX.selectedCycleRunId).toBe('cycle-abc-123')

    useAppStore.getState().elonSelectCycleRun(null)
    expect(useAppStore.getState().elonX.selectedCycleRunId).toBeNull()
  })

  test('disable blocks assignment immediately and reactivate restores assignment', async () => {
    const s = useAppStore.getState()
    useAppStore.setState({
      elonRegistry: {
        agentEmployees: [employee('pm'), employee('custom-eng-ui-01')],
        agentTemplates: [template('pm', 'default'), template('custom-eng-ui-01', 'default')],
        agentLifecycleEvents: [],
        agentAssignmentDecisions: [],
      },
      elonX: {
        ...s.elonX,
        broadcasts: [],
        cycleRuns: [],
        agentStatuses: {},
        metrics: {
          ...s.elonX.metrics,
          completedTasks: 0,
          totalTasks: 0,
        },
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
          input_tokens: 120,
          output_tokens: 80,
        }
      }
      if (command === 'xai_web_search_completion') {
        return {
          content: JSON.stringify({
            actions: [{ type: 'plan', title: 'PM planning', detail: 'Planned next step' }],
            status: 'completed',
            output: 'PM completed',
            improvements: ['PM improvement'],
          }),
          model: 'grok-4-1-fast',
          input_tokens: 50,
          output_tokens: 40,
        }
      }
      if (command === 'openai_chat_completion') {
        return {
          content: JSON.stringify({
            actions: [{ type: 'plan', title: 'Eng planning', detail: 'Prepared next step' }],
            status: 'completed',
            output: 'Eng completed',
            improvements: ['Eng improvement'],
          }),
          model: 'gpt-4o-mini',
          input_tokens: 80,
          output_tokens: 60,
        }
      }
      throw new Error(`Unexpected invoke command in test: ${command}`)
    })

    // Run #1: both active, custom should be assigned.
    await useAppStore.getState().autoCycleRunNow()
    const afterRun1 = useAppStore.getState()
    const run1Id = afterRun1.elonX.cycleRuns[0]?.id
    expect(
      afterRun1.elonRegistry.agentAssignmentDecisions.some(
        (d) => d.cycleRunId === run1Id && d.agentId === 'custom-eng-ui-01' && d.selectedBy === 'factory',
      ),
    ).toBe(true)

    // Disable custom and run #2: custom should not be assigned.
    const disableRes = useAppStore
      .getState()
      .elonSetAgentEmployeeStatus('custom-eng-ui-01', 'disabled', 'test disable')
    expect(disableRes.ok).toBe(true)

    await useAppStore.getState().autoCycleRunNow()
    const afterRun2 = useAppStore.getState()
    const run2Id = afterRun2.elonX.cycleRuns[0]?.id
    expect(
      afterRun2.elonRegistry.agentAssignmentDecisions.some(
        (d) => d.cycleRunId === run2Id && d.agentId === 'custom-eng-ui-01',
      ),
    ).toBe(false)

    // Re-activate and run #3: custom should be assigned again.
    const reactivateRes = useAppStore
      .getState()
      .elonSetAgentEmployeeStatus('custom-eng-ui-01', 'active', 'test reactivate')
    expect(reactivateRes.ok).toBe(true)

    await useAppStore.getState().autoCycleRunNow()
    const afterRun3 = useAppStore.getState()
    const run3Id = afterRun3.elonX.cycleRuns[0]?.id
    expect(
      afterRun3.elonRegistry.agentAssignmentDecisions.some(
        (d) => d.cycleRunId === run3Id && d.agentId === 'custom-eng-ui-01',
      ),
    ).toBe(true)
  })
})
