import { ALL_WORKFLOWS } from './elonWorkflows'
import { ELON_AGENTS, type AutonomyLevel, type ElonAgent, type ElonControl } from './elonOrg'

export type AgentEmployeeStatus = 'active' | 'disabled' | 'terminated'
export type AgentModelPolicyMode = 'auto' | 'fixed'
export type AgentLifecycleEventType = 'hired' | 'updated' | 'disabled' | 'terminated'
export const AGENT_NORM_PROFILES = ['strict', 'default', 'fast'] as const
export type AgentNormProfile = (typeof AGENT_NORM_PROFILES)[number]

export interface AgentEmployee {
  id: string
  displayName: string
  category: ElonAgent['category']
  roleTemplateId: string
  autonomyLevel: AutonomyLevel
  toolScopes: ElonControl[]
  modelPolicy: {
    mode: AgentModelPolicyMode
    model?: string
  }
  maxParallelTasks: number
  status: AgentEmployeeStatus
  createdAt: number
  updatedAt: number
}

export interface AgentTemplate {
  templateId: string
  workflowId: string
  promptBase: string
  defaultTools: ElonControl[]
  normProfile: AgentNormProfile
}

export interface AgentLifecycleEvent {
  eventType: AgentLifecycleEventType
  agentId: string
  reason?: string
  actor: 'system' | 'user'
  at: number
}

export interface AgentAssignmentDecision {
  cycleRunId: string
  agentId: string
  taskId: string
  selectedBy: 'factory' | 'ceo'
  why: string
  at: number
}

export interface AgentEmployeeDraft {
  id: string
  displayName: string
  category: ElonAgent['category']
  roleTemplateId: string
  autonomyLevel: AutonomyLevel
  toolScopes: ElonControl[]
  modelPolicyMode: AgentModelPolicyMode
  fixedModel?: string
  maxParallelTasks: number
}

export function templateIdFromWorkflowId(workflowId: string): string {
  return `wf:${workflowId}`
}

export function workflowIdFromTemplateId(templateId: string): string {
  return templateId.startsWith('wf:') ? templateId.slice(3) : templateId
}

export function normalizeAgentEmployeeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function triadRoleToCategory(role?: ElonAgent['triadRole']): ElonAgent['category'] {
  if (role === 'lead') return 'Leadership'
  if (role === 'pm' || role === 'designer') return 'Product & Design'
  if (role === 'engineer') return 'Engineering'
  if (role === 'analyst') return 'Data & Analytics'
  if (role === 'ops') return 'Operations'
  return 'Engineering'
}

export function buildDefaultAgentTemplates(): AgentTemplate[] {
  return ALL_WORKFLOWS.map((wf) => {
    const matchedAgent = ELON_AGENTS.find((a) => a.id === wf.agentId)
    return {
      templateId: templateIdFromWorkflowId(wf.agentId),
      workflowId: wf.agentId,
      promptBase: wf.description,
      defaultTools: matchedAgent?.controls ?? ['terminal'],
      normProfile: 'default',
    }
  })
}

export function buildDefaultAgentEmployees(): AgentEmployee[] {
  const now = Date.now()
  return ELON_AGENTS.map((agent) => ({
    id: agent.id,
    displayName: agent.title,
    category: agent.category,
    roleTemplateId: templateIdFromWorkflowId(agent.id),
    autonomyLevel: agent.autonomyLevel,
    toolScopes: [...agent.controls],
    modelPolicy: { mode: 'auto' },
    maxParallelTasks: 1,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }))
}

function buildFallbackAgent(employee: AgentEmployee): ElonAgent {
  return {
    id: employee.id,
    category: employee.category,
    title: employee.displayName,
    subtitle: `Template ${workflowIdFromTemplateId(employee.roleTemplateId)}`,
    controls: [...employee.toolScopes],
    loop: ['Observe', 'Plan', 'Act', 'Evaluate'],
    snailerNotes: ['Added from Agent Employees UI'],
    autonomyLevel: employee.autonomyLevel,
    iterationCycle: '1h',
    firstPrinciples: ['Why this task?', 'What is highest leverage?', 'What can be deleted?'],
    ownership: ['Assigned workstream execution'],
  }
}

