<<<<<<< HEAD
import type { BrowserConfig, BrowserAction, BrowserResult } from '../types/browser';
=======
import { BrowserConfig, BrowserAction, BrowserResult } from '../types/browser';
>>>>>>> origin/main
import { JsonValidator } from '../utils/json-validator';

export class BrowserController {
  private config: BrowserConfig;
  private validator: JsonValidator;

  constructor(config: BrowserConfig) {
    this.config = config;
    this.validator = new JsonValidator();
  }

  async executeAction(action: BrowserAction): Promise<BrowserResult> {
    const startTime = Date.now();

    try {
      // Validate JSON output before processing
      if (action.expectedOutput && action.expectedOutput.format === 'json') {
        this.validator.validateSchema(action.expectedOutput.schema);
      }

      const result = await this.performAction(action);
      
      // Validate JSON response if expected
      if (result.data && action.expectedOutput?.format === 'json') {
        const validJson = this.validator.validateAndFix(result.data);
        result.data = validJson;
      }

      return {
        ...result,
        latencyMs: Date.now() - startTime,
        success: true
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
        data: null
      };
    }
  }

  private async performAction(action: BrowserAction): Promise<Partial<BrowserResult>> {
    switch (action.type) {
      case 'navigate':
        return await this.navigate(action.url!);
      case 'click':
        return await this.click(action.selector!);
      case 'input':
        return await this.input(action.selector!, action.value!);
      case 'extract':
        return await this.extractData(action.selector!);
      case 'wait':
        return await this.wait(action.timeout || 1000);
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  private async navigate(url: string): Promise<Partial<BrowserResult>> {
    // Simulate browser navigation
    return { data: { navigated: true, url } };
  }

  private async click(selector: string): Promise<Partial<BrowserResult>> {
    // Simulate element click
    return { data: { clicked: true, selector } };
  }

  private async input(selector: string, value: string): Promise<Partial<BrowserResult>> {
    // Simulate input
    return { data: { inputted: true, selector, value } };
  }

  private async extractData(selector: string): Promise<Partial<BrowserResult>> {
    // Simulate data extraction
    return { data: { extracted: true, selector, content: 'sample content' } };
  }

  private async wait(timeout: number): Promise<Partial<BrowserResult>> {
    await new Promise(resolve => setTimeout(resolve, timeout));
    return { data: { waited: true, timeout } };
  }

  getMetrics() {
    return { actionsExecuted: 0, successRate: 100 };
  }
<<<<<<< HEAD

  getConfig() {
    return this.config;
  }
}
=======
>>>>>>> origin/main
