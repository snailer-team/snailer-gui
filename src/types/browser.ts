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
<<<<<<< HEAD
    schema?: unknown;
=======
    schema?: any;
>>>>>>> origin/main
  };
}

export interface BrowserResult {
  success: boolean;
<<<<<<< HEAD
  data?: unknown;
=======
  data?: any;
>>>>>>> origin/main
  error?: string;
  latencyMs: number;
}

export interface ToolConfig {
  name: string;
  type: 'browser' | 'file-system' | 'api-client';
<<<<<<< HEAD
  config: unknown;
=======
  config: any;
>>>>>>> origin/main
}

export interface ToolAction {
  command: string;
<<<<<<< HEAD
  parameters?: Record<string, unknown>;
  expectedOutput?: {
    format: 'json' | 'text';
    schema?: unknown;
=======
  parameters?: Record<string, any>;
  expectedOutput?: {
    format: 'json' | 'text';
    schema?: any;
>>>>>>> origin/main
  };
}

export interface ToolResult {
  success: boolean;
<<<<<<< HEAD
  data?: unknown;
=======
  data?: any;
>>>>>>> origin/main
  error?: string;
  latencyMs: number;
  toolName: string;
}

export interface AgentToolIntegration {
  agentId: string;
  availableTools: string[];
<<<<<<< HEAD
  permissions: Record<string, boolean>;
}
=======
>>>>>>> origin/main
