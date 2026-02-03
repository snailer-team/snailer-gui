/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
        url: 'https://example.com',
        timestamp: Date.now()
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('navigated', true)
    })

    it('should execute click action with selector', async () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#submit-btn',
        timestamp: Date.now()
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('clicked', true)
    })

    it('should execute input action', async () => {
      const action: BrowserAction = {
        type: 'input',
        selector: '#username',
        value: 'testuser',
        timestamp: Date.now()
      }

      const result = await controller.executeAction(action)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('inputted', true)
    })

    it('should handle unsupported action types', async () => {
      const action = { type: 'unsupported' } as any

      const result = await controller.executeAction(action)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported action type')
    })
  })

  describe('navigatePublic', () => {
    it('should block localhost URLs', async () => {
      await expect(
        controller.navigatePublic('http://localhost:8080/admin')
      ).rejects.toThrow('SecurityError')
    })

    it('should block private IP ranges', async () => {
      await expect(
        controller.navigatePublic('http://192.168.1.1/config')
      ).rejects.toThrow('SecurityError')
    })

    it('should allow external URLs', async () => {
      const result = await controller.navigatePublic('https://example.com')
      expect(result.success).toBe(true)
    })
  })
})
