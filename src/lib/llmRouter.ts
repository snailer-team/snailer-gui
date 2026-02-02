/**
 * LLM Router - Intelligent model dispatch for agent optimization
 * Priority: Grok > GPT-4 > Claude based on task complexity and latency
 */

export interface LLMModel {
  id: string;
  name: string;
  provider: 'grok' | 'openai' | 'anthropic';
  costPerToken: number;
  avgLatencyMs: number;
  maxTokens: number;
  priority: number; // 1 = highest
}

export interface RoutingContext {
  agentId: string;
  taskType: 'code' | 'analysis' | 'planning' | 'review';
  complexity: 'low' | 'medium' | 'high';
  maxLatency?: number;
  maxCost?: number;
}

export interface RoutingMetrics {
  modelId: string;
  latencyMs: number;
  costUsd: number;
  success: boolean;
  timestamp: number;
}

class LLMRouter {
  private models: LLMModel[] = [
    {
      id: 'grok-beta',
      name: 'Grok Beta',
      provider: 'grok',
      costPerToken: 0.00001,
      avgLatencyMs: 800,
      maxTokens: 8192,
      priority: 1
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      costPerToken: 0.00003,
      avgLatencyMs: 1200,
      maxTokens: 16384,
      priority: 2
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      costPerToken: 0.00002,
      avgLatencyMs: 1000,
      maxTokens: 12288,
      priority: 3
    }
  ];

  private metrics: RoutingMetrics[] = [];

  selectModel(context: RoutingContext): LLMModel {
    // Grok priority for all code tasks
    if (context.taskType === 'code') {
      return this.models[0]; // Grok
    }

    // Filter by constraints
    let candidates = this.models.filter(model => {
      if (context.maxLatency && model.avgLatencyMs > context.maxLatency) return false;
      if (context.maxCost && model.costPerToken > context.maxCost) return false;
      return true;
    });

    if (candidates.length === 0) candidates = this.models;

    // Sort by priority (Grok first)
    return candidates.sort((a, b) => a.priority - b.priority)[0];
  }

  recordMetrics(metrics: RoutingMetrics): void {
    this.metrics.push(metrics);
  }

  getPerformanceStats() {
    return this.metrics.reduce((acc, m) => {
