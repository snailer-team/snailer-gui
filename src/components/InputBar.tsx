import React, { useEffect, useRef, useState } from 'react'
import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'

import { useAppStore } from '../lib/store'

// Infinity icon for Agent
function IconInfinity({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
    </svg>
  )
}

// Image icon
function IconImage({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}

// Send arrow icon
function IconArrowUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Stop icon
function IconStop({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  )
}

// Chevron down icon
function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// X icon for removing images
function IconX({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconFolder({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  )
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v6c0 5.25 3.4 8.88 7 10 3.6-1.12 7-4.75 7-10V6l-7-3Z" />
    </svg>
  )
}

function IconBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="6" cy="5" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M8 5h4a4 4 0 0 1 4 4v0M8 5v10a4 4 0 0 0 4 4h4" />
    </svg>
  )
}

type BudgetStatus = {
  mainLimitUsd: number
  mainSpentUsd: number
  month: number
  year: number
}

type GitBranchItem = {
  name: string
}

type GitBranchListResponse = {
  currentBranch: string
  branches: GitBranchItem[]
  changedFiles: number
  added: number
  removed: number
}

function baseName(p: string) {
  const cleaned = (p || '').replace(/\/$/, '')
  const parts = cleaned.split('/')
  return parts[parts.length - 1] || cleaned || 'Local'
}

function nameFromFilePath(path: string) {
  const normalized = (path || '').replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || 'image'
}

function fileUriToPath(uri: string): string | null {
  const raw = uri.trim()
  if (!raw) return null

  if (raw.startsWith('file://')) {
    try {
      const parsed = new URL(raw)
      if (parsed.protocol !== 'file:') return null
      let path = decodeURIComponent(parsed.pathname || '')
      // Windows file URI path format: /C:/Users/...
      if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1)
      return path || null
    } catch {
      return null
    }
  }

  if (/^[A-Za-z]:[\\/]/.test(raw)) return raw
  if (raw.startsWith('/')) return raw
  return null
}

function extractFilePathsFromTransfer(dt: DataTransfer | null): string[] {
  if (!dt) return []

  const out: string[] = []
  const seen = new Set<string>()
  const candidates = [dt.getData('text/uri-list'), dt.getData('text/plain')]

  for (const raw of candidates) {
    if (!raw) continue
    const lines = raw.split(/\r?\n/g)
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const path = fileUriToPath(trimmed)
      if (!path || seen.has(path)) continue
      seen.add(path)
      out.push(path)
    }
  }

  return out
}

// Get icon for mode
function getModeIcon(token: string): React.ReactNode {
  const lower = token.toLowerCase()
  if (lower.includes('elon') || lower.includes('hard')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" strokeLinejoin="round" />
      </svg>
    )
  }
  if (lower.includes('classic') || lower.includes('agent')) {
    return <IconInfinity className="h-4 w-4" />
  }
  if (lower.includes('plan')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="5" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="12" r="2" />
        <path d="M12 7v3M8 12h2M14 12h2" />
      </svg>
    )
  }
  if (lower.includes('debug') || lower.includes('doctor')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.05 7.05l1.41 1.41M15.54 15.54l1.41 1.41M7.05 16.95l1.41-1.41M15.54 8.46l1.41-1.41" />
      </svg>
    )
  }
  if (lower.includes('ask') || lower.includes('chat')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    )
  }
  if (lower.includes('team') || lower.includes('orchestrator')) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="7" r="3" />
        <circle cx="5" cy="17" r="3" />
        <circle cx="19" cy="17" r="3" />
        <path d="M12 10v2M8 15l2-3M16 15l-2-3" />
      </svg>
    )
  }
  return <IconInfinity className="h-4 w-4" />
}

