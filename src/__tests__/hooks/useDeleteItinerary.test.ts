/**
 * Unit Tests for useDeleteItinerary Hook
 * Tests itinerary deletion via Firebase Functions (RPC-based with singleton)
 * Follows React hooks testing best practices
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useDeleteItinerary } from '../../hooks/useDeleteItinerary';
import * as firebaseFunctions from 'firebase/functions';

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

// Mock firebase config with functions singleton
jest.mock('../../config/firebaseConfig', () => ({
  auth: { currentUser: { uid: 'test-user-123' } },
  db: {},
  app: {},
  functions: {}, // Singleton functions instance
}));

describe('useDeleteItinerary', () => {
  const mockHttpsCallable = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    (firebaseFunctions.httpsCallable as jest.Mock).mockReturnValue(mockHttpsCallable);
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useDeleteItinerary());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.deleteItinerary).toBe('function');
    });

    it('should maintain stable function reference across rerenders', () => {
      const { result, rerender } = renderHook(() => useDeleteItinerary());
      const firstRef = result.current.deleteItinerary;

      rerender({});

      expect(result.current.deleteItinerary).toBe(firstRef);
    });
  });

  describe('Delete Itinerary', () => {
    it('should delete itinerary successfully', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('itinerary-123');
      });

      expect(response).toEqual({ success: true });
      expect(mockHttpsCallable).toHaveBeenCalledWith({ id: 'itinerary-123' });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should call Firebase Function with correct parameters', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteItinerary());

      await act(async () => {
        await result.current.deleteItinerary('test-itinerary-456');
      });

      // Should call httpsCallable with functions singleton and function name
      expect(firebaseFunctions.httpsCallable).toHaveBeenCalledWith({}, 'deleteItinerary');
      expect(mockHttpsCallable).toHaveBeenCalledWith({ id: 'test-itinerary-456' });
    });

    it('should handle Firebase Function errors', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: false, error: 'Itinerary not found' },
      });

      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('non-existent-id');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Itinerary not found');
      expect(result.current.error).toBe('Itinerary not found');
    });

    it('should handle network errors', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Network timeout'));

      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('itinerary-789');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Network timeout');
      expect(result.current.error).toBe('Network timeout');
    });

    it('should handle non-Error exceptions', async () => {
      mockHttpsCallable.mockRejectedValue('String error');

      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('itinerary-999');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to delete itinerary');
      expect(result.current.error).toBe('Failed to delete itinerary');
    });
  });

  describe('Validation', () => {
    it('should reject empty itinerary ID', async () => {
      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('');
      });

      expect(response).toEqual({
        success: false,
        error: 'Itinerary ID is required',
      });
      expect(mockHttpsCallable).not.toHaveBeenCalled();
    });

    it('should reject undefined itinerary ID', async () => {
      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary(undefined as any);
      });

      expect(response).toEqual({
        success: false,
        error: 'Itinerary ID is required',
      });
      expect(mockHttpsCallable).not.toHaveBeenCalled();
    });

    it('should handle unauthenticated user', async () => {
      // Mock no user
      const authModule = require('../../config/firebaseConfig');
      authModule.auth.currentUser = null;

      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('itinerary-123');
      });

      expect(response).toEqual({
        success: false,
        error: 'User not authenticated',
      });
      expect(mockHttpsCallable).not.toHaveBeenCalled();

      // Restore
      authModule.auth.currentUser = { uid: 'test-user-123' };
    });
  });

  describe('Loading State', () => {
    it('should set loading to true during deletion', async () => {
      mockHttpsCallable.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
      );

      const { result } = renderHook(() => useDeleteItinerary());

      act(() => {
        result.current.deleteItinerary('itinerary-123');
      });

      // Should be loading immediately
      expect(result.current.loading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after success', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteItinerary());

      await act(async () => {
        await result.current.deleteItinerary('itinerary-123');
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after error', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteItinerary());

      await act(async () => {
        await result.current.deleteItinerary('itinerary-123');
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error State', () => {
    it('should clear error before new deletion', async () => {
      // First deletion fails
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: false, error: 'First error' },
      });

      const { result } = renderHook(() => useDeleteItinerary());

      await act(async () => {
        await result.current.deleteItinerary('itinerary-1');
      });

      expect(result.current.error).toBe('First error');

      // Second deletion succeeds
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: true },
      });

      await act(async () => {
        await result.current.deleteItinerary('itinerary-2');
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle missing success field in response', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: {}, // No success field
      });

      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('itinerary-123');
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to delete itinerary');
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only itinerary ID', async () => {
      const { result } = renderHook(() => useDeleteItinerary());

      let response;
      await act(async () => {
        response = await result.current.deleteItinerary('   ');
      });

      // Whitespace is truthy, so it passes validation
      // But Firebase should reject it
      mockHttpsCallable.mockResolvedValue({
        data: { success: false, error: 'Invalid ID' },
      });

      await act(async () => {
        response = await result.current.deleteItinerary('   ');
      });

      expect(response.success).toBe(false);
    });

    it('should handle concurrent delete operations', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteItinerary());

      // Start multiple deletes
      let response1, response2;
      await act(async () => {
        [response1, response2] = await Promise.all([
          result.current.deleteItinerary('itinerary-1'),
          result.current.deleteItinerary('itinerary-2'),
        ]);
      });

      expect(response1.success).toBe(true);
      expect(response2.success).toBe(true);
      expect(mockHttpsCallable).toHaveBeenCalledTimes(2);
    });

    it('should handle special characters in itinerary ID', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true },
      });

      const { result } = renderHook(() => useDeleteItinerary());

      const specialId = 'itinerary-123!@#$%^&*()';

      await act(async () => {
        await result.current.deleteItinerary(specialId);
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({ id: specialId });
    });
  });
});
