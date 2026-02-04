<<<<<<< HEAD
import type { Agent, RoutingStrategy, RoutingContext, RoutingResult } from '../types/routing';
=======
import { Agent, RoutingStrategy, RoutingContext, RoutingResult } from '../types/routing';
>>>>>>> origin/main
import { loadBalanceStrategy } from '../utils/routing-strategies';

export class AgentRouter {
  private agents: Map<string, Agent> = new Map();
  private strategy: RoutingStrategy = loadBalanceStrategy;
  private metrics: Map<string, number> = new Map();

  constructor(agents: Agent[] = [], strategy?: RoutingStrategy) {
    agents.forEach(agent => this.registerAgent(agent));
    if (strategy) this.strategy = strategy;
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    this.metrics.set(agent.id, 0);
  }

  unregisterAgent(agentId: string): boolean {
    this.metrics.delete(agentId);
    return this.agents.delete(agentId);
  }

  async route(context: RoutingContext): Promise<RoutingResult> {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'available' && 
                      agent.capabilities.includes(context.requiredCapability));

    if (availableAgents.length === 0) {
      return {
        success: false,
        error: 'No available agents for required capability',
        agentId: null,
        routingTimeMs: 0
      };
    }

    const startTime = Date.now();
    const selectedAgent = this.strategy.select(availableAgents, context);
    const routingTimeMs = Date.now() - startTime;

    // Update metrics
    const currentMetric = this.metrics.get(selectedAgent.id) || 0;
    this.metrics.set(selectedAgent.id, currentMetric + 1);

    // Mark agent as busy
    selectedAgent.status = 'busy';
    selectedAgent.lastUsed = new Date();

    return {
      success: true,
      agentId: selectedAgent.id,
      agent: selectedAgent,
      routingTimeMs,
      estimatedCostUsd: this.calculateCost(selectedAgent, context)
    };
  }

  releaseAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'available';
    }
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  getHealthyAgents(): Agent[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.status !== 'error');
  }

  private calculateCost(agent: Agent, context: RoutingContext): number {
    // Base cost calculation - can be enhanced with tier-based pricing
    const baseCost = agent.costPerRequest || 0.001;
    const complexityMultiplier = context.complexity || 1;
    return baseCost * complexityMultiplier;
  }

  setRoutingStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
  }
}
