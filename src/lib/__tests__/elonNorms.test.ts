import { runAgentOutputNorms } from '../elonNorms'

describe('elonNorms profile behavior', () => {
  test('default profile denies engineering write_code without codeDiff', () => {
    const result = runAgentOutputNorms({
      agentId: 'swe-2',
      normProfile: 'default',
      output: 'implemented changes',
      actions: [{ type: 'write_code', detail: 'patch files' }],
      improvements: ['done'],
      githubActions: [],
    })

    expect(result.allowed).toBe(false)
    expect(result.decisions.some((d) => d.ruleId === 'write_code_diff_required' && d.decision === 'deny')).toBe(true)
  })

  test('fast profile revises (not denies) missing codeDiff and merge tests', () => {
    const result = runAgentOutputNorms({
      agentId: 'swe-3',
      normProfile: 'fast',
      output: 'implemented changes',
      actions: [{ type: 'write_code', detail: 'patch files' }],
      improvements: ['done'],
      githubActions: [{ type: 'merge_pr', params: { prNumber: '1' } }],
    })

    expect(result.allowed).toBe(true)
    expect(result.decisions.some((d) => d.ruleId === 'write_code_diff_required' && d.decision === 'revise')).toBe(true)
    expect(result.decisions.some((d) => d.ruleId === 'test_before_merge' && d.decision === 'revise')).toBe(true)
    expect(result.decisions.some((d) => d.decision === 'deny')).toBe(false)
  })
})

