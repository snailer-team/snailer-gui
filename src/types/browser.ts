export interface BrowserConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'input' | 'extract' | 'wait';
  url?: string;
  selector?: string;
  value?: string;
  timeout?: number;
  expectedOutput?: {
    format: 'json' | 'text' | 'html';
    schema?: unknown;
  };
}

export interface BrowserResult {
  success: boolean;
  data?: unknown;
  error?: string;
  latencyMs: number;
}

export interface ToolConfig {
  name: string;
  type: 'browser' | 'file-system' | 'api-client';
  config: unknown;
}

export interface ToolAction {
  command: string;
  parameters?: Record<string, unknown>;
  expectedOutput?: {
    format: 'json' | 'text';
    schema?: unknown;
  };
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  latencyMs: number;
  toolName: string;
}

export interface AgentToolIntegration {
  agentId: string;
  availableTools: string[];
  permissions: Record<string, boolean>;
}
