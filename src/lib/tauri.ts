export function isTauriRuntime(): boolean {
  const w = window as unknown as Record<string, unknown>
  return Boolean(w.__TAURI_INTERNALS__ || w.__TAURI__ || w.__TAURI_IPC__)
}

