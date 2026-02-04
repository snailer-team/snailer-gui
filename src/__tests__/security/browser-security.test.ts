<<<<<<< HEAD
import { SecurityGuard } from '../../utils/security-guard'
import { PositionAgent } from '../../agents/position-agent'

describe('Security Integration', () => {
  let securityGuard: SecurityGuard
  let positionAgent: PositionAgent

  beforeEach(() => {
    securityGuard = new SecurityGuard()
    positionAgent = new PositionAgent()
  })

  describe('SecurityGuard - URL Validation', () => {
    it('should block file protocol', async () => {
      const result = await securityGuard.validateUrl('file:///etc/passwd')

      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('Blocked protocol')
    })

    it('should allow https URLs', async () => {
      const result = await securityGuard.validateUrl('https://example.com')

      expect(result.isValid).toBe(true)
    })

    it('should reject invalid URLs', async () => {
      const result = await securityGuard.validateUrl('not-a-valid-url')

      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('Invalid URL format')
    })
  })

  describe('SecurityGuard - Risk Level Validation', () => {
    it('should validate low risk level', async () => {
      const result = await securityGuard.validateRiskLevel('low', 500)

      expect(result).toBe(true)
    })

    it('should reject size exceeding low risk limit', async () => {
      const result = await securityGuard.validateRiskLevel('low', 2000)

      expect(result).toBe(false)
    })

    it('should validate medium risk level', async () => {
      const result = await securityGuard.validateRiskLevel('medium', 5000)

      expect(result).toBe(true)
    })

    it('should reject invalid risk level', async () => {
      const result = await securityGuard.validateRiskLevel('invalid', 100)

      expect(result).toBe(false)
    })
  })

  describe('SecurityGuard - Symbol Validation', () => {
    it('should validate valid symbols', async () => {
      expect(await securityGuard.validateSymbol('BTC')).toBe(true)
      expect(await securityGuard.validateSymbol('ETH')).toBe(true)
      expect(await securityGuard.validateSymbol('USDT')).toBe(true)
    })

    it('should reject invalid symbols', async () => {
      expect(await securityGuard.validateSymbol('A')).toBe(false)
      expect(await securityGuard.validateSymbol('VERYLONGSYMBOLNAME')).toBe(false)
    })
  })

  describe('SecurityGuard - Position Size Validation', () => {
    it('should validate reasonable position sizes', async () => {
      const result = await securityGuard.validatePositionSize(1000, 'BTC')

      expect(result).toBe(true)
    })

    it('should reject negative position sizes', async () => {
      const result = await securityGuard.validatePositionSize(-100, 'BTC')

      expect(result).toBe(false)
    })

    it('should reject zero position size', async () => {
      const result = await securityGuard.validatePositionSize(0, 'BTC')

      expect(result).toBe(false)
    })

    it('should reject excessively large position sizes', async () => {
      const result = await securityGuard.validatePositionSize(2000000, 'BTC')

      expect(result).toBe(false)
    })
  })

  describe('SecurityGuard - Input Sanitization', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>'
      const sanitized = securityGuard.sanitizeInput(input)

      expect(sanitized).not.toContain('<')
      expect(sanitized).not.toContain('>')
      expect(sanitized).not.toContain('"')
    })

    it('should preserve safe characters', () => {
      const input = 'Hello World 123'
      const sanitized = securityGuard.sanitizeInput(input)

      expect(sanitized).toBe('Hello World 123')
    })
  })

  describe('PositionAgent', () => {
    it('should execute valid position', async () => {
      const result = await positionAgent.executePosition({
        symbol: 'BTC',
        size: 100,
        side: 'long',
        riskLevel: 'low'
      })

      expect(result.success).toBe(true)
      expect(result.positionId).toBeDefined()
      expect(result.securityChecks).toBeInstanceOf(Array)
    })

    it('should reject position with invalid risk level', async () => {
      const result = await positionAgent.executePosition({
        symbol: 'BTC',
        size: 5000,
        side: 'long',
        riskLevel: 'low'
      })

      expect(result.success).toBe(false)
      expect(result.securityChecks.some((c: { passed: boolean }) => !c.passed)).toBe(true)
    })
  })
})
=======
import { BrowserController } from '../../core/browser-controller'
import { PositionAgent } from '../../agents/position-agent'
import { SecurityError } from '../../types/errors'

describe('Browser Security Integration', () => {
  let controller: BrowserController
  let positionAgent: PositionAgent

  beforeEach(() => {
    controller = new BrowserController()
    positionAgent = new PositionAgent()
  })

  describe('SSRF Protection', () => {
    test('should block localhost URLs', async () => {
      await expect(
        controller.navigate('http://localhost:8080/admin')
      ).rejects.toThrow(SecurityError)
    })

    test('should block private IP ranges', async () => {
      await expect(
        controller.navigate('http://192.168.1.1/config')
      ).rejects.toThrow(SecurityError)
    })

    test('should allow whitelisted domains', async () => {
      // Mock successful navigation for allowed domain
      await expect(
        controller.navigate('https://api.binance.com/v3/ticker')
      ).resolves.not.toThrow()
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
>>>>>>> origin/main
