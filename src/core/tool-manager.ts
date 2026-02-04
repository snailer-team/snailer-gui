<<<<<<< HEAD
import type { ToolAction, ToolResult, BrowserAction } from '../types/browser';
=======
import { ToolConfig, ToolAction, ToolResult } from '../types/browser';
>>>>>>> origin/main
import { BrowserController } from './browser-controller';
import { JsonValidator } from '../utils/json-validator';

export class ToolManager {
<<<<<<< HEAD
  private tools: Map<string, unknown> = new Map();
=======
  private tools: Map<string, any> = new Map();
>>>>>>> origin/main
  private browserController: BrowserController;
  private validator: JsonValidator;

  constructor() {
    this.validator = new JsonValidator();
    this.browserController = new BrowserController({
      headless: true,
      timeout: 30000
    });
    this.initializeTools();
  }

  private initializeTools() {
    this.tools.set('browser', this.browserController);
    this.tools.set('file-system', this.createFileSystemTool());
    this.tools.set('api-client', this.createApiClientTool());
  }

  async executeTool(toolName: string, action: ToolAction): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool '${toolName}' not found`);
      }

<<<<<<< HEAD
      let result: { data?: unknown };

      if (toolName === 'browser') {
        result = await (tool as BrowserController).executeAction(action as unknown as BrowserAction);
      } else {
        result = await (tool as { execute: (action: ToolAction) => Promise<{ data: unknown }> }).execute(action);
=======
      let result: any;
      
      if (toolName === 'browser') {
        result = await tool.executeAction(action);
      } else {
        result = await tool.execute(action);
>>>>>>> origin/main
      }

      // Validate JSON output
      if (result.data && typeof result.data === 'string') {
        try {
          const parsed = JSON.parse(result.data);
          result.data = this.validator.validateAndFix(parsed);
        } catch {
          // Not JSON, keep as is
        }
      }

      return {
        success: true,
        data: result.data,
        latencyMs: Date.now() - startTime,
        toolName
      };
    } catch (error) {
      return {
        success: false,
<<<<<<< HEAD
        error: error instanceof Error ? error.message : 'Unknown error',
=======
        error: error.message,
>>>>>>> origin/main
        latencyMs: Date.now() - startTime,
        toolName
      };
    }
  }

  private createFileSystemTool() {
    return {
      execute: async (action: ToolAction) => ({ data: { fileSystem: true, action } })
    };
  }

  private createApiClientTool() {
    return {
      execute: async (action: ToolAction) => ({ data: { apiCall: true, action } })
    };
  }
<<<<<<< HEAD
}
=======
>>>>>>> origin/main
