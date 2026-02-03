/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { BrowserController } from '../core/browser-controller'
import { ToolManager } from '../core/tool-manager'
import { BrowserAction } from '../types/browser'

describe('Browser-Tool Integration E2E', () => {
  let browserController: BrowserController
  let toolManager: ToolManager
  
  beforeAll(async () => {
    browserController = new BrowserController()
    toolManager = new ToolManager()
    
    // Register test tools
    toolManager.registerTool({
      id: 'screenshot-tool',
      name: 'Screenshot Tool',
      description: 'Takes browser screenshots',
      execute: async (params: any) => {
        const screenshot = await browserController.takeScreenshot()
        return { success: true, data: screenshot, timestamp: Date.now() }
      },
      validate: (params: any) => true
    })
    
    toolManager.registerTool({
      id: 'navigation-tool',
      name: 'Navigation Tool', 
      description: 'Handles browser navigation',
      execute: async (params: any) => {
        const action: BrowserAction = {
          type: 'navigate',
          url: params.url,
          timestamp: Date.now()
        }
        const result = await browserController.executeAction(action)
        return result
      },
      validate: (params: any) => !!params.url
    })
  }, 30000)
  
  afterAll(async () => {
    await browserController.close()
  })

  it('should execute end-to-end browser automation workflow', async () => {
    // Step 1: Initialize browser
    const initResult = await browserController.initialize()
    expect(initResult.success).toBe(true)
    
    // Step 2: Navigate using tool
    const navResult = await toolManager.executeTool('navigation-tool', {
      url: 'https://httpbin.org/html'
    })
    expect(navResult.success).toBe(true)
    
    // Step 3: Take screenshot using tool
    const screenshotResult = await toolManager.executeTool('screenshot-tool', {})
    expect(screenshotResult.success).toBe(true)
    expect(screenshotResult.data).toBeDefined()
  }, 30000)
  
  it('should handle complex multi-step automation', async () => {
    const actions: BrowserAction[] = [
      {
        type: 'navigate',
        url: 'https://httpbin.org/forms/post',
        timestamp: Date.now()
      },
      {
        type: 'type',
        selector: 'input[name="custname"]',
        text: 'Test User',
        timestamp: Date.now()
      },
      {
        type: 'type',
        selector: 'input[name="custtel"]', 
        text: '123-456-7890',
        timestamp: Date.now()
      }
    ]
    
    const results = []
    for (const action of actions) {
      const result = await browserController.executeAction(action)
      results.push(result)
    }
    
    // Verify all actions succeeded
    expect(results.every(r => r.success)).toBe(true)
    
    // Verify final state with screenshot
    const screenshot = await browserController.takeScreenshot()
    expect(screenshot).toBeDefined()
  }, 30000)
})
