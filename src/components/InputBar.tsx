import React, { useEffect, useRef, useState } from 'react'

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
    attachedImages,
    addAttachedImage,
    removeAttachedImage,
  } = useAppStore()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showModeDropdown, setShowModeDropdown] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const modeDropdownRef = useRef<HTMLDivElement>(null)
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  const busy = currentRunStatus === 'running' || currentRunStatus === 'queued' || currentRunStatus === 'awaiting_approval'

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

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
  const modeDisplay = isOrchestratorMode ? 'Orchestrator' : modeDisplayRaw
  const modelDisplay = model
    ?.replace('claude-', '')
    .replace('-20', ' ')
    .replace(/(\d)/, ' $1')
    .replace('minimax-', 'MiniMax ')
    || 'Opus 4.5'

  const handleSend = () => {
    const prompt = draftPrompt.trim()
    if (!prompt || busy) return
    setDraftPrompt('')
    void sendPrompt(prompt)
  }

  const handleModeSelect = async (token: string) => {
    useAppStore.setState({ mode: token })
    await daemon?.settingsSet({ mode: token })
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // For web/Tauri, we need to get the file path
      // In Tauri, webkitRelativePath might contain the path
      // Otherwise we use the file name
      const path = (file as unknown as { path?: string }).path || file.name
      addAttachedImage(path)
    }

    // Reset input so same file can be selected again
    e.target.value = ''
  }

  // Get filename from path
  const getFileName = (path: string) => {
    const parts = path.split(/[/\\]/)
    return parts[parts.length - 1] || path
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
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedImages.map((path) => (
              <div
                key={path}
                className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-sm"
              >
                <IconImage className="h-4 w-4 text-gray-500" />
                <span className="max-w-[150px] truncate text-gray-700" title={path}>
                  {getFileName(path)}
                </span>
                <button
                  onClick={() => removeAttachedImage(path)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                // Handle dropped files
                const files = e.dataTransfer.files
                if (files && files.length > 0) {
                  e.preventDefault()
                  for (let i = 0; i < files.length; i++) {
                    const file = files[i]
                    if (file.type.startsWith('image/')) {
                      // Note: For dropped files, we'd need to get the path via Tauri
                      // For now, we'll use the text drop behavior
                    }
                  }
                }

                // Handle dropped text
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
              className="min-h-[24px] max-h-[200px] w-full resize-none bg-transparent text-[15px] leading-6 text-gray-900 placeholder:text-gray-400 focus:outline-none"
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
                disabled={busy}
                className={[
                  'rounded-lg p-2 transition',
                  attachedImages.length > 0
                    ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
                  busy ? 'opacity-50 cursor-not-allowed' : '',
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
                  disabled={!draftPrompt.trim() && attachedImages.length === 0}
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full transition',
                    draftPrompt.trim() || attachedImages.length > 0
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
