import type { AgentEmployee, AgentEmployeeDraft, AgentTemplate } from '../elonAgentRegistry'
import { validateAgentEmployeeDraft } from '../elonAgentRegistry'

function template(
  id: string,
  defaultTools: AgentTemplate['defaultTools'] = ['terminal'],
): AgentTemplate {
  return {
    templateId: id,
    workflowId: id.replace(/^wf:/, ''),
    promptBase: 'template prompt',
    defaultTools,
    normProfile: 'default',
  }
}

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

function draft(overrides?: Partial<AgentEmployeeDraft>): AgentEmployeeDraft {
  return {
    id: 'custom-eng-01',
    displayName: 'Custom Eng',
    category: 'Engineering',
    roleTemplateId: 'wf:swe',
    autonomyLevel: 'high',
    toolScopes: ['terminal'],
    modelPolicyMode: 'auto',
    fixedModel: undefined,
    maxParallelTasks: 1,
    ...overrides,
  }
}

describe('elonAgentRegistry validation', () => {
  test('rejects duplicate agentId', () => {
    const errors = validateAgentEmployeeDraft(
      draft({ id: 'pm' }),
      [template('wf:swe')],
      [employee('pm')],
    )
    expect(errors.some((e) => e.includes('already exists'))).toBe(true)
  })

  test('rejects missing required tool scopes from template', () => {
    const errors = validateAgentEmployeeDraft(
      draft({ roleTemplateId: 'wf:qa', toolScopes: ['terminal'] }),
      [template('wf:qa', ['terminal', 'browser'])],
      [],
    )
    expect(errors.some((e) => e.includes('Missing required tool scopes'))).toBe(true)
  })

  test('rejects unknown role template', () => {
    const errors = validateAgentEmployeeDraft(
      draft({ roleTemplateId: 'wf:not-exists' }),
      [template('wf:swe')],
      [],
    )
    expect(errors.some((e) => e.includes('roleTemplate must map'))).toBe(true)
  })
})

