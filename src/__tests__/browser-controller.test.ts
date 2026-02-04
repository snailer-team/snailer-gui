import { BrowserController } from '../core/browser-controller'
<<<<<<< HEAD
import type { BrowserAction } from '../types/browser'

describe('BrowserController', () => {
  let controller: BrowserController

  beforeEach(() => {
    controller = new BrowserController({ headless: true, timeout: 30000 })
=======
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
<<<<<<< HEAD
        url: 'https://example.com'
=======
        url: 'https://example.com',
        timestamp: Date.now()
>>>>>>> origin/main
      }

      const result = await controller.executeAction(action)

<<<<<<< HEAD
      expect(result.success).toBe(true)
      expect(result.latencyMs).toBeGreaterThanOrEqual(0)
=======
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com')
      expect(result.success).toBe(true)
      expect(result.timestamp).toBeDefined()
>>>>>>> origin/main
    })

    it('should execute click action with selector', async () => {
      const action: BrowserAction = {
        type: 'click',
<<<<<<< HEAD
        selector: '#submit-btn'
=======
        selector: '#submit-btn',
        timestamp: Date.now()
>>>>>>> origin/main
      }

      const result = await controller.executeAction(action)

<<<<<<< HEAD
      expect(result.success).toBe(true)
    })

    it('should execute input action', async () => {
      const action: BrowserAction = {
        type: 'input',
        selector: '#email',
        value: 'test@example.com'
=======
      expect(mockPage.click).toHaveBeenCalledWith('#submit-btn')
      expect(result.success).toBe(true)
    })

    it('should handle action execution errors gracefully', async () => {
      mockPage.click.mockRejectedValue(new Error('Element not found'))
      
      const action: BrowserAction = {
        type: 'click',
        selector: '#missing-element',
        timestamp: Date.now()
>>>>>>> origin/main
      }

      const result = await controller.executeAction(action)

<<<<<<< HEAD
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
