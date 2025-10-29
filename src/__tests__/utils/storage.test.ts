/**
 * Tests for storage utility
 * Cross-platform storage that uses localStorage on web and AsyncStorage on mobile
 * 
 * Note: Due to module caching and Platform.OS being set at import time,
 * we test the actual behavior rather than trying to test platform switching
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import storage from '../../utils/storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
}));

describe('storage utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('should retrieve item successfully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-value');

      const result = await storage.getItem('TEST_KEY');

      expect(result).toBe('test-value');
    });

    it('should return null when item does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await storage.getItem('NONEXISTENT_KEY');

      expect(result).toBeNull();
    });

    it('should handle getItem errors', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(storage.getItem('ERROR_KEY')).rejects.toThrow('Storage error');
    });

    it('should handle getting empty string', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('');

      const result = await storage.getItem('EMPTY_KEY');

      expect(result).toBe('');
    });

    it('should handle getting JSON string', async () => {
      const jsonData = JSON.stringify({ user: 'test', id: 123 });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(jsonData);

      const result = await storage.getItem('JSON_KEY');

      expect(result).toBe(jsonData);
    });
  });

  describe('setItem', () => {
    it('should set item successfully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setItem('TEST_KEY', 'test-value');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('TEST_KEY', 'test-value');
    });

    it('should handle setting empty string', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setItem('EMPTY_KEY', '');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('EMPTY_KEY', '');
    });

    it('should handle setting JSON string', async () => {
      const jsonData = JSON.stringify({ user: 'test', id: 123 });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setItem('JSON_KEY', jsonData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('JSON_KEY', jsonData);
    });

    it('should handle setItem errors', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

      await expect(storage.setItem('ERROR_KEY', 'value')).rejects.toThrow('Write error');
    });

    it('should handle setting very long strings', async () => {
      const longString = 'a'.repeat(10000);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setItem('LONG_KEY', longString);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('LONG_KEY', longString);
    });

    it('should handle setting strings with special characters', async () => {
      const specialString = 'test-!@#$%^&*()-✓✗';
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setItem('SPECIAL_KEY', specialString);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('SPECIAL_KEY', specialString);
    });
  });

  describe('removeItem', () => {
    it('should remove item successfully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await storage.removeItem('TEST_KEY');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('TEST_KEY');
    });

    it('should handle removing nonexistent key', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await storage.removeItem('NONEXISTENT_KEY');

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('NONEXISTENT_KEY');
    });

    it('should handle removeItem errors', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Remove error'));

      await expect(storage.removeItem('ERROR_KEY')).rejects.toThrow('Remove error');
    });

    it('should handle removing multiple items sequentially', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await storage.removeItem('KEY1');
      await storage.removeItem('KEY2');
      await storage.removeItem('KEY3');

      expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('clear', () => {
    it('should clear storage successfully', async () => {
      (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);

      await storage.clear();

      expect(AsyncStorage.clear).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      (AsyncStorage.clear as jest.Mock).mockRejectedValue(new Error('Clear error'));

      await expect(storage.clear()).rejects.toThrow('Clear error');
    });

    it('should handle clearing empty storage', async () => {
      (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);

      await storage.clear();

      expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration scenarios', () => {
    it('should support get-set-remove cycle', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-value');
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      // Set
      await storage.setItem('TEST_KEY', 'test-value');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('TEST_KEY', 'test-value');

      // Get
      const retrieved = await storage.getItem('TEST_KEY');
      expect(retrieved).toBe('test-value');

      // Remove
      await storage.removeItem('TEST_KEY');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('TEST_KEY');
    });

    it('should support multiple operations', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await storage.setItem('KEY1', 'value1');
      await storage.setItem('KEY2', 'value2');
      await storage.getItem('KEY1');
      await storage.getItem('KEY2');

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
      expect(AsyncStorage.getItem).toHaveBeenCalledTimes(2);
    });

    it('should handle overwriting existing values', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await storage.setItem('KEY', 'value1');
      await storage.setItem('KEY', 'value2');

      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
      expect(AsyncStorage.setItem).toHaveBeenLastCalledWith('KEY', 'value2');
    });
  });
});

