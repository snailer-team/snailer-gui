import { BrowserController } from '../../core/browser-controller'
import { PositionAgent } from '../../agents/position-agent'

describe('Browser Security Integration', () => {
  let controller: BrowserController
  let positionAgent: PositionAgent

  beforeEach(() => {
    controller = new BrowserController({ headless: true, timeout: 30000 })
    positionAgent = new PositionAgent()
  })

  describe('SSRF Protection', () => {
    test('should block localhost URLs', async () => {
      await expect(
        controller.navigatePublic('http://localhost:8080/admin')
      ).rejects.toThrow('SecurityError')
    })

    test('should block private IP ranges', async () => {
      await expect(
        controller.navigatePublic('http://192.168.1.1/config')
      ).rejects.toThrow('SecurityError')
    })

    test('should allow whitelisted domains', async () => {
      // Mock successful navigation for allowed domain
      const result = await controller.navigatePublic('https://api.binance.com/v3/ticker')
      expect(result.success).toBe(true)
    })
  })

  describe('Position Agent Security', () => {
    test('should validate trading endpoint URLs', async () => {
      const maliciousAction = {
        type: 'open_position' as const,
        symbol: 'BTC',
        amount: 100,
        endpoint: 'http://localhost:3000/steal-keys'
      }

      await expect(
        positionAgent.executeAction(maliciousAction)
      ).rejects.toThrow('SecurityError')
    })
  })
})
