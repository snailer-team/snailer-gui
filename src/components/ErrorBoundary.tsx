import type { ReactNode } from 'react'
import { Component } from 'react'

import { Button } from './ui/button'

type Props = { children: ReactNode }
type State = { error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = {}

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="h-screen w-screen overflow-hidden bg-[#FAF9F6]">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center p-6">
          <div className="w-full rounded-2xl border border-red-200 bg-white/80 p-5 shadow-sm">
            <div className="text-sm font-semibold text-red-700">UI crashed</div>
            <div className="mt-2 text-xs text-black/60">Copy the error below and send it.</div>
            <pre className="mt-3 max-h-[45vh] overflow-auto rounded-xl border border-black/10 bg-white p-3 text-xs text-black/70">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

