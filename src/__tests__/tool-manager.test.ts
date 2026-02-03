/* eslint-disable @typescript-eslint/no-unused-vars */
import { ToolManager } from '../core/tool-manager'
import { Tool, ToolResult } from '../types/browser'

describe('ToolManager', () => {
  let toolManager: ToolManager
  let mockTool: Tool

  beforeEach(() => {
    toolManager = new ToolManager()
    mockTool = {
      id: 'test-tool',
      name: 'Test Tool',
      description: 'A tool for testing',
      execute: jest.fn().mockResolvedValue({ success: true, data: 'test-result' }),
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
      const params = { input: 'test-data' }
      
      const result = await toolManager.executeTool('test-tool', params)
      
      expect(mockTool.execute).toHaveBeenCalledWith(params)
      expect(result.success).toBe(true)
      expect(result.data).toBe('test-result')
    })

    it('should handle tool execution errors', async () => {
      mockTool.execute = jest.fn().mockRejectedValue(new Error('Tool execution failed'))
      
      const result = await toolManager.executeTool('test-tool', {})
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Tool execution failed')
    })

    it('should return error for non-existent tool', async () => {
      const result = await toolManager.executeTool('non-existent', {})
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Tool not found')
    })

    it('should validate parameters before execution', async () => {
      mockTool.validate = jest.fn().mockReturnValue(false)
      
      const result = await toolManager.executeTool('test-tool', { invalid: 'params' })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid parameters')
      expect(mockTool.execute).not.toHaveBeenCalled()
    })
  })

  describe('listTools', () => {
    it('should return empty array when no tools registered', () => {
      const tools = toolManager.listTools()
      expect(tools).toEqual([])
    })

    it('should return all registered tools', () => {
      const tool2 = { ...mockTool, id: 'tool-2', name: 'Tool 2' }
      toolManager.registerTool(mockTool)
      toolManager.registerTool(tool2)
      
      const tools = toolManager.listTools()
      expect(tools).toHaveLength(2)
      expect(tools.map(t => t.id)).toContain('test-tool')
    })
  })
})
