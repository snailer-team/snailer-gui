<<<<<<< HEAD
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { BrowserController } from '../core/browser-controller'
import type { BrowserAction } from '../types/browser'

describe('BrowserController', () => {
  let controller: BrowserController

  beforeEach(() => {
    controller = new BrowserController({ headless: true, timeout: 30000 })
=======
import { BrowserController } from '../core/browser-controller'
import { BrowserAction, BrowserState } from '../types/browser'

// Mock external dependencies
jest.mock('puppeteer', () => ({
  launch: jest.fn(),
  connect: jest.fn()
}))

describe('BrowserController', () => {
  let controller: BrowserController
  let mockBrowser: any
  let mockPage: any

  beforeEach(() => {
    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      click: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue({}),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
      close: jest.fn().mockResolvedValue(undefined)
    }
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined)
    }
    controller = new BrowserController()
    // @ts-ignore - accessing private property for testing
    controller.browser = mockBrowser
    // @ts-ignore
    controller.page = mockPage
  })

  afterEach(() => {
    jest.clearAllMocks()
>>>>>>> origin/main
  })

  describe('executeAction', () => {
    it('should execute navigate action successfully', async () => {
      const action: BrowserAction = {
        type: 'navigate',
        url: 'https://example.com',
        timestamp: Date.now()
      }

      const result = await controller.executeAction(action)

<<<<<<< HEAD
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('navigated', true)
=======
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com')
      expect(result.success).toBe(true)
      expect(result.timestamp).toBeDefined()
>>>>>>> origin/main
    })

    it('should execute click action with selector', async () => {
      const action: BrowserAction = {
        type: 'click',
        selector: '#submit-btn',
        timestamp: Date.now()
      }

      const result = await controller.executeAction(action)

<<<<<<< HEAD
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('clicked', true)
    })

    it('should execute input action', async () => {
      const action: BrowserAction = {
        type: 'input',
        selector: '#username',
        value: 'testuser',
=======
      expect(mockPage.click).toHaveBeenCalledWith('#submit-btn')
      expect(result.success).toBe(true)
    })

    it('should handle action execution errors gracefully', async () => {
      mockPage.click.mockRejectedValue(new Error('Element not found'))
      
      const action: BrowserAction = {
        type: 'click',
        selector: '#missing-element',
>>>>>>> origin/main
        timestamp: Date.now()
      }

      const result = await controller.executeAction(action)

<<<<<<< HEAD
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
=======
      expect(result.success).toBe(false)
      expect(result.error).toContain('Element not found')
    })

    it('should validate required action properties', async () => {
      const invalidAction = { type: 'navigate' } as BrowserAction

      const result = await controller.executeAction(invalidAction)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Missing required')
    })
>>>>>>> origin/main
