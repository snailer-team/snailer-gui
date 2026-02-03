import { AgentMessage, LLMRouter } from './llm-router';
import { smartRoutingStrategy } from './routing-strategies';

export class AgentCommunicationManager {
  private router: LLMRouter;
  private agents: Map<string, AgentConnection> = new Map();
  private messageHistory: AgentMessage[] = [];

  constructor() {
    this.router = new LLMRouter(smartRoutingStrategy);
    this.setupDefaultProviders();
  }

  private setupDefaultProviders(): void {
    this.router.addProvider({
      name: 'openai-gpt4',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      maxTokens: 8000,
      costPerToken: 0.00003
    });
    
    this.router.addProvider({
      name: 'anthropic-claude',
      endpoint: 'https://api.anthropic.com/v1/messages',
      maxTokens: 4000,
      costPerToken: 0.000015
    });
  }

  registerAgent(agentId: string, connection: AgentConnection): void {
    this.agents.set(agentId, connection);
    console.log(`Agent ${agentId} registered`);
  }

  async sendMessage(from: string, to: string, content: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<string> {
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      content,
      timestamp: Date.now(),
      type: to === 'broadcast' ? 'broadcast' : 'request',
      priority
    };

    this.messageHistory.push(message);

    try {
      const response = await this.router.routeMessage(message);
      
      if (to !== 'broadcast' && this.agents.has(to)) {
        this.agents.get(to)?.receive(message, response);
      }
      
      return response;
    } catch (error) {
      console.error(`Failed to route message from ${from} to ${to}:`, error);
      throw error;
    }
  }

  getMetrics() {
    return {
      ...this.router.getMetrics(),
      activeAgents: this.agents.size,
      totalMessages: this.messageHistory.length
    };
  }
}

export interface AgentConnection {
  receive(message: AgentMessage, response: string): void;
}