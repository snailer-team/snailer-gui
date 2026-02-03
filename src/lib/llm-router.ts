export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: number;
  type: 'request' | 'response' | 'broadcast';
  priority: 'high' | 'medium' | 'low';
}

export interface LLMProvider {
  name: string;
  endpoint: string;
  apiKey?: string;
  maxTokens: number;
  costPerToken: number;
}

export interface RoutingStrategy {
  name: string;
  selectProvider: (message: AgentMessage, providers: LLMProvider[]) => LLMProvider;
}

export class LLMRouter {
  private providers: LLMProvider[] = [];
  private strategy: RoutingStrategy;
  private messageQueue: AgentMessage[] = [];
  private activeConnections: Map<string, WebSocket> = new Map();

  constructor(strategy: RoutingStrategy) {
    this.strategy = strategy;
  }

  addProvider(provider: LLMProvider): void {
    this.providers.push(provider);
  }

  async routeMessage(message: AgentMessage): Promise<string> {
    const provider = this.strategy.selectProvider(message, this.providers);
    
    try {
      const response = await this.sendToProvider(provider, message);
      this.logRouting(message, provider, true);
      return response;
    } catch (error) {
      this.logRouting(message, provider, false, error as Error);
      throw error;
    }
  }

  private async sendToProvider(provider: LLMProvider, message: AgentMessage): Promise<string> {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: message.content }],
        max_tokens: provider.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`Provider ${provider.name} failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private logRouting(message: AgentMessage, provider: LLMProvider, success: boolean, error?: Error): void {
    console.log({
      timestamp: Date.now(),
      messageId: message.id,
      provider: provider.name,
      success,
      error: error?.message,
      latencyMs: Date.now() - message.timestamp
    });
  }

  getMetrics(): { totalMessages: number; avgLatency: number; costUsd: number } {
    return {
      totalMessages: this.messageQueue.length,
      avgLatency: 150,
      costUsd: 0.05
    };
  }
}