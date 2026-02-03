/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { ToolConfig, ToolAction, ToolResult } from '../types/browser';
import { BrowserController } from './browser-controller';
import { JsonValidator } from '../utils/json-validator';

export class ToolManager {
  private tools: Map<string, any> = new Map();
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

      let result: any;
      
      if (toolName === 'browser') {
        result = await tool.executeAction(action);
      } else {
        result = await tool.execute(action);
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
        error: error.message,
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

  registerTool(tool: any): boolean {
    if (!tool.id || !tool.name || !tool.execute) {
      return false;
    }
    if (this.tools.has(tool.id)) {
      return false;
    }
    this.tools.set(tool.id, tool);
    return true;
  }

  getTool(id: string): any {
    return this.tools.get(id);
  }

  listTools(): any[] {
    return Array.from(this.tools.values());
  }
}
