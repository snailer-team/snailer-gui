import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAppStore } from '../../lib/store'
import type { AgentEmployeeStatus, AgentModelPolicyMode, AgentEmployeeDraft, AgentNormProfile } from '../../lib/elonAgentRegistry'
import { AGENT_NORM_PROFILES, normalizeAgentEmployeeId } from '../../lib/elonAgentRegistry'
import { ELON_CATEGORIES, type AutonomyLevel, type ElonControl } from '../../lib/elonOrg'
import { Button } from '../ui/button'

const CONTROL_OPTIONS: ElonControl[] = [
  'browser',
  'terminal',
  'db',
  'api',
  'repo',
  'vm',
  'cursor',
  'analytics',
  'payments',
  'figma',
  'photoshop',
  'illustrator',
  'aftereffects',
]

const AUTONOMY_OPTIONS: AutonomyLevel[] = ['full', 'high', 'medium', 'supervised']
const STATUS_OPTIONS: Array<Extract<AgentEmployeeStatus, 'active' | 'disabled'>> = ['active', 'disabled']
const NORM_PROFILE_SET = new Set<AgentNormProfile>(AGENT_NORM_PROFILES)
const NORM_PROFILE_DESC: Record<AgentNormProfile, string> = {
  strict: 'Strong guardrails, safer merges',
  default: 'Balanced speed and safety',
  fast: 'Higher speed, revise-first checks',
}

type FormState = {
  id: string
  displayName: string
  category: (typeof ELON_CATEGORIES)[number]
  roleTemplateId: string
  autonomyLevel: AutonomyLevel
  toolScopes: ElonControl[]
  modelPolicyMode: AgentModelPolicyMode
  fixedModel: string
  maxParallelTasks: number
  status: Extract<AgentEmployeeStatus, 'active' | 'disabled'>
}

