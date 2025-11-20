/**
 * Unit Tests for useTypingIndicator Hook
 * Tests debouncing, immediate true, delayed false, and cleanup
 */

// Mock ChatService
const mockSetTypingStatus = jest.fn();
const mockGetChatService = jest.fn(() => ({
  setTypingStatus: mockSetTypingStatus,
}));

jest.mock('../../../services/chat/ChatService', () => ({
  getChatService: () => mockGetChatService(),
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useTypingIndicator } from '../../../hooks/chat/useTypingIndicator';

describe('useTypingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetTypingStatus.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should return setTyping function', () => {
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      expect(result.current.setTyping).toBeInstanceOf(Function);
    });

    it('should not call service on initialization', () => {
      renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      expect(mockSetTypingStatus).not.toHaveBeenCalled();
    });

    it('should handle null connectionId gracefully', () => {
      const { result } = renderHook(() => useTypingIndicator(null, 'user123'));
      
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).not.toHaveBeenCalled();
    });

    it('should handle null userId gracefully', () => {
      const { result } = renderHook(() => useTypingIndicator('conn123', null));
      
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).not.toHaveBeenCalled();
    });
  });

  describe('immediate typing indicator', () => {
    it('should immediately set typing true when user starts typing', () => {
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', true);
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
    });

    it('should not call service if already typing', () => {
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
      
      // Call again with same value
      act(() => {
        result.current.setTyping(true);
      });
      
      // Should not call again
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('debounced typing indicator', () => {
    it('should debounce typing false for 500ms', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', true);
      
      // Stop typing
      act(() => {
        result.current.setTyping(false);
      });
      
      // Should not be called immediately
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
      
      // Fast-forward 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Wait for promise resolution
      await act(async () => {
        await Promise.resolve();
      });
      
      // Now should be called with false
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', false);
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });

    it('should complete debounce if setTyping(true) called when already true', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', true);
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
      
      // Stop typing (starts debounce timer)
      act(() => {
        result.current.setTyping(false);
      });
      
      // Fast-forward 200ms (less than 500ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      // Call setTyping(true) again - but lastValueRef is still true, so returns early
      // This does NOT clear the debounce timer!
      act(() => {
        result.current.setTyping(true);
      });
      
      // Still only called once (setTyping(true) returned early)
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(1);
      
      // Complete the full 500ms from original setTyping(false)
      act(() => {
        jest.advanceTimersByTime(300);
      });
      
      // Wait for async promise resolution
      await act(async () => {
        await Promise.resolve();
      });
      
      // The debounce timer completed because it wasn't cleared
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', false);
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);
      
      jest.useRealTimers();
    });

    it('should not set false if already false', async () => {
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Set false (never typed)
      act(() => {
        result.current.setTyping(false);
      });
      
      expect(mockSetTypingStatus).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle service errors when setting typing true', () => {
      mockSetTypingStatus.mockRejectedValueOnce(new Error('Service error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      act(() => {
        result.current.setTyping(true);
      });
      
      // Error should be caught and logged
      waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error setting typing status:',
          expect.any(Error)
        );
      });
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle service errors when setting typing false', async () => {
      jest.useFakeTimers();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      mockSetTypingStatus.mockRejectedValueOnce(new Error('Service error'));
      
      // Stop typing
      act(() => {
        result.current.setTyping(false);
      });
      
      // Fast-forward debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Wait for promise rejection
      await act(async () => {
        await Promise.resolve();
      });
      
      // Error should be caught and logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error clearing typing status:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
      jest.useRealTimers();
    });
  });

  describe('cleanup', () => {
    it('should clear typing status on unmount if typing', async () => {
      const { result, unmount } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', true);
      
      // Unmount
      unmount();
      
      // Wait for async cleanup
      await act(async () => {
        await Promise.resolve();
      });
      
      // Should clear typing status
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', false);
    });

    it('should not clear typing status on unmount if not typing', () => {
      const { unmount } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Unmount without ever typing
      unmount();
      
      // Should not call service
      expect(mockSetTypingStatus).not.toHaveBeenCalled();
    });

    it('should clear debounce timer on unmount', () => {
      const { result, unmount } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      // Stop typing (starts debounce)
      act(() => {
        result.current.setTyping(false);
      });
      
      // Unmount before debounce completes
      unmount();
      
      // Fast-forward past debounce time
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      // Should have called:
      // 1. setTyping(true) immediately
      // 2. setTyping(false) on unmount cleanup
      // NOT the debounced false (timer was cleared)
      expect(mockSetTypingStatus).toHaveBeenCalledTimes(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result, unmount } = renderHook(() => useTypingIndicator('conn123', 'user123'));
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      mockSetTypingStatus.mockRejectedValueOnce(new Error('Cleanup error'));
      
      // Unmount
      unmount();
      
      // Wait for async cleanup
      await act(async () => {
        await Promise.resolve();
      });
      
      // Error should be caught and logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error clearing typing on unmount:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('connectionId and userId changes', () => {
    it('should handle connectionId change', async () => {
      const { result, rerender } = renderHook(
        ({ connectionId, userId }) => useTypingIndicator(connectionId, userId),
        { initialProps: { connectionId: 'conn123', userId: 'user123' } }
      );
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', true);
      
      // Change connectionId (should clear old typing status via cleanup effect)
      rerender({ connectionId: 'conn456', userId: 'user123' });
      
      // Wait for cleanup
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', false);
    });

    it('should handle userId change', async () => {
      const { result, rerender } = renderHook(
        ({ connectionId, userId }) => useTypingIndicator(connectionId, userId),
        { initialProps: { connectionId: 'conn123', userId: 'user123' } }
      );
      
      // Start typing
      act(() => {
        result.current.setTyping(true);
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', true);
      
      // Change userId (should clear old typing status via cleanup effect)
      rerender({ connectionId: 'conn123', userId: 'user456' });
      
      // Wait for cleanup
      await act(async () => {
        await Promise.resolve();
      });
      
      expect(mockSetTypingStatus).toHaveBeenCalledWith('conn123', 'user123', false);
    });
  });
});
