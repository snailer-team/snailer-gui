import { useEffect, useRef } from 'react'
import { useAppStore } from '../lib/store'

/**
 * Hook that manages the CEO Auto-Cycle scheduler.
 * - Runs a timer every second when auto-cycle is enabled
 * - Triggers cycle execution when nextRunAt is reached
 * - Expires old broadcasts
 * - Handles cleanup on unmount
 *
 * Usage: Call this hook once in the ElonLayout component.
 */
export function useAutoCycleScheduler() {
  const {
    elonX,
    autoCycleTick,
    autoCycleExpireBroadcasts,
  } = useAppStore()

  const { autoCycle } = elonX
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    // Only run when auto-cycle is enabled
    if (!autoCycle.enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Start the timer
    intervalRef.current = window.setInterval(() => {
      autoCycleTick()
      autoCycleExpireBroadcasts()
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoCycle.enabled, autoCycleTick, autoCycleExpireBroadcasts])

  return {
    isEnabled: autoCycle.enabled,
    status: autoCycle.status,
    nextRunAt: autoCycle.nextRunAt,
    consecutiveFailures: autoCycle.consecutiveFailures,
  }
}