export function employeeToElonAgent(employee: AgentEmployee): ElonAgent {
  const base = ELON_AGENTS.find((a) => a.id === employee.id)
  if (!base) return buildFallbackAgent(employee)
  return {
    ...base,
    id: employee.id,
    category: employee.category,
    title: employee.displayName || base.title,
    autonomyLevel: employee.autonomyLevel,
    controls: employee.toolScopes.length > 0 ? [...employee.toolScopes] : [...base.controls],
  }
}

export function getRegisteredElonAgents(
  employees: AgentEmployee[],
  options?: { includeDisabled?: boolean },
): ElonAgent[] {
  const includeDisabled = options?.includeDisabled ?? true
  return employees
    .filter((e) => e.status !== 'terminated')
    .filter((e) => includeDisabled || e.status === 'active')
    .map(employeeToElonAgent)
}

export function getActiveAgentIds(employees: AgentEmployee[]): string[] {
  return employees.filter((e) => e.status === 'active').map((e) => e.id)
}

export function findTemplate(
  templates: AgentTemplate[],
  templateId: string,
): AgentTemplate | undefined {
  return templates.find((t) => t.templateId === templateId)
}

export function validateAgentEmployeeDraft(
  draft: AgentEmployeeDraft,
  templates: AgentTemplate[],
  existingEmployees: AgentEmployee[],
  options?: { ignoreAgentId?: string },
): string[] {
  const errors: string[] = []
  const normalizedId = normalizeAgentEmployeeId(draft.id)
  if (!normalizedId) {
    errors.push('agentId is required.')
  } else if (!/^[a-z0-9][a-z0-9-_]{1,47}$/.test(normalizedId)) {
    errors.push('agentId must be 2-48 chars using a-z, 0-9, - or _.')
  }

  if (!draft.displayName.trim()) {
    errors.push('displayName is required.')
  }

  const duplicate = existingEmployees.find(
    (e) => e.id === normalizedId && e.id !== options?.ignoreAgentId,
  )
  if (duplicate) {
    errors.push(`agentId "${normalizedId}" already exists.`)
  }

  const template = findTemplate(templates, draft.roleTemplateId)
  if (!template) {
    errors.push('roleTemplate must map to an existing workflow template.')
  }

  if (draft.toolScopes.length === 0) {
    errors.push('At least one tool scope is required.')
  }

  if (template) {
    const missingDefaultTools = template.defaultTools.filter((tool) => !draft.toolScopes.includes(tool))
    if (missingDefaultTools.length > 0) {
      errors.push(`Missing required tool scopes: ${missingDefaultTools.join(', ')}`)
    }
  }

  if (draft.modelPolicyMode === 'fixed' && !draft.fixedModel?.trim()) {
    errors.push('fixed model must be set when modelPolicy is fixed.')
  }

  if (!Number.isFinite(draft.maxParallelTasks) || draft.maxParallelTasks < 1 || draft.maxParallelTasks > 20) {
    errors.push('maxParallelTasks must be between 1 and 20.')
  }

  return errors
}

export function createAgentEmployeeFromDraft(
  draft: AgentEmployeeDraft,
  templates: AgentTemplate[],
  nowMs: number,
): AgentEmployee {
  const template = findTemplate(templates, draft.roleTemplateId)
  const normalizedId = normalizeAgentEmployeeId(draft.id)
  const defaultToolScopes = template?.defaultTools ?? ['terminal']
  const toolScopes = draft.toolScopes.length > 0 ? [...draft.toolScopes] : [...defaultToolScopes]

  return {
    id: normalizedId,
    displayName: draft.displayName.trim(),
    category: draft.category || triadRoleToCategory(undefined),
    roleTemplateId: draft.roleTemplateId,
    autonomyLevel: draft.autonomyLevel,
    toolScopes,
    modelPolicy: draft.modelPolicyMode === 'fixed'
      ? { mode: 'fixed', model: draft.fixedModel?.trim() || 'auto' }
      : { mode: 'auto' },
    maxParallelTasks: Math.max(1, Math.min(20, Math.round(draft.maxParallelTasks))),
    status: 'active',
    createdAt: nowMs,
    updatedAt: nowMs,
  }
}
