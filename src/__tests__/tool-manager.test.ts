import { ToolManager } from '../core/tool-manager'

describe('ToolManager', () => {
  let toolManager: ToolManager

  beforeEach(() => {
    toolManager = new ToolManager()
  })

  describe('executeTool', () => {
    it('should execute browser tool successfully', async () => {
      const result = await toolManager.executeTool('browser', {
        command: 'navigate',
        parameters: { url: 'https://example.com' }
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('toolName', 'browser')
      expect(result).toHaveProperty('latencyMs')
    })

    it('should execute file-system tool', async () => {
      const result = await toolManager.executeTool('file-system', {
        command: 'read',
        parameters: { path: '/test' }
      })

      expect(result.success).toBe(true)
      expect(result.toolName).toBe('file-system')
    })

    it('should execute api-client tool', async () => {
      const result = await toolManager.executeTool('api-client', {
        command: 'get',
        parameters: { url: 'https://api.example.com' }
      })

      expect(result.success).toBe(true)
      expect(result.toolName).toBe('api-client')
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
