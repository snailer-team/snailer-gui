import type { Agent, RoutingStrategy, RoutingContext } from '../types/routing';

export const loadBalanceStrategy: RoutingStrategy = {
  name: 'load-balance',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  select: (agents: Agent[], _context: RoutingContext): Agent => {
    // Simple round-robin based on current request count
    return agents.reduce((min, agent) =>
      agent.currentRequests < min.currentRequests ? agent : min
    , agents[0]);
  }
};

export const priorityStrategy: RoutingStrategy = {
  name: 'priority',
  select: (agents: Agent[], context: RoutingContext): Agent => {
    // Prioritize by health score and tier match
    const sortedAgents = [...agents].sort((a, b) => {
      // Prefer matching tier
      const tierMatch = (agent: Agent) => agent.tier === context.userTier ? 1 : 0;
      const tierDiff = tierMatch(b) - tierMatch(a);
      if (tierDiff !== 0) return tierDiff;

      // Then by health score
      return b.healthScore - a.healthScore;
    });
    return sortedAgents[0];
  }
};

export const costOptimizedStrategy: RoutingStrategy = {
  name: 'cost-optimized',
  select: (agents: Agent[], context: RoutingContext): Agent => {
    // Filter by budget if specified
    let eligibleAgents = agents;
    if (context.costBudget !== undefined) {
      eligibleAgents = agents.filter(a => (a.costPerRequest || 0) <= context.costBudget!);
    }

    if (eligibleAgents.length === 0) {
      eligibleAgents = agents;
    }

    // Select lowest cost agent
    return eligibleAgents.reduce((min, agent) =>
      (agent.costPerRequest || 0) < (min.costPerRequest || 0) ? agent : min
    , eligibleAgents[0]);
  }
};
