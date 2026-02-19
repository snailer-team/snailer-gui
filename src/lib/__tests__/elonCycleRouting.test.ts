import { selectAgentsForCycle } from '../elonAgentFactory'
import { planCycleBroadcasts } from '../elonBroadcastPlanner'
import type { AgentEmployee } from '../elonAgentRegistry'
import type { CeoLlmOutput } from '../store'

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

function emptyCeoOutput(): CeoLlmOutput {
  return {
    cycleSummary: 'No directives generated',
    topLeverage: [],
    broadcasts: [],
    needsExternalData: false,
  }
}

describe('elon cycle routing (UI-added employee)', () => {
  test('UI-added active employee is assigned within one cycle via factory fallback', () => {
    const employees = [employee('pm'), employee('custom-eng-ui-01')]
    const factory = selectAgentsForCycle({
      objective: 'Implement new auth settings and stabilize autonomous loop',
      constraints: 'security and budget cap',
      verification: 'tests pass and login flow works',
      activeEmployees: employees,
    })

    const activeAgentIds = employees.filter((e) => e.status === 'active').map((e) => e.id)
    const planned = planCycleBroadcasts({
      objective: 'Implement new auth settings and stabilize autonomous loop',
      constraints: 'security and budget cap',
      activeAgentIds,
      factorySelectedAgentIds: factory.selectedAgentIds,
      factoryReason: factory.reason,
      llmOutput: emptyCeoOutput(),
      sanitizedBroadcasts: [],
    })

    expect(factory.selectedAgentIds).toContain('custom-eng-ui-01')
    expect(planned.usedFallback).toBe(true)
    expect(planned.directives.some((d) => d.to === 'custom-eng-ui-01')).toBe(true)
  })
})

