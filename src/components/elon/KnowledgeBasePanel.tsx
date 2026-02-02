import { useState, useMemo } from 'react'
import { useAppStore } from '../../lib/store'
import { ScrollArea, ScrollAreaViewport, ScrollBar } from '../ui/scroll-area'

export function KnowledgeBasePanel() {
  const knowledgeBase = useAppStore((s) => s.elonX.knowledgeBase)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    for (const k of knowledgeBase) {
      for (const t of k.tags) tagSet.add(t)
    }
    return [...tagSet].sort()
  }, [knowledgeBase])

  // Filter by selected tag
  const filtered = useMemo(() => {
    if (!selectedTag) return knowledgeBase
    return knowledgeBase.filter((k) => k.tags.includes(selectedTag))
  }, [knowledgeBase, selectedTag])

  if (knowledgeBase.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl mb-3 opacity-30">🧠</div>
        <div className="text-sm font-medium text-black/50">No knowledge entries yet</div>
        <div className="text-xs text-black/35 mt-1">Knowledge is extracted from successful agent outputs</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Tag Filter Bar */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-black/5 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        <button
          type="button"
          onClick={() => setSelectedTag(null)}
          className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium transition ${
            !selectedTag ? 'bg-black/10 text-black/80' : 'text-black/40 hover:bg-black/5'
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-medium transition ${
              selectedTag === tag ? 'bg-violet-100 text-violet-700' : 'text-black/40 hover:bg-black/5'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Knowledge List */}
      <ScrollArea className="flex-1 min-h-0">
        <ScrollAreaViewport className="h-full">
          <div className="p-2 space-y-2">
            {filtered.map((k) => (
              <div key={k.id} className="rounded-xl border border-black/10 bg-white/60 p-3 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                  <span className="text-[10px] font-semibold text-violet-600 shrink-0">[{k.agentId.toUpperCase()}]</span>
                  <span className="text-[11px] font-medium text-black/70 truncate">{k.topic}</span>
                </div>
                <div className="text-[10px] text-black/60 mb-1.5 line-clamp-2 break-words">
                  {k.insight}
                </div>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-2 text-[9px] text-black/40 shrink-0">
                    <span>{Math.round(k.successRate * 100)}% success</span>
                    <span>·</span>
                    <span>Used {k.useCount}x</span>
                    <span>·</span>
                    <span>{new Date(k.createdAt).toLocaleDateString([], { month: '2-digit', day: '2-digit' })}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end min-w-0">
                    {k.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[8px] font-medium text-violet-600"
                      >
                        {tag}
                      </span>
                    ))}
                    {k.tags.length > 3 && (
                      <span className="text-[8px] text-black/40">+{k.tags.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollAreaViewport>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  )
}
