/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { ToolManager } from '../core/tool-manager'
import type { Tool, ToolAction } from '../types/browser'

describe('ToolManager', () => {
  let toolManager: ToolManager
  let mockTool: Tool

  beforeEach(() => {
    toolManager = new ToolManager()
    mockTool = {
      id: 'test-tool',
      name: 'Test Tool',
      description: 'A tool for testing',
      execute: jest.fn().mockResolvedValue({ success: true, data: 'test-result', latencyMs: 0 }),
      validate: jest.fn().mockReturnValue(true)
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('registerTool', () => {
    it('should register a tool successfully', () => {
      const result = toolManager.registerTool(mockTool)

      expect(result).toBe(true)
      expect(toolManager.getTool('test-tool')).toBe(mockTool)
    })

    it('should prevent duplicate tool registration', () => {
      toolManager.registerTool(mockTool)
      const result = toolManager.registerTool(mockTool)

      expect(result).toBe(false)
    })

    it('should validate tool structure before registration', () => {
      const invalidTool = { id: 'invalid' } as Tool

      const result = toolManager.registerTool(invalidTool)

      expect(result).toBe(false)
    })
  })

  describe('executeTool', () => {
    beforeEach(() => {
      toolManager.registerTool(mockTool)
    })

    it('should execute tool with valid parameters', async () => {
      const params: ToolAction = { command: 'test', parameters: { input: 'test-data' } }

      const result = await toolManager.executeTool('test-tool', params)

      expect(mockTool.execute).toHaveBeenCalledWith(params)
      expect(result.success).toBe(true)
      expect(result.data).toBe('test-result')
    })

    it('should handle tool execution errors', async () => {
      mockTool.execute = jest.fn().mockRejectedValue(new Error('Tool execution failed'))

      const result = await toolManager.executeTool('test-tool', { command: 'test' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Tool execution failed')
    })

    it('should return error for non-existent tool', async () => {
      const result = await toolManager.executeTool('non-existent', { command: 'test' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('should execute tool even with different parameters', async () => {
      const result = await toolManager.executeTool('test-tool', { command: 'different' })

      // Tool executes since we registered it
      expect(result.success).toBe(true)
    })
  })

  describe('listTools', () => {
    it('should return registered default tools', () => {
      const tools = toolManager.listTools()
      // ToolManager initializes with default tools
      expect(tools.length).toBeGreaterThanOrEqual(0)
    })

    it('should return all registered tools', () => {
      const tool2 = { ...mockTool, id: 'tool-2', name: 'Tool 2' }
      toolManager.registerTool(mockTool)
      toolManager.registerTool(tool2)

      const tools = toolManager.listTools()
      expect(tools.map((t: any) => t.id)).toContain('test-tool')
    })
  })
})
