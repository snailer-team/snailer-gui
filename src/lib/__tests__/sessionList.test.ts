import { collapseDuplicateNewSessions, type SessionView } from '../store'

function buildSession(overrides: Partial<SessionView>): SessionView {
  return {
    id: overrides.id ?? 's-default',
    name: overrides.name ?? 'New Session',
    updatedAt: overrides.updatedAt ?? Date.now(),
    projectPath: overrides.projectPath,
    activityCount: overrides.activityCount ?? 0,
    diffCount: overrides.diffCount ?? 0,
    messages: overrides.messages ?? [],
    agentEvents: overrides.agentEvents ?? [],
  }
}

describe('collapseDuplicateNewSessions', () => {
  test('keeps only one pristine "New Session"', () => {
    const sessions = [
      buildSession({ id: 'a', name: 'New Session' }),
      buildSession({ id: 'b', name: 'New Session' }),
      buildSession({ id: 'c', name: 'New Session' }),
    ]

    const collapsed = collapseDuplicateNewSessions(sessions)
    expect(collapsed.map((s) => s.id)).toEqual(['a'])
  })

  test('does not remove non-pristine sessions', () => {
    const sessions = [
      buildSession({ id: 'a', name: 'New Session' }),
      buildSession({ id: 'b', name: 'New Session', messages: [{ id: 'm1', role: 'user', content: 'hi', createdAt: 1 }] }),
      buildSession({ id: 'c', name: 'Feature Work' }),
    ]

    const collapsed = collapseDuplicateNewSessions(sessions)
    expect(collapsed.map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })
})
