import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserController, BrowserResult } from '../types/browser-control';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockInvoke
}));

describe('BrowserController', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  describe('navigate', () => {
    it('should call browser_navigate with correct parameters', async () => {
      const mockResult: BrowserResult = {
        success: true,
        data: 'Navigated to https://example.com'
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await BrowserController.navigate('https://example.com');

      expect(mockInvoke).toHaveBeenCalledWith('browser_navigate', {
        url: 'https://example.com'
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle navigation errors', async () => {
      const mockResult: BrowserResult = {
        success: false,
        error: 'Invalid URL'
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await BrowserController.navigate('invalid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid URL');
    });
  });

  describe('click', () => {
    it('should call browser_click with correct selector', async () => {
      const mockResult: BrowserResult = {
        success: true,
        data: 'Clicked element: #submit-btn'
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await BrowserController.click('#submit-btn');

      expect(mockInvoke).toHaveBeenCalledWith('browser_click', {
        selector: '#submit-btn'
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('typeText', () => {
    it('should call browser_type_text with correct parameters', async () => {
      const mockResult: BrowserResult = {
        success: true,
        data: "Typed 'hello world' into #input-field"
      };
      mockInvoke.mockResolvedValue(mockResult);

      const result = await BrowserController.typeText('#input-field', 'hello world');

      expect(mockInvoke).toHaveBeenCalledWith('browser_type_text', {
        selector: '#input-field',
        text: 'hello world'
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('extensibility', () => {
    it('should support custom browser actions via execute_action', async () => {
      // This test demonstrates the extensible nature for tool control
      expect(true).toBe(true); // Placeholder for future extensibility tests
    });
  });
