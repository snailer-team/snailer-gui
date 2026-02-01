import React, { useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
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
  } = useAppStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlsRef = useRef<Map<string, string>>(new Map())
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

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
    if (Array.from(dt.items ?? []).some((x) => x.kind === 'file')) return true
    // Some platforms only expose types
    if (Array.from(dt.types ?? []).some((t) => t.toLowerCase() === 'files')) return true
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
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }, [draftPrompt])

  // Format mode/model display
  const modeDisplayRaw = modeItems.find((m) => m.token === mode)?.label || 'Agent'
  const isOrchestratorMode = mode.toLowerCase().includes('orchestrator') || mode.toLowerCase().includes('team')
  const modeDisplay = mode === 'elon' ? 'ElonX HARD' : isOrchestratorMode ? 'Orchestrator' : modeDisplayRaw
  const elonEnabled = mode === 'elon'
  const modelDisplay = model
    ?.replace('claude-', '')
    .replace('-20', ' ')
    .replace(/(\d)/, ' $1')
    .replace('minimax-', 'MiniMax ')
    || 'Opus 4.5'

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

  return (
    <div className="px-6 pb-6">
      {/* Hidden file input for image selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="mx-auto w-full max-w-4xl">
        {/* Attached images preview */}
        {attachedImages.length > 0 && (
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {attachedImages.map((img) => (
              <div
                key={img.id}
                className="group relative flex shrink-0 items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-2 py-2 text-sm shadow-sm"
              >
                {img.previewUrl ? (
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="h-12 w-12 rounded-lg object-cover border border-black/10 bg-white"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg border border-black/10 bg-white/70 grid place-items-center">
                    <IconImage className="h-5 w-5 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="max-w-[180px] truncate text-gray-800" title={img.name}>
                    {img.name}
                  </div>
                  <div className="text-xs text-gray-400">Attached</div>
                </div>
                <button
                  onClick={() => handleRemove(img.id)}
                  className="absolute -right-2 -top-2 rounded-full bg-white shadow border border-black/10 p-1 text-gray-500 opacity-0 transition group-hover:opacity-100 hover:bg-gray-50"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input card */}
        <div
          className={[
            'relative rounded-2xl border border-gray-200 bg-white shadow-sm',
            dragActive ? 'ring-2 ring-blue-200 border-blue-200' : '',
          ].join(' ')}
          onDragEnter={(e) => {
            if (busy) return
            if (hasDroppedFiles(e.dataTransfer)) {
              e.preventDefault()
              setDragActive(true)
            }
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return
            setDragActive(false)
          }}
          onDragOver={(e) => {
            if (busy) return
            if (!hasDroppedFiles(e.dataTransfer)) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setDragActive(true)
          }}
          onDrop={(e) => {
            if (busy) return
            if (!hasDroppedFiles(e.dataTransfer)) return
            e.preventDefault()
            e.stopPropagation()
            setDragActive(false)
            onDropFiles(extractDroppedFiles(e.dataTransfer))
            setDragActive(false)
          }}
        >
          {!elonEnabled ? null : (
            <div className="border-b border-black/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-black/5 text-black/70">
                    {getModeIcon('elon')}
                  </div>
                  <div className="text-xs font-semibold tracking-wide text-black/70">ElonX HARD Frame</div>
                </div>
                <button
                  type="button"
                  onClick={() => setElonFrame({ collapsed: !elonFrame.collapsed })}
                  className="rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-[11px] font-medium text-black/60 hover:bg-white"
                >
                  {elonFrame.collapsed ? 'Show' : 'Hide'}
                </button>
              </div>

              {elonFrame.collapsed ? (
                <div className="mt-2 text-[12px] text-black/50">
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
                    <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Problem</div>
                      <input
                        value={elonFrame.problem}
                        onChange={(e) => setElonFrame({ problem: e.target.value })}
                        placeholder="What are we fixing/building?"
                        className="mt-1 w-full bg-transparent text-[13px] text-black/80 placeholder:text-black/30 outline-none"
                      />
                    </div>
                    <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Constraints</div>
                      <input
                        value={elonFrame.constraints}
                        onChange={(e) => setElonFrame({ constraints: e.target.value })}
                        placeholder="Hard limits / don't break"
                        className="mt-1 w-full bg-transparent text-[13px] text-black/80 placeholder:text-black/30 outline-none"
                      />
                    </div>
                    <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Verification</div>
                      <input
                        value={elonFrame.verification}
                        onChange={(e) => setElonFrame({ verification: e.target.value })}
                        placeholder="How do we prove it's done?"
                        className="mt-1 w-full bg-transparent text-[13px] text-black/80 placeholder:text-black/30 outline-none"
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

          {/* Text area */}
          <div className="px-4 pt-4">
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
                  onDropFiles(extractDroppedFiles(e.dataTransfer))
                  return
                }
                const text = e.dataTransfer.getData('text/plain')
                if (!text) return
                e.preventDefault()
                const insert = text.endsWith(' ') ? text : text + ' '
                appendToDraftPrompt(insert)
                requestAnimationFrame(() => textareaRef.current?.focus())
              }}
              onDragOver={(e) => e.preventDefault()}
              placeholder={busy ? 'Running...' : 'Add a follow-up'}
              rows={1}
              className={[
                'min-h-[24px] max-h-[200px] w-full resize-none bg-transparent text-[15px] leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none',
                elonEnabled ? 'placeholder:text-black/35' : '',
              ].join(' ')}
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-1">
              {/* Mode dropdown */}
              <div className="relative" ref={modeDropdownRef}>
                <button
                  onClick={() => setShowModeDropdown(!showModeDropdown)}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-200 disabled:opacity-50"
                >
                  <IconInfinity className="h-4 w-4" />
                  <span>{modeDisplay}</span>
                  <IconChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {showModeDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-[100]">
                    {modeItems.map((m) => {
                      const icon = getModeIcon(m.token)
                      return (
                        <button
                          key={m.token}
                          onClick={() => void handleModeSelect(m.token)}
                          className={[
                            'w-full px-4 py-2.5 text-left text-sm transition flex items-center gap-3',
                            mode === m.token
                              ? 'bg-gray-50 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <span className="text-gray-500">{icon}</span>
                          <span className={['flex-1', mode === m.token ? 'font-medium' : ''].join(' ')}>
                            {m.label}
                          </span>
                          {mode === m.token && (
                            <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
                  className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-500 transition hover:text-gray-700 disabled:opacity-50"
                >
                  <span>{modelDisplay}</span>
                  <IconChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>

                {showModelDropdown && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-gray-200 bg-white shadow-xl z-[100]">
                    <div className="max-h-[320px] overflow-y-auto py-1">
                      {modelItems.map((m) => (
                        <button
                          key={m.token}
                          onClick={() => void handleModelSelect(m.token)}
                          className={[
                            'w-full px-4 py-2.5 text-left text-sm transition flex items-center justify-between',
                            model === m.token
                              ? 'bg-gray-50 text-gray-900'
                              : 'text-gray-700 hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <div className="min-w-0 flex-1">
                            <div className={model === m.token ? 'font-medium' : ''}>{m.label}</div>
                            {m.desc && (
                              <div className="text-xs text-gray-400 truncate">{m.desc}</div>
                            )}
                          </div>
                          {model === m.token && (
                            <svg className="h-4 w-4 text-gray-600 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
                <span className="ml-1 text-xs text-gray-400">
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
                  'rounded-lg p-2 transition',
                  attachedImages.length > 0
                    ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-gray-700"
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
                      ? 'bg-gray-900 text-white hover:bg-gray-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                  ].join(' ')}
                  title="Send (Enter)"
                >
                  <IconArrowUp className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
