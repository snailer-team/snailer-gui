import { useMemo } from 'react'
import Editor from '@monaco-editor/react'

export function DiffViewer({ patch }: { patch: string }) {
  const value = useMemo(() => patch || '', [patch])

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-black/10 bg-white/70 shadow-sm">
      <Editor
        height="100%"
        defaultLanguage="diff"
        value={value}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
        }}
      />
    </div>
  )
}