export function InputBar() {
  const {
    sendPrompt,
    currentRunStatus,
    cancelRun,
    draftPrompt,
    setDraftPrompt,
    appendToDraftPrompt,
    mode,
    model,
    modeItems,
    modelItems,
    daemon,
    setUiMode,
    promptStageWizard,
    elonFrame,
    setElonFrame,
    attachedImages,
    addAttachedImage,
    removeAttachedImage,
    projectPath,
    setProjectPath,
    autoApprove,
    setViewMode,
  } = useAppStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef<Map<string, string>>(new Map())
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [showPermissionDropdown, setShowPermissionDropdown] = useState(false)
  const [showBranchDropdown, setShowBranchDropdown] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const permissionDropdownRef = useRef<HTMLDivElement>(null)
  const branchDropdownRef = useRef<HTMLDivElement>(null)
  const [gitBranch, setGitBranch] = useState('No branch')
  const [gitBranches, setGitBranches] = useState<string[]>([])
  const [gitChangedFiles, setGitChangedFiles] = useState(0)
  const [gitAdded, setGitAdded] = useState(0)
  const [gitRemoved, setGitRemoved] = useState(0)
  const [branchSwitching, setBranchSwitching] = useState(false)
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null)

  const extractDroppedFiles = (dt: DataTransfer | null): File[] => {
    if (!dt) return []
    const out: File[] = []
    const seen = new Set<string>()

    // Prefer DataTransferItemList when available (some WebViews don't populate dt.files reliably)
    const items = Array.from(dt.items ?? [])
    for (const it of items) {
      if (it.kind !== 'file') continue
      const f = it.getAsFile()
      if (!f) continue
      const key = `${f.name}:${f.size}:${f.lastModified}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(f)
    }

    // Fallback to dt.files
    const files = Array.from(dt.files ?? [])
    for (const f of files) {
      const key = `${f.name}:${f.size}:${f.lastModified}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(f)
    }

    return out
  }

  const hasDroppedFiles = (dt: DataTransfer | null): boolean => {
    if (!dt) return false
    if ((dt.files?.length ?? 0) > 0) return true
    if (Array.from(dt.items ?? []).some((x) => x.kind === 'file' || x.type.startsWith('image/'))) return true
    // Some platforms only expose drag types (Finder/WebView/macOS)
    const types = Array.from(dt.types ?? []).map((t) => t.toLowerCase())
    if (types.includes('files')) return true
    if (types.includes('text/uri-list')) return true
    if (types.includes('public.file-url')) return true
    if (types.includes('application/x-moz-file')) return true
    return false
  }

  const busy =
    currentRunStatus === 'running' ||
    currentRunStatus === 'queued' ||
    currentRunStatus === 'awaiting_approval' ||
    Boolean(promptStageWizard)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    // Revoke object URLs for removed attachments to avoid leaking memory.
    const nextIds = new Set(attachedImages.map((x) => x.id))
    for (const [id, url] of objectUrlsRef.current.entries()) {
      if (!nextIds.has(id)) {
        URL.revokeObjectURL(url)
        objectUrlsRef.current.delete(id)
      }
    }
  }, [attachedImages])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false)
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
      if (permissionDropdownRef.current && !permissionDropdownRef.current.contains(e.target as Node)) {
        setShowPermissionDropdown(false)
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setShowBranchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
  }, [draftPrompt])

  // Format mode/model display
  const modeDisplayRaw = modeItems.find((m) => m.token === mode)?.label || 'Agent'
  const isOrchestratorMode = mode.toLowerCase().includes('orchestrator') || mode.toLowerCase().includes('team')
  const modeDisplay = mode === 'elon' ? 'ElonX HARD' : isOrchestratorMode ? 'Orchestrator' : modeDisplayRaw
  const elonEnabled = mode === 'elon'
  const modelDisplay = model
    ? (
      model === 'auto'
        ? 'Auto Select'
        : model
          .replace('claude-', '')
          .replace('-20', ' ')
          .replace(/(\d)/, ' $1')
          .replace('minimax-', 'MiniMax ')
    )
    : 'Auto Select'

  const budgetLimit = budgetStatus?.mainLimitUsd ?? 0
  const budgetSpent = budgetStatus?.mainSpentUsd ?? 0
  const budgetRatio = budgetLimit > 0 ? Math.max(0, Math.min(1, budgetSpent / budgetLimit)) : 0

  const handleSend = () => {
    const prompt = draftPrompt.trim()
    if (!prompt || busy) return
    void sendPrompt(prompt)
  }

  const handleModeSelect = async (token: string) => {
    await setUiMode(token)
    setShowModeDropdown(false)
  }

  const handleModelSelect = async (token: string) => {
    useAppStore.setState({ model: token })
    await daemon?.settingsSet({ model: token })
    setShowModelDropdown(false)
  }

  const handlePickFolder = async () => {
    try {
      const result = await invoke<string | null>('pick_folder')
      if (result) {
        await setProjectPath(result)
      }
    } catch (e) {
      toast('Failed to pick folder', { description: e instanceof Error ? e.message : String(e) })
    }
  }

  const handlePermissionSelect = (nextAutoApprove: boolean) => {
    useAppStore.setState({ autoApprove: nextAutoApprove })
    setShowPermissionDropdown(false)
  }

  const refreshBranchState = async () => {
    if (!projectPath) {
      setGitBranch('No workspace')
      setGitBranches([])
      setGitChangedFiles(0)
      setGitAdded(0)
      setGitRemoved(0)
      return
    }
    try {
      const data = await invoke<GitBranchListResponse>('git_branch_list', { cwd: projectPath })
      const current = String(data.currentBranch || '').trim()
      setGitBranch(current || 'No branch')
      setGitBranches((Array.isArray(data.branches) ? data.branches : []).map((b) => b.name).filter(Boolean))
      setGitChangedFiles(Number(data.changedFiles ?? 0))
      setGitAdded(Number(data.added ?? 0))
      setGitRemoved(Number(data.removed ?? 0))
    } catch {
      setGitBranch('No git')
      setGitBranches([])
      setGitChangedFiles(0)
      setGitAdded(0)
      setGitRemoved(0)
    }
  }

  const handleSwitchBranch = async (branchName: string) => {
    if (!projectPath || !branchName || branchName === gitBranch) {
      setShowBranchDropdown(false)
      return
    }
    try {
      setBranchSwitching(true)
      await invoke('git_branch_checkout', { cwd: projectPath, branchName })
      await refreshBranchState()
      setShowBranchDropdown(false)
      toast('Branch switched', { description: branchName })
    } catch (e) {
      toast('Failed to switch branch', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBranchSwitching(false)
    }
  }

  const handleCreateAndCheckoutBranch = async () => {
    if (!projectPath) return
    const branchName = window.prompt('Switch branch and checkout new branch...')
    if (!branchName || !branchName.trim()) return
    try {
      setBranchSwitching(true)
      await invoke('git_branch_create', { cwd: projectPath, branchName: branchName.trim() })
      await refreshBranchState()
      setShowBranchDropdown(false)
      toast('Branch created', { description: branchName.trim() })
    } catch (e) {
      toast('Failed to create branch', { description: e instanceof Error ? e.message : String(e) })
    } finally {
      setBranchSwitching(false)
    }
  }

  const handleAttachImage = () => {
    fileInputRef.current?.click()
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer)
    const chunkSize = 0x4000
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      let part = ''
      for (let j = 0; j < chunk.length; j++) part += String.fromCharCode(chunk[j]!)
      binary += part
    }
    return btoa(binary)
  }

  const saveImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast('Only image files are supported.')
      return
    }
    const remaining = 10 - attachedImages.length
    if (remaining <= 0) {
      toast('You can attach up to 10 images.')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      toast('Image is too large', { description: 'Max 12MB per image.' })
      return
    }

    const id = crypto.randomUUID()
    const previewUrl = URL.createObjectURL(file)
    objectUrlsRef.current.set(id, previewUrl)

    try {
      const dataBase64 = arrayBufferToBase64(await file.arrayBuffer())
      const path = await invoke<string>(
        'attachment_save_image',
        {
          req: {
            name: file.name || 'image',
            mime: file.type || 'image/*',
            dataBase64,
          },
        } as unknown as Record<string, unknown>,
      )

      addAttachedImage({
        id,
        path,
        name: file.name || 'image',
        previewUrl,
      })
    } catch (e) {
      URL.revokeObjectURL(previewUrl)
      objectUrlsRef.current.delete(id)
      throw e
    }
  }

  const saveImagePath = async (localPath: string) => {
    const remaining = 10 - attachedImages.length
    if (remaining <= 0) {
      toast('You can attach up to 10 images.')
      return
    }

    const id = crypto.randomUUID()
    const savedPath = await invoke<string>(
      'attachment_save_image_from_path',
      {
        req: {
          path: localPath,
        },
      } as unknown as Record<string, unknown>,
    )

    addAttachedImage({
      id,
      path: savedPath,
      name: nameFromFilePath(localPath),
      previewUrl: convertFileSrc(savedPath),
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    const remaining = 10 - attachedImages.length
    if (list.length > remaining) {
      toast('Image limit reached', { description: 'You can attach up to 10 images.' })
    }
    void (async () => {
      for (const f of list.slice(0, Math.max(0, remaining))) {
        try {
          await saveImageFile(f)
        } catch (err) {
          toast('Failed to attach image', { description: err instanceof Error ? err.message : String(err) })
        }
      }
    })()

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const handleRemove = (id: string) => {
    const url = objectUrlsRef.current.get(id)
    if (url) URL.revokeObjectURL(url)
    objectUrlsRef.current.delete(id)
    removeAttachedImage(id)
  }

  const onDropFiles = (files: File[]) => {
    const list = files.filter((f) => f.type.startsWith('image/'))
    if (list.length === 0) return
    const remaining = 10 - attachedImages.length
    if (remaining <= 0) {
      toast('You can attach up to 10 images.')
      return
    }
    if (list.length > remaining) {
      toast('Image limit reached', { description: 'You can attach up to 10 images.' })
    }
    void (async () => {
      for (const f of list.slice(0, Math.max(0, remaining))) {
        try {
          await saveImageFile(f)
        } catch (err) {
          toast('Failed to attach image', { description: err instanceof Error ? err.message : String(err) })
        }
      }
    })()
  }

  const onDropPaths = (paths: string[]) => {
    if (paths.length === 0) return
    const remaining = 10 - attachedImages.length
    if (remaining <= 0) {
      toast('You can attach up to 10 images.')
      return
    }
    if (paths.length > remaining) {
      toast('Image limit reached', { description: 'You can attach up to 10 images.' })
    }
    void (async () => {
      for (const p of paths.slice(0, Math.max(0, remaining))) {
        try {
          await saveImagePath(p)
        } catch (err) {
          toast('Failed to attach image', { description: err instanceof Error ? err.message : String(err) })
        }
      }
    })()
  }

  const handleDataTransferDrop = (dt: DataTransfer | null) => {
    const files = extractDroppedFiles(dt)
    if (files.length > 0) {
      onDropFiles(files)
      return
    }
    const paths = extractFilePathsFromTransfer(dt)
    if (paths.length > 0) {
      onDropPaths(paths)
    }
  }

  useEffect(() => {
    let cancelled = false

    const refreshGitBranch = async () => {
      try {
        await refreshBranchState()
      } catch {
        if (!cancelled) setGitBranch('No git')
      }
    }

    void refreshGitBranch()
    const timer = window.setInterval(() => { void refreshGitBranch() }, 20_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [projectPath])

  useEffect(() => {
    if (!showBranchDropdown || branchSwitching) return
    void refreshBranchState()
  }, [showBranchDropdown, branchSwitching, projectPath])

  useEffect(() => {
    let cancelled = false
    const refreshBudget = async () => {
      try {
        const status = await invoke<BudgetStatus>('budget_get_status')
        if (!cancelled) setBudgetStatus(status)
      } catch {
        if (!cancelled) setBudgetStatus(null)
      }
    }

    void refreshBudget()
    const timer = window.setInterval(() => { void refreshBudget() }, 15_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [currentRunStatus])

  return (
    <div className="px-0.5 pb-0.5">
      {/* Hidden file input for image selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mx-auto w-full max-w-[760px]">
        {/* Main input card */}
        <div
          className={[
            'relative rounded-[20px] border border-[color:var(--color-border)] bg-[#f7f9fc] shadow-sm',
            dragActive ? 'border-blue-200 ring-2 ring-blue-100' : '',
          ].join(' ')}
          onDragEnter={(e) => {
            if (busy) return
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setDragActive(false)
          }}
          onDragOver={(e) => {
            if (busy) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setDragActive(true)
          }}
          onDrop={(e) => {
            if (busy) return
            e.preventDefault()
            e.stopPropagation()
            setDragActive(false)
            handleDataTransferDrop(e.dataTransfer)
          }}
        >
          {!elonEnabled ? null : (
            <div className="border-b border-black/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    {getModeIcon('elon')}
                  </div>
                  <div className="text-xs font-semibold tracking-wide text-slate-700">ElonX HARD Frame</div>
                </div>
                <button
                  type="button"
                  onClick={() => setElonFrame({ collapsed: !elonFrame.collapsed })}
                  className="rounded-lg border border-[color:var(--color-border)] bg-[#f8fafc] px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-white"
                >
                  {elonFrame.collapsed ? 'Show' : 'Hide'}
                </button>
              </div>

              {elonFrame.collapsed ? (
                <div className="mt-2 text-[12px] text-slate-500">
                  {(elonFrame.problem || elonFrame.constraints || elonFrame.verification)
                    ? [
                        elonFrame.problem ? `Problem: ${elonFrame.problem}` : null,
                        elonFrame.constraints ? `Constraints: ${elonFrame.constraints}` : null,
                        elonFrame.verification ? `Verification: ${elonFrame.verification}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')
                    : 'Set a one-line problem, constraints, and verification.'}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-[color:var(--color-border)] bg-[#f8fafc] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Problem</div>
                      <input
                        value={elonFrame.problem}
                        onChange={(e) => setElonFrame({ problem: e.target.value })}
                        placeholder="What are we fixing/building?"
                        className="mt-1 w-full bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                    <div className="rounded-xl border border-[color:var(--color-border)] bg-[#f8fafc] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Constraints</div>
                      <input
                        value={elonFrame.constraints}
                        onChange={(e) => setElonFrame({ constraints: e.target.value })}
                        placeholder="Hard limits / don't break"
                        className="mt-1 w-full bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                    <div className="rounded-xl border border-[color:var(--color-border)] bg-[#f8fafc] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Verification</div>
                      <input
                        value={elonFrame.verification}
                        onChange={(e) => setElonFrame({ verification: e.target.value })}
                        placeholder="How do we prove it's done?"
                        className="mt-1 w-full bg-transparent text-[13px] text-slate-700 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {dragActive ? (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-blue-50/40 backdrop-blur-[1px]">
              <div className="rounded-xl border border-blue-200 bg-white/80 px-4 py-2 text-sm text-blue-900 shadow-sm">
                Drop images to attach (max 10)
              </div>
            </div>
          ) : null}

          {/* Attached images preview (inside prompt area, top) */}
          {attachedImages.length > 0 && (
            <div className="px-3.5 pt-3">
              <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {attachedImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
                  >
                    {img.previewUrl ? (
                      <img
                        src={img.previewUrl}
                        alt={img.name}
                        className="h-7 w-7 rounded-full border border-slate-200 bg-white object-cover"
                      />
                    ) : (
                      <div className="grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-[#f8fafc]">
                        <IconImage className="h-4 w-4 text-slate-500" />
                      </div>
                    )}
                    <div className="max-w-[185px] truncate text-[13px] leading-5 text-slate-800" title={img.name}>
                      {img.name}
                    </div>
                    <button
                      onClick={() => handleRemove(img.id)}
                      className="absolute -right-1 -top-1 rounded-full border border-slate-200 bg-white p-0.5 text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-slate-50"
                    >
                      <IconX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text area */}
          <div className="px-3.5 pt-2.5">
            <textarea
              ref={textareaRef}
              value={draftPrompt}
              disabled={busy}
              onChange={(e) => setDraftPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              onDrop={(e) => {
                // Handle dropped files (images) and dropped text
                if (hasDroppedFiles(e.dataTransfer)) {
                  if (busy) return
                  e.preventDefault()
                  e.stopPropagation()
                  setDragActive(false)
                  handleDataTransferDrop(e.dataTransfer)
                  return
                }
                const text = e.dataTransfer.getData('text/plain')
                if (!text) return
                e.preventDefault()
                setDragActive(false)
                const insert = text.endsWith(' ') ? text : text + ' '
                appendToDraftPrompt(insert)
                requestAnimationFrame(() => textareaRef.current?.focus())
              }}
              onDragOver={(e) => e.preventDefault()}
              placeholder={busy ? 'Running...' : 'Snailer Coder'}
              rows={1}
              className={[
                'min-h-[40px] max-h-[140px] w-full resize-none border-0 bg-transparent text-[14px] leading-[1.4] text-slate-800 placeholder:text-slate-400 outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0',
                elonEnabled ? 'placeholder:text-slate-400' : '',
              ].join(' ')}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3.5 pb-1.5 pt-0.5">
            <div className="flex items-center gap-1">
              {/* Mode dropdown */}
              <div className="relative" ref={modeDropdownRef}>
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-full bg-[#eef3f8] px-2.5 py-1 text-[12px] font-medium text-slate-600 transition hover:bg-[#e5edf6] disabled:opacity-50"
                >
                  <IconInfinity className="h-4 w-4" />
                  <span>{modeDisplay}</span>
                  <IconChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {showModeDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-[color:var(--color-border)] bg-white py-1 shadow-xl z-[100]">
                    {modeItems.map((m) => {
                      const icon = getModeIcon(m.token)
                      return (
                        <button
                          key={m.token}
                          onClick={() => void handleModeSelect(m.token)}
                          className={[
                            'w-full px-4 py-2.5 text-left text-sm transition flex items-center gap-3',
                            mode === m.token
                              ? 'bg-[#f8fafc] text-slate-900'
                              : 'text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <span className="text-slate-500">{icon}</span>
                          <span className={['flex-1', mode === m.token ? 'font-medium' : ''].join(' ')}>
                            {m.label}
                          </span>
                          {mode === m.token && (
                            <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Model dropdown */}
              <div className="relative" ref={modelDropdownRef}>
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-full px-2 py-1 text-[12px] text-slate-500 transition hover:bg-[#f2f6fb] hover:text-slate-700 disabled:opacity-50"
                >
                  <span>{modelDisplay}</span>
                  <IconChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {showModelDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-[color:var(--color-border)] bg-white shadow-xl z-[100]">
                    <div className="max-h-[320px] overflow-y-auto py-1">
                      {modelItems.map((m) => (
                        <button
                          key={m.token}
                          onClick={() => void handleModelSelect(m.token)}
                          className={[
                            'w-full px-4 py-2.5 text-left text-sm transition flex items-center justify-between',
                            model === m.token
                              ? 'bg-[#f8fafc] text-slate-900'
                              : 'text-slate-700 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="min-w-0 flex-1">
                            <div className={model === m.token ? 'font-medium' : ''}>{m.label}</div>
                            {m.desc && (
                              <div className="text-xs text-slate-400 truncate">{m.desc}</div>
                            )}
                          </div>
                          {model === m.token && (
                            <svg className="h-4 w-4 text-slate-600 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Image count indicator */}
              {attachedImages.length > 0 && (
                <span className="ml-1 text-xs text-slate-400">
                  {attachedImages.length}x
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Image attachment button */}
              <button
                onClick={() => void handleAttachImage()}
                disabled={busy || attachedImages.length >= 10}
                className={[
                  'rounded-md p-2 transition',
                  attachedImages.length > 0
                    ? 'text-blue-500 hover:bg-blue-50'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
                  busy || attachedImages.length >= 10 ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
                title="Attach image"
              >
                <IconImage className="h-5 w-5" />
              </button>

              {/* Send/Stop button */}
              {busy ? (
                <button
                  onClick={() => void cancelRun()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
                  title="Stop"
                >
                  <IconStop className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!draftPrompt.trim()}
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full transition',
                    draftPrompt.trim()
                      ? 'bg-slate-900 text-white hover:bg-slate-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                  ].join(' ')}
                  title="Send (Enter)"
                >
                  <IconArrowUp className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Composer status row (CLI-style) */}
        <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePickFolder()}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-slate-600 transition hover:text-slate-800"
              title={projectPath || 'Select workspace folder'}
            >
              <IconFolder className="h-4 w-4 text-slate-400" />
              <span className="max-w-[160px] truncate">{baseName(projectPath)}</span>
              <IconChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="relative" ref={permissionDropdownRef}>
              <button
                type="button"
                onClick={() => setShowPermissionDropdown((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-slate-600 transition hover:text-slate-800"
                title="Approval permission mode"
              >
                <IconShield className="h-4 w-4 text-slate-400" />
                <span>{autoApprove ? 'Auto approve' : 'Default permission'}</span>
                <IconChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showPermissionDropdown && (
                <div className="absolute bottom-full left-0 z-[120] mb-2 w-56 rounded-xl border border-[color:var(--color-border)] bg-white py-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => handlePermissionSelect(false)}
                    className={[
                      'w-full px-4 py-2.5 text-left text-sm transition',
                      autoApprove ? 'text-slate-700 hover:bg-slate-50' : 'bg-[#f8fafc] font-medium text-slate-900',
                    ].join(' ')}
                  >
                    Default permission
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermissionSelect(true)}
                    className={[
                      'w-full px-4 py-2.5 text-left text-sm transition',
                      autoApprove ? 'bg-[#f8fafc] font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Auto approve
                  </button>
                </div>
              )}
            </div>

            <div className="relative" ref={branchDropdownRef}>
              <button
                type="button"
                disabled={busy || branchSwitching}
                onClick={() => setShowBranchDropdown((v) => !v)}
                className={[
                  'inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-slate-600 transition hover:text-slate-800',
                  busy || branchSwitching ? 'cursor-not-allowed opacity-60' : '',
                ].join(' ')}
                title={gitBranch}
              >
                <IconBranch className="h-4 w-4 text-slate-400" />
                <span className="max-w-[170px] truncate">{gitBranch}</span>
                {gitChangedFiles > 0 ? (
                  <span className="text-xs text-slate-400">{gitChangedFiles} files</span>
                ) : null}
                <IconChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showBranchDropdown && (
                <div className="absolute bottom-full left-0 z-[120] mb-2 w-[320px] overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-white shadow-lg">
                  <div className="border-b border-[color:var(--color-border)] px-3 py-2">
                    <div className="text-sm font-medium text-slate-700">Checkout branch</div>
                  </div>

                  <div className="max-h-[260px] overflow-y-auto">
                    {gitBranches.map((name) => {
                      const active = name === gitBranch
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => void handleSwitchBranch(name)}
                          className={[
                            'flex w-full items-start justify-between px-3 py-2 text-left transition',
                            active ? 'bg-[#f8fafc]' : 'hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <IconBranch className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                              <span className="truncate text-sm font-medium leading-5 text-slate-800">{name}</span>
                            </div>
                            {active && gitChangedFiles > 0 ? (
                              <div className="pl-5 pt-0.5 text-xs leading-4 text-slate-500">
                                Uncommitted: {gitChangedFiles} files
                                <span className="ml-2 text-emerald-600">+{gitAdded.toLocaleString()}</span>
                                <span className="ml-1 text-rose-500">-{gitRemoved.toLocaleString()}</span>
                              </div>
                            ) : null}
                          </div>
                          {active ? (
                            <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </button>
                      )
                    })}
                    {gitBranches.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-500">No branches found</div>
                    ) : null}
                  </div>

                  <div className="border-t border-[color:var(--color-border)] p-2">
                    <button
                      type="button"
                      onClick={() => void handleCreateAndCheckoutBranch()}
                      className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      Switch branch and checkout new branch...
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('settings')}
            className="inline-flex items-center justify-center rounded-full p-0.5 transition hover:bg-slate-100"
            title={budgetStatus ? 'Budget usage' : 'Budget usage unavailable'}
          >
            <svg viewBox="0 0 40 40" className="h-8 w-8" aria-hidden="true">
              <circle cx="20" cy="20" r="16" className="fill-none stroke-slate-200" strokeWidth="4" />
              <circle
                cx="20"
                cy="20"
                r="16"
                className="fill-none stroke-slate-700 transition-all"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 16}`}
                strokeDashoffset={`${2 * Math.PI * 16 * (1 - budgetRatio)}`}
                transform="rotate(-90 20 20)"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
