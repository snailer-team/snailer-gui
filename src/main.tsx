import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useAppStore } from './lib/store'

window.addEventListener('error', (e) => {
  const msg = e.error instanceof Error ? e.error.message : e.message
   
  console.error('[window.error]', e.error || e.message)
  useAppStore.setState({ error: msg || 'unknown error' })
})

window.addEventListener('unhandledrejection', (e) => {
  const reason = (e as PromiseRejectionEvent).reason
  const msg = reason instanceof Error ? reason.message : String(reason ?? 'unhandled rejection')
   
  console.error('[unhandledrejection]', reason)
  useAppStore.setState({ error: msg })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
