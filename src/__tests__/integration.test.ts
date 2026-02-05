import { BrowserController } from '../core/browser-controller'
import { ToolManager } from '../core/tool-manager'
import type { BrowserAction } from '../types/browser'

describe('Browser-Tool Integration', () => {
  let browserController: BrowserController
  let toolManager: ToolManager

  beforeAll(() => {
    browserController = new BrowserController({ headless: true, timeout: 30000 })
    toolManager = new ToolManager()
  })

  describe('BrowserController', () => {
    it('should execute navigate action', async () => {
      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://example.com'
      }

      const result = await browserController.executeAction(action)

      expect(result.success).toBe(true)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should execute click action', async () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#submit-btn'
      }

      const result = await browserController.executeAction(action)

      expect(result.success).toBe(true)
    })

    it('should return metrics', () => {
      const metrics = browserController.getMetrics()

      expect(metrics).toHaveProperty('actionsExecuted')
      expect(metrics).toHaveProperty('successRate')
    })
  })

  describe('ToolManager', () => {
    it('should execute browser tool', async () => {
      const result = await toolManager.executeTool('browser', {
        command: 'navigate',
        parameters: { url: 'https://example.com' }
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('toolName', 'browser')
    })

    it('should return error for non-existent tool', async () => {
      const result = await toolManager.executeTool('non-existent', {
        command: 'test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })
})
