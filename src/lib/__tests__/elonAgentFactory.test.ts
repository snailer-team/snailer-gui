import { selectAgentsForCycle } from '../elonAgentFactory'
import type { AgentEmployee } from '../elonAgentRegistry'

function employee(id: string, status: AgentEmployee['status'] = 'active'): AgentEmployee {
  return {
    id,
    displayName: id,
    category: 'Engineering',
    roleTemplateId: `wf:${id}`,
    autonomyLevel: 'high',
    toolScopes: ['terminal'],
    modelPolicy: { mode: 'auto' },
    maxParallelTasks: 1,
    status,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

describe('elonAgentFactory', () => {
  test('includes UI-added active agent in selected set', () => {
    const result = selectAgentsForCycle({
      objective: 'Build and deploy autonomous multi-agent workflow with testing and CI',
      constraints: 'security compliance and performance',
      verification: 'tests pass and deploy succeeds',
      activeEmployees: [employee('pm'), employee('custom-eng-01')],
    })

    expect(result.selectedAgentIds).toContain('custom-eng-01')
    expect(result.targetHeadcount).toBe(2)
  })

  test('never selects disabled/terminated employees', () => {
    const result = selectAgentsForCycle({
      objective: 'simple fix',
      constraints: '',
      verification: '',
      activeEmployees: [
        employee('pm', 'active'),
        employee('custom-eng-02', 'disabled'),
        employee('custom-eng-03', 'terminated'),
      ],
    })

    expect(result.selectedAgentIds).toContain('pm')
    expect(result.selectedAgentIds).not.toContain('custom-eng-02')
    expect(result.selectedAgentIds).not.toContain('custom-eng-03')
  })
})

