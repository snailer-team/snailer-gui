export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  priority: number;
  modelPreference: 'claude-3-sonnet' | 'gpt-4' | 'claude-3-haiku';
}

export interface RoutingRequest {
  message: string;
  context?: {
    files?: string[];
    currentTask?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  userIntent?: 'code' | 'test' | 'plan' | 'review' | 'deploy';
}

export interface RoutingResult {
  selectedAgent: AgentCapability;
  confidence: number;
  reasoning: string;
  fallbackAgents: AgentCapability[];
}

class LLMRouter {
  private agents: AgentCapability[] = [
    {
      id: 'swe-2',
      name: 'Software Engineer #2',
      description: 'Bottom-up builder for code implementation, debugging, and prototyping',
      keywords: ['code', 'implement', 'bug', 'fix', 'build', 'prototype', 'typescript', 'react', 'api'],
      priority: 10,
      modelPreference: 'claude-3-sonnet'
    },
    {
      id: 'qa',
      name: 'QA Engineer',
      description: 'Testing, validation, and quality assurance specialist',
      keywords: ['test', 'validate', 'quality', 'regression', 'e2e', 'unit', 'integration'],
      priority: 8,
      modelPreference: 'claude-3-haiku'
    },
    {
      id: 'pm',
      name: 'Product Manager',
      description: 'Strategic planning, requirements analysis, and project coordination',
      keywords: ['plan', 'strategy', 'requirements', 'roadmap', 'priority', 'feature', 'business'],
      priority: 6,
      modelPreference: 'gpt-4'
    }
  ];

  route(request: RoutingRequest): RoutingResult {
    const scores = this.agents.map(agent => ({
      agent,
      score: this.calculateScore(request, agent)
    }));

    scores.sort((a, b) => b.score - a.score);
    const selected = scores[0];
    
    return {
      selectedAgent: selected.agent,
      confidence: selected.score,
      reasoning: this.generateReasoning(request, selected.agent, selected.score),
      fallbackAgents: scores.slice(1, 3).map(s => s.agent)
    };
  }

  private calculateScore(request: RoutingRequest, agent: AgentCapability): number {
    const message = request.message.toLowerCase();
    let score = 0;

    // Keyword matching
    agent.keywords.forEach(keyword => {
      if (message.includes(keyword)) score += 2;
    });

    // User intent bonus
    if (request.userIntent === 'code' && agent.id === 'swe-2') score += 5;
    if (request.userIntent === 'test' && agent.id === 'qa') score += 5;
    if (request.userIntent === 'plan' && agent.id === 'pm') score += 5;

    // Urgency factor
    if (request.context?.urgency === 'critical' && agent.id === 'swe-2') score += 3;
