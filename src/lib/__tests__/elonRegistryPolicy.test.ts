import { useAppStore } from '../store'
import type { AgentEmployee, AgentTemplate } from '../elonAgentRegistry'

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

function template(id: string): AgentTemplate {
  return {
    templateId: `wf:${id}`,
    workflowId: id,
    promptBase: `${id} prompt`,
    defaultTools: ['terminal'],
    normProfile: 'default',
  }
}

describe('elon registry policy', () => {
  beforeEach(() => {
    localStorage.clear()
    const s = useAppStore.getState()
    useAppStore.setState({
      elonFrame: {
        collapsed: true,
        problem: 'locked goal',
        constraints: 'none',
        verification: 'none',
      },
      elonRegistry: {
        agentEmployees: [employee('custom-eng-01')],
        agentTemplates: [template('custom-eng-01'), template('custom-eng-02')],
        agentLifecycleEvents: [],
        agentAssignmentDecisions: [],
      },
      elonX: {
        ...s.elonX,
      },
    })
  })

  test('frame lock HR policy: add allowed, disable allowed, terminate blocked', () => {
    const addRes = useAppStore.getState().elonAddAgentEmployee({
      id: 'custom-eng-02',
      displayName: 'Custom Eng 02',
      category: 'Engineering',
      roleTemplateId: 'wf:custom-eng-02',
      autonomyLevel: 'high',
      toolScopes: ['terminal'],
      modelPolicyMode: 'auto',
      fixedModel: undefined,
      maxParallelTasks: 1,
    })
    expect(addRes.ok).toBe(true)

    const disableRes = useAppStore
      .getState()
      .elonSetAgentEmployeeStatus('custom-eng-01', 'disabled', 'test disable while locked')
    expect(disableRes.ok).toBe(true)

    const terminateRes = useAppStore
      .getState()
      .elonSetAgentEmployeeStatus('custom-eng-01', 'terminated', 'test terminate while locked')
    expect(terminateRes.ok).toBe(false)
    if (!terminateRes.ok) {
      expect(terminateRes.errors.join(' ')).toContain('Frame Lock')
    }
  })

  test('agent registry state persists UI-added employee to local storage', () => {
    const addRes = useAppStore.getState().elonAddAgentEmployee({
      id: 'persist-eng-01',
      displayName: 'Persist Eng 01',
      category: 'Engineering',
      roleTemplateId: 'wf:custom-eng-02',
      autonomyLevel: 'high',
      toolScopes: ['terminal'],
      modelPolicyMode: 'auto',
      fixedModel: undefined,
      maxParallelTasks: 1,
    })
    expect(addRes.ok).toBe(true)

    const storageKey = useAppStore.persist.getOptions().name ?? 'snailer-gui'
    const raw = localStorage.getItem(storageKey)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string) as { state?: { elonRegistry?: { agentEmployees?: Array<{ id: string }> } } }
    const ids = parsed?.state?.elonRegistry?.agentEmployees?.map((e) => e.id) ?? []
    expect(ids).toContain('persist-eng-01')
  })
})
