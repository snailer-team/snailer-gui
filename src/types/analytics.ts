export interface AnalyticsEvent {
  type: 'click' | 'page_view' | 'experiment_interaction' | 'conversion' | 'error';
  userId?: string;
  timestamp?: number;
  sessionId?: string;
  experimentId?: string;
  variant?: string;
  metadata?: Record<string, unknown>;
}

export interface UserBehavior {
  sessionStart: number;
  clickCount: number;
  pageViews: number;
  experimentInteractions: Array<{
    experimentId: string;
    variant: string;
    timestamp: number;
  }>;
}

export interface RealTimeMetrics {
  activeUsers: number;
  conversionRate: number;
  avgSessionTime: number;
  experiments: Array<{
    id: string;
    name: string;
    variants: Array<{
      id: string;
      name: string;
      conversionRate: number;
    }>;
  }>;
}
