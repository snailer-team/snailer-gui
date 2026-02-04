import { BrowserController } from '../../core/browser-controller'
import { PositionAgent } from '../../agents/position-agent'
<<<<<<< HEAD
=======
import { SecurityError } from '../../types/errors'
>>>>>>> origin/main

describe('Browser Security Integration', () => {
  let controller: BrowserController
  let positionAgent: PositionAgent

  beforeEach(() => {
<<<<<<< HEAD
    controller = new BrowserController({ headless: true, timeout: 30000 })
=======
    controller = new BrowserController()
>>>>>>> origin/main
    positionAgent = new PositionAgent()
  })

  describe('SSRF Protection', () => {
    test('should block localhost URLs', async () => {
      await expect(
<<<<<<< HEAD
        controller.navigatePublic('http://localhost:8080/admin')
      ).rejects.toThrow('SecurityError')
=======
        controller.navigate('http://localhost:8080/admin')
      ).rejects.toThrow(SecurityError)
>>>>>>> origin/main
    })

    test('should block private IP ranges', async () => {
      await expect(
<<<<<<< HEAD
        controller.navigatePublic('http://192.168.1.1/config')
      ).rejects.toThrow('SecurityError')
=======
        controller.navigate('http://192.168.1.1/config')
      ).rejects.toThrow(SecurityError)
>>>>>>> origin/main
    })

    test('should allow whitelisted domains', async () => {
      // Mock successful navigation for allowed domain
<<<<<<< HEAD
      const result = await controller.navigatePublic('https://api.binance.com/v3/ticker')
      expect(result.success).toBe(true)
=======
      await expect(
        controller.navigate('https://api.binance.com/v3/ticker')
      ).resolves.not.toThrow()
>>>>>>> origin/main
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
<<<<<<< HEAD

      await expect(
        positionAgent.executeAction(maliciousAction)
      ).rejects.toThrow('SecurityError')
    })
  })
})
=======
      
      await expect(
        positionAgent.executeAction(maliciousAction)
>>>>>>> origin/main
