<<<<<<< HEAD
/* eslint-disable @typescript-eslint/no-explicit-any */
=======
>>>>>>> origin/main
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
<<<<<<< HEAD
  timestamp?: number;
  text?: string;
=======
>>>>>>> origin/main
  expectedOutput?: {
    format: 'json' | 'text' | 'html';
    schema?: any;
  };
}

export interface BrowserResult {
  success: boolean;
  data?: any;
  error?: string;
  latencyMs: number;
<<<<<<< HEAD
  timestamp?: number;
=======
>>>>>>> origin/main
}

export interface ToolConfig {
  name: string;
  type: 'browser' | 'file-system' | 'api-client';
  config: any;
}

export interface ToolAction {
  command: string;
  parameters?: Record<string, any>;
  expectedOutput?: {
    format: 'json' | 'text';
    schema?: any;
  };
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  latencyMs: number;
<<<<<<< HEAD
  toolName?: string;
  timestamp?: number;
=======
  toolName: string;
>>>>>>> origin/main
}

export interface AgentToolIntegration {
  agentId: string;
  availableTools: string[];
<<<<<<< HEAD
  permissions: string[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  execute: (params: any) => Promise<ToolResult>;
  validate: (params: any) => boolean;
}

export interface BrowserState {
  url: string;
  title: string;
  isLoading: boolean;
}
=======
>>>>>>> origin/main
