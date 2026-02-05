import { BrowserController } from '../core/browser-controller'
import type { BrowserAction } from '../types/browser'

describe('BrowserController', () => {
  let controller: BrowserController

  beforeEach(() => {
    controller = new BrowserController({ headless: true, timeout: 30000 })
  })

  describe('executeAction', () => {
    it('should execute navigate action successfully', async () => {
      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://example.com'
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should execute click action with selector', async () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#submit-btn'
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
    })

    it('should execute input action', async () => {
      const action: BrowserAction = {
        type: 'input',
        selector: '#email',
        value: 'test@example.com'
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
    })

    it('should execute extract action', async () => {
      const action: BrowserAction = {
        type: 'extract',
        selector: '.content'
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
    })

    it('should execute wait action', async () => {
      const action: BrowserAction = {
        type: 'wait',
        timeout: 100
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
      expect(result.latencyMs).toBeGreaterThanOrEqual(100)
    })
  })

  describe('getMetrics', () => {
    it('should return metrics object', () => {
      const metrics = controller.getMetrics()

      expect(metrics).toHaveProperty('actionsExecuted')
      expect(metrics).toHaveProperty('successRate')
    })
  })

  describe('getConfig', () => {
    it('should return config object', () => {
      const config = controller.getConfig()

      expect(config).toHaveProperty('headless', true)
      expect(config).toHaveProperty('timeout', 30000)
    })
  })
})
