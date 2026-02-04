export interface Agent {
  id: string;
  name: string;
  capabilities: string[];
  status: 'available' | 'busy' | 'error' | 'maintenance';
  tier: 'free' | 'pro' | 'enterprise';
  costPerRequest?: number;
  maxConcurrentRequests: number;
  currentRequests: number;
  lastUsed?: Date;
  healthScore: number; // 0-100
<<<<<<< HEAD
  metadata?: Record<string, unknown>;
=======
  metadata?: Record<string, any>;
>>>>>>> origin/main
}

export interface RoutingContext {
  userId: string;
  requestId: string;
  requiredCapability: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  complexity?: number; // 1-10 scale
  userTier: 'free' | 'pro' | 'enterprise';
  costBudget?: number;
  timeout?: number;
<<<<<<< HEAD
  metadata?: Record<string, unknown>;
=======
  metadata?: Record<string, any>;
>>>>>>> origin/main
}

export interface RoutingResult {
  success: boolean;
  agentId: string | null;
  agent?: Agent;
  error?: string;
  routingTimeMs: number;
  estimatedCostUsd?: number;
  queuePosition?: number;
}

export interface RoutingStrategy {
  name: string;
  select: (agents: Agent[], context: RoutingContext) => Agent;
}

export interface RoutingMetrics {
  totalRequests: number;
  successfulRoutes: number;
  failedRoutes: number;
  averageRoutingTime: number;
  costSavings: number;
  agentUtilization: Record<string, number>;
}

export interface RouterConfig {
  defaultStrategy: string;
  maxRetries: number;
  timeoutMs: number;
<<<<<<< HEAD
  healthCheckInterval: number;
  enableFailover: boolean;
}
=======
>>>>>>> origin/main
