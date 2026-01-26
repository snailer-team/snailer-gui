import { useAppStore } from '../lib/store'

function SuggestionCard({
  title,
  pill,
  onClick,
}: {
  title: string
  pill: string
  onClick: () => void
}) {
  return (
    <button
      className="snailer-pill w-full rounded-[18px] bg-white/60 px-4 py-4 text-left shadow-sm hover:bg-white/80"
      onClick={onClick}
    >
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-2 inline-flex items-center rounded-full bg-black/5 px-2 py-0.5 text-xs font-mono text-black/60">
        {pill}
      </div>
    </button>
  )
}

export function Suggestions() {
  const { appendToDraftPrompt } = useAppStore()
  return (
    <div className="mx-auto mt-6 w-full max-w-4xl px-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SuggestionCard
          title="CLAUDE.md 만들기/업데이트"
          pill="CLAUDE.md"
          onClick={() => appendToDraftPrompt('Create or update my CLAUDE.md file.\n')}
        />
        <SuggestionCard
          title="TODO 찾아서 고치기"
          pill="TODO"
          onClick={() => appendToDraftPrompt('Search for a TODO comment and fix it.\n')}
        />
        <SuggestionCard
          title="테스트 개선 추천 + 1개 구현"
          pill="tests"
          onClick={() => appendToDraftPrompt('Recommend areas to improve our tests and implement one improvement.\n')}
        />
      </div>
    </div>
  )
}
