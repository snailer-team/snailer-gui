import { useEffect, useMemo, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'

import { Button } from './ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from './ui/scroll-area'
import { useAppStore, type ModifiedFile, type PendingApproval } from '../lib/store'
import { DiffViewer } from './DiffViewer'
import { TerminalPanel } from './TerminalPanel'
import { OrchestratorPanel } from './OrchestratorPanel'

type FileNode = { name: string; path: string; kind: 'file' | 'dir'; relPath: string }

type TreeItem = {
  name: string
  path: string
  kind: 'file' | 'dir'
  absPath?: string
  relPath?: string
  children: Map<string, TreeItem>
}

function buildTree(nodes: FileNode[], root: string): TreeItem {
  const rootNode: TreeItem = { name: root, path: root, kind: 'dir', children: new Map() }
  for (const n of nodes) {
    const parts = n.relPath.split('/').filter(Boolean)
    let cur = rootNode
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLeaf = i === parts.length - 1
      const key = (cur.path ? cur.path + '/' : '') + part
      if (!cur.children.has(key)) {
        const next: TreeItem = {
          name: part,
          path: key,
          absPath: isLeaf ? n.path : undefined,
          relPath: isLeaf ? n.relPath : undefined,
          kind: isLeaf ? n.kind : 'dir',
          children: new Map(),
        }
        cur.children.set(key, next)
      }
      cur = cur.children.get(key)!
    }
  }
  return rootNode
}

function TreeNode({
  node,
  level,
  onPickFile,
}: {
  node: TreeItem
  level: number
  onPickFile: (absPath: string, relPath: string) => void
}) {
  const [open, setOpen] = useState(level < 1)
  const entries = Array.from(node.children.values()).sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  if (node.kind === 'file') {
    return (
      <button
        className="w-full truncate rounded-lg px-2 py-1 text-left text-sm hover:bg-black/5"
        style={{ paddingLeft: 8 + level * 12 }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', `@${node.relPath ?? ''}`)
        }}
        onClick={() => onPickFile(node.absPath!, node.relPath!)}
      >
        {node.name}
      </button>
    )
  }

  return (
    <div>
      {level > 0 && (
        <button
          className="w-full truncate rounded-lg px-2 py-1 text-left text-sm font-medium hover:bg-black/5"
          style={{ paddingLeft: 8 + level * 12 }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '▾' : '▸'} {node.name}
        </button>
      )}
      {open &&
        entries.map((child) => (
          <TreeNode key={child.path} node={child} level={level + 1} onPickFile={onPickFile} />
        ))}
    </div>
  )
}

