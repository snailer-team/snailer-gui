/* eslint-disable react-hooks/purity */
import { useState, useCallback, useRef } from 'react'
import type { AnalyticsEvent, UserBehavior, RealTimeMetrics } from '../types/analytics'

export interface AnalyticsHook {
  trackEvent: (event: AnalyticsEvent) => void
  getMetrics: () => Promise<RealTimeMetrics>
  getUserBehavior: () => UserBehavior
  flushEvents: () => void
}

export function useAnalytics(): AnalyticsHook {
  const [eventQueue, setEventQueue] = useState<AnalyticsEvent[]>([])
  const sessionStartRef = useRef(Date.now())
  const [userBehavior, setUserBehavior] = useState<UserBehavior>({
    sessionStart: sessionStartRef.current,
    clickCount: 0,
    pageViews: 0,
    experimentInteractions: []
  })
  const metricsCache = useRef<RealTimeMetrics | null>(null)
  const lastFetch = useRef<number>(0)

  const trackEvent = useCallback((event: AnalyticsEvent) => {
    const enrichedEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: `session_${sessionStartRef.current}`,
      userId: event.userId || 'anonymous'
    }

    setEventQueue(prev => [...prev, enrichedEvent])
    
    // Update user behavior
    setUserBehavior(prev => ({
      ...prev,
      clickCount: prev.clickCount + (event.type === 'click' ? 1 : 0),
      pageViews: prev.pageViews + (event.type === 'page_view' ? 1 : 0),
      experimentInteractions: event.type === 'experiment_interaction' 
        ? [...prev.experimentInteractions, { experimentId: event.experimentId!, variant: event.variant!, timestamp: Date.now() }]
        : prev.experimentInteractions
    }))
  }, [])

  const getMetrics = useCallback(async (): Promise<RealTimeMetrics> => {
    const now = Date.now()
    
    // Cache for 5 seconds to avoid excessive API calls
    if (metricsCache.current && (now - lastFetch.current) < 5000) {
      return metricsCache.current
    }

    try {
      const response = await fetch('/api/analytics/metrics')
      const metrics = await response.json()
      metricsCache.current = metrics
      lastFetch.current = now
      return metrics
    } catch (error) {
      console.error('Failed to fetch real-time metrics:', error)
      return { activeUsers: 0, conversionRate: 0, avgSessionTime: 0, experiments: [] }
    }
  }, [])

  const getUserBehavior = useCallback(() => userBehavior, [userBehavior])
  
  const flushEvents = useCallback(() => {
    if (eventQueue.length === 0) return

    // Send events to analytics backend
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventQueue)
    }).catch(err => console.error('Failed to flush analytics events:', err))

    setEventQueue([])
  }, [eventQueue])

  return { trackEvent, getMetrics, getUserBehavior, flushEvents }
}
