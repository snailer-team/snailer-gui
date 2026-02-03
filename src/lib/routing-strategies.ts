import { AgentMessage, LLMProvider, RoutingStrategy } from './llm-router';

export const costOptimizedStrategy: RoutingStrategy = {
  name: 'cost-optimized',
  selectProvider: (message: AgentMessage, providers: LLMProvider[]) => {
    return providers.reduce((cheapest, current) => 
      current.costPerToken < cheapest.costPerToken ? current : cheapest
    );
  }
};

export const latencyOptimizedStrategy: RoutingStrategy = {
  name: 'latency-optimized', 
  selectProvider: (message: AgentMessage, providers: LLMProvider[]) => {
    if (message.priority === 'high') {
      return providers.find(p => p.name.includes('fast')) || providers[0];
    }
    return providers[0];
  }
};

export const loadBalancedStrategy: RoutingStrategy = {
  name: 'load-balanced',
  selectProvider: (message: AgentMessage, providers: LLMProvider[]) => {
    const index = Math.floor(Math.random() * providers.length);
    return providers[index];
  }
};

export const smartRoutingStrategy: RoutingStrategy = {
  name: 'smart-routing',
  selectProvider: (message: AgentMessage, providers: LLMProvider[]) => {
    if (message.type === 'broadcast') {
      return costOptimizedStrategy.selectProvider(message, providers);
    }
    
    if (message.priority === 'high') {
      return latencyOptimizedStrategy.selectProvider(message, providers);
    }
    
    if (message.content.length > 1000) {
      return providers.find(p => p.maxTokens > 4000) || providers[0];
    }
    
    return loadBalancedStrategy.selectProvider(message, providers);
  }
};