function formatEventTime(ts: number): string {
  const date = new Date(ts)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function buildDefaultForm(roleTemplateId: string): FormState {
  return {
    id: '',
    displayName: '',
    category: 'Engineering',
    roleTemplateId,
    autonomyLevel: 'high',
    toolScopes: ['terminal'],
    modelPolicyMode: 'auto',
    fixedModel: '',
    maxParallelTasks: 1,
    status: 'active',
  }
}

function normalizeNormProfile(value: string): AgentNormProfile {
  const raw = value.trim().toLowerCase() as AgentNormProfile
  return NORM_PROFILE_SET.has(raw) ? raw : 'default'
}

export function AgentEmployeesPanel() {
  const agentEmployees = useAppStore((s) => s.elonRegistry.agentEmployees)
  const agentTemplates = useAppStore((s) => s.elonRegistry.agentTemplates)
  const lifecycleEvents = useAppStore((s) => s.elonRegistry.agentLifecycleEvents)
  const addEmployee = useAppStore((s) => s.elonAddAgentEmployee)
  const updateEmployee = useAppStore((s) => s.elonUpdateAgentEmployee)
  const cloneEmployee = useAppStore((s) => s.elonCloneAgentEmployee)
  const setEmployeeStatus = useAppStore((s) => s.elonSetAgentEmployeeStatus)
  const updateTemplate = useAppStore((s) => s.elonUpdateAgentTemplate)
  const frameLocked = useAppStore((s) => Boolean(s.elonFrame.collapsed))

  const defaultTemplateId = agentTemplates[0]?.templateId ?? 'wf:swe'
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => buildDefaultForm(defaultTemplateId))
  const [templateDrafts, setTemplateDrafts] = useState<Record<string, { normProfile: AgentNormProfile; promptBase: string }>>({})

  const sortedEmployees = useMemo(() => {
    const statusWeight: Record<AgentEmployeeStatus, number> = {
      active: 0,
      disabled: 1,
      terminated: 2,
    }
    return [...agentEmployees].sort((a, b) => {
      const sw = statusWeight[a.status] - statusWeight[b.status]
      if (sw !== 0) return sw
      return a.id.localeCompare(b.id)
    })
  }, [agentEmployees])

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const toggleTool = (tool: ElonControl) => {
    setForm((prev) => ({
      ...prev,
      toolScopes: prev.toolScopes.includes(tool)
        ? prev.toolScopes.filter((t) => t !== tool)
        : [...prev.toolScopes, tool],
    }))
  }

  const resetForm = () => {
    setEditingId(null)
    setForm(buildDefaultForm(defaultTemplateId))
  }

  const onEdit = (agentId: string) => {
    const target = agentEmployees.find((e) => e.id === agentId)
    if (!target) return
    setEditingId(target.id)
    setForm({
      id: target.id,
      displayName: target.displayName,
      category: target.category,
      roleTemplateId: target.roleTemplateId,
      autonomyLevel: target.autonomyLevel,
      toolScopes: [...target.toolScopes],
      modelPolicyMode: target.modelPolicy.mode,
      fixedModel: target.modelPolicy.model ?? '',
      maxParallelTasks: target.maxParallelTasks,
      status: target.status === 'disabled' ? 'disabled' : 'active',
    })
  }

  const submit = () => {
    const draft: AgentEmployeeDraft = {
      id: normalizeAgentEmployeeId(form.id),
      displayName: form.displayName,
      category: form.category,
      roleTemplateId: form.roleTemplateId,
      autonomyLevel: form.autonomyLevel,
      toolScopes: form.toolScopes,
      modelPolicyMode: form.modelPolicyMode,
      fixedModel: form.fixedModel,
      maxParallelTasks: form.maxParallelTasks,
    }

    if (!editingId) {
      const res = addEmployee(draft)
      if (!res.ok) {
        toast('Failed to add employee', { description: res.errors.join('\n') })
        return
      }
      if (form.status !== 'active') {
        setEmployeeStatus(res.employee.id, form.status, 'Initial status from add form')
      }
      toast('Agent employee added', { description: `${res.employee.id} is now registered.` })
      resetForm()
      return
    }

    const res = updateEmployee(editingId, {
      displayName: draft.displayName,
      category: draft.category,
      roleTemplateId: draft.roleTemplateId,
      autonomyLevel: draft.autonomyLevel,
      toolScopes: draft.toolScopes,
      modelPolicy:
        draft.modelPolicyMode === 'fixed'
          ? { mode: 'fixed', model: draft.fixedModel || 'auto' }
          : { mode: 'auto' },
      maxParallelTasks: draft.maxParallelTasks,
    })
    if (!res.ok) {
      toast('Failed to update employee', { description: res.errors.join('\n') })
      return
    }
    if (res.employee.status !== form.status) {
      const statusRes = setEmployeeStatus(
        res.employee.id,
        form.status,
        'Status updated from Agent Employees UI',
      )
      if (!statusRes.ok) {
        toast('Status update blocked', { description: statusRes.errors.join('\n') })
      }
    }
    toast('Agent employee updated', { description: res.employee.id })
    resetForm()
  }

  const onClone = (agentId: string) => {
    const nextId = `${agentId}-copy-${String(Date.now()).slice(-4)}`
    const res = cloneEmployee(agentId, nextId, `Copy of ${agentId}`)
    if (!res.ok) {
      toast('Failed to clone employee', { description: res.errors.join('\n') })
      return
    }
    toast('Employee cloned', { description: `${res.employee.id} created.` })
  }

  const onStatus = (agentId: string, status: AgentEmployeeStatus) => {
    const res = setEmployeeStatus(agentId, status, 'Changed from Agent Employees list')
    if (!res.ok) {
      toast('Action blocked', { description: res.errors.join('\n') })
      return
    }
    toast('Employee updated', { description: `${res.employee.id} → ${status}` })
  }

  const getTemplateDraft = (templateId: string, normProfile: string, promptBase: string) => {
    return templateDrafts[templateId] ?? { normProfile: normalizeNormProfile(normProfile), promptBase }
  }

  const setTemplateDraftField = (
    templateId: string,
    key: 'normProfile' | 'promptBase',
    value: string,
  ) => {
    setTemplateDrafts((prev) => {
      const current = prev[templateId] ?? { normProfile: 'default' as AgentNormProfile, promptBase: '' }
      return {
        ...prev,
        [templateId]: {
          ...current,
          [key]: key === 'normProfile' ? normalizeNormProfile(value) : value,
        },
      }
    })
  }

  const saveTemplate = (templateId: string) => {
    const current = agentTemplates.find((tpl) => tpl.templateId === templateId)
    if (!current) return
    const draft = getTemplateDraft(templateId, current.normProfile, current.promptBase)
    const res = updateTemplate(templateId, {
      normProfile: draft.normProfile,
      promptBase: draft.promptBase,
    })
    if (!res.ok) {
      toast('Failed to update template', { description: res.errors.join('\n') })
      return
    }
    toast('Template updated', { description: `${templateId} · ${res.template.normProfile}` })
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-black/80">Agent Employees</div>
          <div className="mt-1 text-xs text-black/50">
            Add and manage autonomous employees from UI.
          </div>
        </div>
        <div className="text-xs text-black/50">
          {agentEmployees.filter((e) => e.status === 'active').length} active / {agentEmployees.length} total
        </div>
      </div>
      <div
        className={[
          'mt-3 rounded-lg border px-3 py-2 text-xs',
          frameLocked
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-black/10 bg-white/70 text-black/60',
        ].join(' ')}
      >
        Frame Lock HR policy: Add allowed · Disable allowed (next cycle) · Terminate blocked while locked.
      </div>

      <div className="mt-3 rounded-xl border border-black/5 bg-white/70 p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <div className="text-xs text-black/45">agentId</div>
            <input
              value={form.id}
              onChange={(e) => setField('id', normalizeAgentEmployeeId(e.target.value))}
              disabled={Boolean(editingId)}
              placeholder="eng-backend-04"
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20 disabled:bg-black/5"
            />
          </div>
          <div>
            <div className="text-xs text-black/45">displayName</div>
            <input
              value={form.displayName}
              onChange={(e) => setField('displayName', e.target.value)}
              placeholder="Backend Engineer #4"
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
            />
          </div>
          <div>
            <div className="text-xs text-black/45">department</div>
            <select
              value={form.category}
              onChange={(e) => setField('category', e.target.value as FormState['category'])}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {ELON_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-black/45">roleTemplate</div>
            <select
              value={form.roleTemplateId}
              onChange={(e) => setField('roleTemplateId', e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {agentTemplates.map((tpl) => (
                <option key={tpl.templateId} value={tpl.templateId}>
                  {tpl.templateId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-black/45">autonomyLevel</div>
            <select
              value={form.autonomyLevel}
              onChange={(e) => setField('autonomyLevel', e.target.value as AutonomyLevel)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {AUTONOMY_OPTIONS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-black/45">status</div>
            <select
              value={form.status}
              onChange={(e) => setField('status', e.target.value as FormState['status'])}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-black/45">modelPolicy</div>
            <select
              value={form.modelPolicyMode}
              onChange={(e) => setField('modelPolicyMode', e.target.value as AgentModelPolicyMode)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
            >
              <option value="auto">auto</option>
              <option value="fixed">fixed</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-black/45">maxParallelTasks</div>
            <input
              type="number"
              min={1}
              max={20}
              value={form.maxParallelTasks}
              onChange={(e) => setField('maxParallelTasks', Number(e.target.value || 1))}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
            />
          </div>
        </div>

        {form.modelPolicyMode === 'fixed' ? (
          <div className="mt-2">
            <div className="text-xs text-black/45">fixedModel</div>
            <input
              value={form.fixedModel}
              onChange={(e) => setField('fixedModel', e.target.value)}
              placeholder="claude-opus-4-6"
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/20"
            />
          </div>
        ) : null}

        <div className="mt-3">
          <div className="text-xs text-black/45">toolScopes</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {CONTROL_OPTIONS.map((tool) => {
              const selected = form.toolScopes.includes(tool)
              return (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={[
                    'rounded-full border px-2 py-0.5 text-xs transition',
                    selected
                      ? 'border-black/20 bg-black/10 text-black/80'
                      : 'border-black/10 bg-white text-black/55 hover:bg-black/5',
                  ].join(' ')}
                >
                  {tool}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          {editingId ? (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              Cancel edit
            </Button>
          ) : null}
          <Button size="sm" onClick={submit}>
            {editingId ? 'Save employee' : 'Add employee'}
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {sortedEmployees.map((employee) => (
          <div key={employee.id} className="rounded-xl border border-black/5 bg-white/70 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-black/80">{employee.displayName}</div>
                  <span className="rounded-full border border-black/10 bg-black/5 px-1.5 py-0.5 text-[10px] text-black/55">
                    {employee.id}
                  </span>
                  <span
                    className={[
                      'rounded-full border px-1.5 py-0.5 text-[10px]',
                      employee.status === 'active'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : employee.status === 'disabled'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-red-200 bg-red-50 text-red-700',
                    ].join(' ')}
                  >
                    {employee.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-black/55">
                  {employee.category} · {employee.roleTemplateId} · {employee.autonomyLevel} · max {employee.maxParallelTasks}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => onEdit(employee.id)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onClone(employee.id)}>
                  Clone
                </Button>
                {employee.status === 'active' ? (
                  <Button variant="ghost" size="sm" onClick={() => onStatus(employee.id, 'disabled')}>
                    Disable
                  </Button>
                ) : null}
                {employee.status === 'disabled' ? (
                  <Button variant="ghost" size="sm" onClick={() => onStatus(employee.id, 'active')}>
                    Re-activate
                  </Button>
                ) : null}
                {employee.status !== 'terminated' ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={frameLocked}
                    onClick={() => onStatus(employee.id, 'terminated')}
                    title={frameLocked ? 'Unlock Frame first (terminate is blocked while locked).' : 'Terminate employee'}
                  >
                    Terminate
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-black/5 bg-white/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-black/80">Lifecycle Events</div>
          <div className="text-xs text-black/50">{lifecycleEvents.length} events</div>
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {lifecycleEvents.length === 0 ? (
            <div className="text-xs text-black/45">No lifecycle events yet.</div>
          ) : (
            lifecycleEvents.slice(0, 80).map((event, index) => (
              <div key={`${event.agentId}-${event.eventType}-${event.at}-${index}`} className="rounded-lg border border-black/10 bg-white p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-semibold text-black/75">{event.agentId}</div>
                  <span
                    className={[
                      'rounded-full border px-1.5 py-0.5 text-[10px]',
                      event.eventType === 'terminated'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : event.eventType === 'disabled'
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : event.eventType === 'hired'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700',
                    ].join(' ')}
                  >
                    {event.eventType}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-black/55">{event.reason || 'No reason provided'}</div>
                <div className="mt-1 text-[10px] text-black/40">
                  {formatEventTime(event.at)} · actor {event.actor}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-black/5 bg-white/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-black/80">Role Templates</div>
          <div className="text-xs text-black/50">{agentTemplates.length} templates</div>
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {AGENT_NORM_PROFILES.map((profile) => (
            <span
              key={profile}
              className={[
                'rounded-full border px-2 py-0.5 text-[10px]',
                profile === 'strict'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : profile === 'default'
                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                    : 'border-blue-200 bg-blue-50 text-blue-700',
              ].join(' ')}
              title={NORM_PROFILE_DESC[profile]}
            >
              {profile}: {NORM_PROFILE_DESC[profile]}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {agentTemplates.map((tpl) => {
            const draft = getTemplateDraft(tpl.templateId, tpl.normProfile, tpl.promptBase)
            return (
              <div key={tpl.templateId} className="rounded-lg border border-black/10 bg-white p-2.5">
                <div className="mb-2 text-xs font-semibold text-black/65">{tpl.templateId}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr_auto]">
                  <select
                    value={draft.normProfile}
                    onChange={(e) => setTemplateDraftField(tpl.templateId, 'normProfile', e.target.value)}
                    className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-black/20"
                  >
                    {AGENT_NORM_PROFILES.map((profile) => (
                      <option key={profile} value={profile}>
                        {profile}
                      </option>
                    ))}
                  </select>
                  <input
                    value={draft.promptBase}
                    onChange={(e) => setTemplateDraftField(tpl.templateId, 'promptBase', e.target.value)}
                    placeholder="prompt base"
                    className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs outline-none focus:border-black/20"
                  />
                  <Button variant="ghost" size="sm" onClick={() => saveTemplate(tpl.templateId)}>
                    Save
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
