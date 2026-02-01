// ElonX HARD - Evidence Types

export type EvidenceType =
  | 'test_result'
  | 'build_log'
  | 'lint_report'
  | 'screenshot'
  | 'diff'
  | 'terminal'
  | 'api_response'
  | 'metric'

export type EvidenceVerdict = 'pass' | 'fail' | 'warning' | 'info'

export interface TestResult {
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number // ms
  failures?: Array<{
    name: string
    message: string
    stack?: string
  }>
}

export interface BuildLog {
  success: boolean
  errors: number
  warnings: number
  output: string
  duration: number // ms
}

export interface LintReport {
  errors: number
  warnings: number
  issues: Array<{
    file: string
    line: number
    message: string
    severity: 'error' | 'warning'
  }>
}

export interface Screenshot {
  url: string // data:image or file path
  description?: string
  annotations?: Array<{
    x: number
    y: number
    text: string
  }>
}

export interface DiffData {
  path: string
  added: number
  removed: number
  patch: string
}

export interface TerminalOutput {
  command: string
  exitCode: number
  stdout: string
  stderr: string
  duration: number // ms
}

export interface MetricData {
  name: string
  value: number
  unit: string
  change?: number // percentage change from previous
  threshold?: number
}

export type EvidenceData =
  | { type: 'test_result'; data: TestResult }
  | { type: 'build_log'; data: BuildLog }
  | { type: 'lint_report'; data: LintReport }
  | { type: 'screenshot'; data: Screenshot }
  | { type: 'diff'; data: DiffData }
  | { type: 'terminal'; data: TerminalOutput }
  | { type: 'api_response'; data: Record<string, unknown> }
  | { type: 'metric'; data: MetricData }

export interface Evidence {
  id: string
  type: EvidenceType
  title: string
  timestamp: number
  relatedNodeId?: string // Plan Tree node link
  relatedAgentId: string
  summary: string // One-line summary
  verdict: EvidenceVerdict
  data: EvidenceData['data']
}

// Utility functions

export function getVerdictColor(verdict: EvidenceVerdict): string {
  switch (verdict) {
    case 'pass':
      return 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
    case 'fail':
      return 'text-red-600 bg-red-500/10 border-red-500/20'
    case 'warning':
      return 'text-amber-600 bg-amber-500/10 border-amber-500/20'
    case 'info':
      return 'text-blue-600 bg-blue-500/10 border-blue-500/20'
  }
}

export function getVerdictIcon(verdict: EvidenceVerdict): string {
  switch (verdict) {
    case 'pass':
      return '✓'
    case 'fail':
      return '✗'
    case 'warning':
      return '⚠'
    case 'info':
      return 'ℹ'
  }
}

export function getTypeIcon(type: EvidenceType): string {
  switch (type) {
    case 'test_result':
      return '🧪'
    case 'build_log':
      return '🔨'
    case 'lint_report':
      return '📋'
    case 'screenshot':
      return '📷'
    case 'diff':
      return '📝'
    case 'terminal':
      return '💻'
    case 'api_response':
      return '🌐'
    case 'metric':
      return '📊'
  }
}

export function formatTimestamp(timestamp: number): string {
  const diff = Date.now() - timestamp
  if (diff < 1000) return 'just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

// Demo data for development
export function createDemoEvidences(): Evidence[] {
  const now = Date.now()
  return [
    {
      id: 'ev-1',
      type: 'metric',
      title: 'Revenue: Premium conversion',
      timestamp: now - 5000,
      relatedAgentId: 'cro',
      summary: 'Conversion +12% WoW',
      verdict: 'pass',
      data: {
        name: 'Premium conversion',
        value: 12,
        unit: '%',
        change: 12,
        threshold: 5,
      } as MetricData,
    },
    {
      id: 'ev-2',
      type: 'build_log',
      title: 'CI: build + tests',
      timestamp: now - 18000,
      relatedNodeId: 'swe-step-4',
      relatedAgentId: 'sre',
      summary: 'Build ok · tests pending',
      verdict: 'pass',
      data: {
        success: true,
        errors: 0,
        warnings: 1,
        output: 'CI pipeline: build OK, unit tests running...',
        duration: 4200,
      } as BuildLog,
    },
    {
      id: 'ev-3',
      type: 'metric',
      title: 'Retention: churn',
      timestamp: now - 32000,
      relatedAgentId: 'cpo',
      summary: 'Churn -5% after UX fixes',
      verdict: 'pass',
      data: {
        name: 'Churn',
        value: -5,
        unit: '%',
        change: -5,
        threshold: -2,
      } as MetricData,
    },
    {
      id: 'ev-4',
      type: 'diff',
      title: 'PR diff: priority job queue',
      timestamp: now - 65000,
      relatedNodeId: 'platform-step-3',
      relatedAgentId: 'swe',
      summary: '+342 -87 lines',
      verdict: 'info',
      data: {
        path: 'src/platform/queue.ts',
        added: 342,
        removed: 87,
        patch: '--- a/src/platform/queue.ts\n+++ b/src/platform/queue.ts\n@@ -1,5 +1,10 @@\n...',
      } as DiffData,
    },
    {
      id: 'ev-5',
      type: 'terminal',
      title: 'Bench: latency report',
      timestamp: now - 110000,
      relatedAgentId: 'cto',
      summary: 'p95 latency -23% after infra tweaks',
      verdict: 'pass',
      data: {
        command: 'pnpm bench:latency',
        exitCode: 0,
        stdout: 'p50 38ms → 31ms\np95 210ms → 162ms\nthroughput +45%',
        stderr: '',
        duration: 9200,
      } as TerminalOutput,
    },
    {
      id: 'ev-6',
      type: 'metric',
      title: 'Competitive: workflow parity check',
      timestamp: now - 42000,
      relatedAgentId: 'pm',
      summary: 'Claude Code/opencode 대비: auto-evidence + multi-agent loop이 차별점',
      verdict: 'info',
      data: {
        name: 'Differentiation clarity',
        value: 1,
        unit: 'score',
      } as MetricData,
    },
  ]
}