export function RightPanel() {
  const { projectPath, modifiedFilesByPath, bashCommands, daemon, pendingApprovals, mode, currentRunId } = useAppStore()
  const isOrchestratorMode = mode.toLowerCase().includes('orchestrator') || mode.toLowerCase().includes('team')
  const [clockMs, setClockMs] = useState(() => Date.now())
  const [files, setFiles] = useState<FileNode[]>([])
  const [filter, setFilter] = useState('')

  const [selectedAbsFile, setSelectedAbsFile] = useState<string | null>(null)
  const [selectedRelFile, setSelectedRelFile] = useState<string | null>(null)
  const [filePreview, setFilePreview] = useState<string>('')

  const [selectedDiffPath, setSelectedDiffPath] = useState<string | null>(null)
  const selectedDiff = selectedDiffPath ? modifiedFilesByPath[selectedDiffPath] : null

  const [selectedCmd, setSelectedCmd] = useState<string | null>(null)
  const [logText, setLogText] = useState<string>('')

  useEffect(() => {
    const t = window.setInterval(() => setClockMs(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (!projectPath) return
    void (async () => {
      try {
        const nodes = (await invoke('fs_list_tree', { root: projectPath, maxDepth: 5 })) as Array<{
          name: string
          path: string
          kind: 'file' | 'dir'
        }>
        const normalizedRoot = projectPath.replace(/\/$/, '')
        setFiles(
          nodes.map((n) => ({
            ...n,
            relPath: n.path.startsWith(normalizedRoot)
              ? n.path.slice(normalizedRoot.length).replace(/^\//, '')
              : n.path,
          })),
        )
      } catch {
        // ignore
      }
    })()
  }, [projectPath])

  const fileTree = useMemo(() => {
    const normalizedRoot = projectPath.replace(/\/$/, '')
    const filtered = filter.trim()
      ? files.filter((n) => n.path.toLowerCase().includes(filter.trim().toLowerCase()))
      : files
    return buildTree(filtered, normalizedRoot)
  }, [files, filter, projectPath])

  const diffs = useMemo(() => Object.values(modifiedFilesByPath), [modifiedFilesByPath])

  useEffect(() => {
    if (!selectedAbsFile) return
    void (async () => {
      try {
        const text = (await invoke('fs_read_text', { path: selectedAbsFile, maxBytes: 50_000 })) as string
        setFilePreview(text)
      } catch {
        setFilePreview('미리보기를 불러오지 못했습니다.')
      }
    })()
  }, [selectedAbsFile])

  useEffect(() => {
    if (!daemon || !selectedCmd) return
    void (async () => {
      try {
        const res = await daemon.bashLogGet({ runId: currentRunId ?? '__manual__', commandId: selectedCmd })
        const stdout = 'stdout' in res ? res.stdout : ''
        const stderr = 'stderr' in res ? res.stderr : ''
        const text =
          stderr && stdout ? `# stdout\n${stdout}\n\n# stderr\n${stderr}` : stdout || (stderr ? `# stderr\n${stderr}` : '')
        setLogText(text)
      } catch (e) {
        setLogText(e instanceof Error ? e.message : 'failed to load logs')
      }
    })()
  }, [daemon, selectedCmd, currentRunId])

  const renderApproval = (a: PendingApproval) => (
    <div key={a.approvalId} className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Approval · {a.kind}</div>
          <div className="mt-1 text-xs text-[color:var(--color-text-secondary)] whitespace-pre-wrap">{a.prompt}</div>
        </div>
        <div className="text-xs text-[color:var(--color-text-muted)]">
          {Math.max(0, Math.floor((a.deadlineMs - clockMs) / 1000))}s
        </div>
      </div>

      {a.diffs?.length ? (
        <div className="mt-3 space-y-2">
          {a.diffs.slice(0, 5).map((d: ModifiedFile) => (
            <button
              key={d.path}
              className="w-full rounded-xl border border-black/5 bg-white/60 px-3 py-2 text-left text-sm hover:bg-white"
              onClick={() => setSelectedDiffPath(d.path)}
            >
              <div className="truncate font-medium">{d.path}</div>
              <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
                +{d.added} −{d.removed}
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => void useAppStore.getState().approve(a.approvalId, 'approve_once')}
        >
          한 번 승인
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => void useAppStore.getState().approve(a.approvalId, 'approve_always')}
        >
          항상 승인
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => void useAppStore.getState().approve(a.approvalId, 'request_change', 'GUI에서 변경 요청')}
        >
          변경 요청
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => void useAppStore.getState().approve(a.approvalId, 'reject')}
        >
          거절
        </Button>
      </div>
    </div>
  )

  return (
    <div className="h-full snailer-card rounded-[22px] border border-black/10 bg-white/70 p-3">
      <Tabs defaultValue={isOrchestratorMode ? 'agents' : 'diffs'} className="h-full flex flex-col">
        <TabsList className="w-full">
          {isOrchestratorMode && (
            <TabsTrigger value="agents" className="flex-1">
              Agents
            </TabsTrigger>
          )}
          <TabsTrigger value="files" className="flex-1">
            Files
          </TabsTrigger>
          <TabsTrigger value="diffs" className="flex-1">
            Diff
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex-1">
            Logs
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex-1">
            Approvals
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex-1">
            Raw
          </TabsTrigger>
        </TabsList>

        {isOrchestratorMode && (
          <TabsContent value="agents" className="flex-1 min-h-0 overflow-hidden">
            <OrchestratorPanel />
          </TabsContent>
        )}

        <TabsContent value="files" className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="파일 검색…"
              className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilter('')
                void (async () => {
                  const nodes = (await invoke('fs_list_tree', { root: projectPath, maxDepth: 5 })) as Array<{
                    name: string
                    path: string
                    kind: 'file' | 'dir'
                  }>
                  const normalizedRoot = projectPath.replace(/\/$/, '')
                  setFiles(
                    nodes.map((n) => ({
                      ...n,
                      relPath: n.path.startsWith(normalizedRoot)
                        ? n.path.slice(normalizedRoot.length).replace(/^\//, '')
                        : n.path,
                    })),
                  )
                })()
              }}
            >
              새로고침
            </Button>
            </div>
            <ScrollArea className="mt-3 flex-1 min-h-0">
              <ScrollAreaViewport className="h-full">
                <div className="rounded-2xl border border-black/10 bg-white/60 p-2 shadow-sm">
                  <TreeNode
                    node={fileTree}
                    level={0}
                    onPickFile={(absPath, relPath) => {
                      setSelectedAbsFile(absPath)
                      setSelectedRelFile(relPath)
                    }}
                  />
                </div>
              </ScrollAreaViewport>
              <ScrollBar />
            </ScrollArea>
            <div className="mt-3 rounded-2xl border border-black/10 bg-white/60 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-xs font-medium text-[color:var(--color-text-secondary)]">
                  {selectedRelFile ? selectedRelFile : '파일을 선택하면 미리보기를 표시합니다.'}
                </div>
                {selectedRelFile ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void navigator.clipboard.writeText(`@${selectedRelFile}`)}
                  >
                    @복사
                  </Button>
                ) : null}
              </div>
              <pre className="mt-2 max-h-[160px] overflow-auto rounded-xl bg-white/70 p-3 text-xs leading-5">
                {selectedRelFile ? filePreview : ' '}
              </pre>
            </div>
            <div className="mt-2 text-xs text-[color:var(--color-text-muted)]">
              드래그해서 입력창에 드롭하면 <span className="font-mono">@path</span> 형태로 삽입됩니다.
            </div>
          </div>
        </TabsContent>

        <TabsContent value="diffs" className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-rows-[auto_1fr] gap-3 h-full min-h-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-black/10 bg-white/60 p-2 shadow-sm">
                <div className="px-2 py-1 text-xs font-medium text-[color:var(--color-text-secondary)]">Modified</div>
                <ScrollArea className="h-[180px]">
                  <ScrollAreaViewport className="h-full">
                    <div className="space-y-1 p-1">
                      {diffs.length === 0 ? (
                        <div className="px-2 py-2 text-sm text-[color:var(--color-text-secondary)]">
                          아직 변경된 파일이 없습니다.
                        </div>
                      ) : (
                        diffs.map((d) => (
                          <button
                            key={d.path}
                            onClick={() => setSelectedDiffPath(d.path)}
                            className={[
                              'w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white',
                              selectedDiffPath === d.path ? 'bg-white shadow-sm' : 'bg-transparent',
                            ].join(' ')}
                          >
                            <div className="truncate font-medium">{d.path}</div>
                            <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
                              +{d.added} −{d.removed} · {d.status}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollAreaViewport>
                  <ScrollBar />
                </ScrollArea>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/60 p-3 shadow-sm">
                <div className="text-xs font-medium text-[color:var(--color-text-secondary)]">Preview</div>
                <div className="mt-2 text-sm">
                  {selectedDiff ? (
                    <div className="space-y-1">
                      <div className="truncate font-medium">{selectedDiff.path}</div>
                      <div className="text-xs text-[color:var(--color-text-muted)]">
                        +{selectedDiff.added} −{selectedDiff.removed} · {selectedDiff.status}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[color:var(--color-text-secondary)]">파일을 선택하세요.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="min-h-0">
              {selectedDiff ? (
                <DiffViewer patch={selectedDiff.patch} />
              ) : (
                <div className="h-full rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-[color:var(--color-text-secondary)] shadow-sm">
                  변경 파일을 선택하면 패치(unified diff)를 보여줍니다.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="flex-1 min-h-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] gap-2 h-full min-h-0">
            <div className="rounded-2xl border border-black/10 bg-white/60 p-2 shadow-sm min-h-0 flex flex-col">
              <div className="px-2 py-1 text-xs font-medium text-[color:var(--color-text-secondary)]">Bash</div>
              <ScrollArea className="flex-1 min-h-0">
                <ScrollAreaViewport className="h-full">
                  <div className="space-y-1 p-1">
                    {bashCommands.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-[color:var(--color-text-secondary)]">
                        아직 실행된 명령이 없습니다.
                      </div>
                    ) : (
                      bashCommands.map((c) => (
                        <button
                          key={c.commandId}
                          onClick={() => setSelectedCmd(c.commandId)}
                          className={[
                            'w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white',
                            selectedCmd === c.commandId ? 'bg-white shadow-sm' : 'bg-transparent',
                          ].join(' ')}
                        >
                          <div className="truncate font-medium">{c.command}</div>
                          <div className="mt-0.5 text-xs text-[color:var(--color-text-muted)]">
                            {c.exitCode === 0 ? 'ok' : `exit ${c.exitCode}`} · {c.duration}ms
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollAreaViewport>
                <ScrollBar />
              </ScrollArea>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white/60 p-3 shadow-sm min-h-0 flex flex-col">
              <div className="text-xs font-medium text-[color:var(--color-text-secondary)]">Output</div>
              <pre className="mt-2 flex-1 min-h-0 overflow-auto rounded-xl bg-white/70 p-3 text-xs leading-5">
                {logText || '명령을 선택하면 stdout 로그를 로드합니다.'}
              </pre>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <ScrollAreaViewport className="h-full">
              <div className="space-y-3">
                {pendingApprovals.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-sm text-[color:var(--color-text-secondary)] shadow-sm">
                    대기 중인 승인 요청이 없습니다.
                  </div>
                ) : (
                  pendingApprovals.map(renderApproval)
                )}
              </div>
            </ScrollAreaViewport>
            <ScrollBar />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="raw" className="flex-1 min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex-1 min-h-0">
              <TerminalPanel />
            </div>
            <div className="mt-2 text-xs text-[color:var(--color-text-muted)]">
              GUI가 렌더링하는 메시지를 터미널 형태로 그대로 보여주는 “백업 뷰”입니다.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
