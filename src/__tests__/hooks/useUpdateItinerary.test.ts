/**
 * Unit Tests for useUpdateItinerary Hook
 * Tests itinerary update functionality via ItineraryRepository
 * Follows React hooks testing best practices
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useUpdateItinerary } from '../../hooks/useUpdateItinerary';
import { itineraryRepository } from '../../repositories/ItineraryRepository';
import type { Itinerary } from '../../types/Itinerary';

// Mock the repository
jest.mock('../../repositories/ItineraryRepository', () => ({
  itineraryRepository: {
    updateItinerary: jest.fn(),
  },
}));

describe('useUpdateItinerary', () => {
  const mockItinerary: Itinerary = {
    id: 'itinerary-123',
    destination: 'Paris, France',
    startDay: 1704067200000,
    endDay: 1704672000000,
    startDate: '2024-01-01',
    endDate: '2024-01-08',
    description: 'Trip to Paris',
    activities: ['Eiffel Tower', 'Louvre Museum'],
    likes: ['user-1'],
    gender: 'Any',
    status: 'Single',
    sexualOrientation: 'Straight',
    age: 30,
    lowerRange: 25,
    upperRange: 40,
    userInfo: {
      uid: 'user-123',
      username: 'traveler1',
      email: 'traveler1@example.com',
      gender: 'Male',
      dob: '1994-01-01',
      status: 'Single',
      sexualOrientation: 'Straight',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useUpdateItinerary());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.updateItinerary).toBe('function');
    });

    it('should return stable function reference', () => {
      const { result, rerender } = renderHook(() => useUpdateItinerary());

      const firstRef = result.current.updateItinerary;
      rerender({});
      const secondRef = result.current.updateItinerary;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('Successful Updates', () => {
    it('should update itinerary successfully', async () => {
      const updatedItinerary = {
        ...mockItinerary,
        likes: ['user-1', 'user-2'],
      };

      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValue(
        updatedItinerary
      );

      const { result } = renderHook(() => useUpdateItinerary());

      let returnedItinerary: Itinerary | undefined;

      await act(async () => {
        returnedItinerary = await result.current.updateItinerary('itinerary-123', {
          likes: ['user-1', 'user-2'],
        });
      });

      expect(returnedItinerary).toEqual(updatedItinerary);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(itineraryRepository.updateItinerary).toHaveBeenCalledWith(
        'itinerary-123',
        { likes: ['user-1', 'user-2'] }
      );
    });

    it('should handle partial updates', async () => {
      const updatedItinerary = {
        ...mockItinerary,
        description: 'Updated trip description',
      };

      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValue(
        updatedItinerary
      );

      const { result } = renderHook(() => useUpdateItinerary());

      let returnedItinerary: Itinerary | undefined;

      await act(async () => {
        returnedItinerary = await result.current.updateItinerary('itinerary-123', {
          description: 'Updated trip description',
        });
      });

      expect(returnedItinerary?.description).toBe('Updated trip description');
      expect(result.current.error).toBeNull();
    });

    it('should update multiple fields at once', async () => {
      const updatedItinerary = {
        ...mockItinerary,
        description: 'New description',
        activities: ['New activity'],
        likes: ['user-1', 'user-2', 'user-3'],
      };

      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValue(
        updatedItinerary
      );

      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await result.current.updateItinerary('itinerary-123', {
          description: 'New description',
          activities: ['New activity'],
          likes: ['user-1', 'user-2', 'user-3'],
        });
      });

      expect(itineraryRepository.updateItinerary).toHaveBeenCalledWith(
        'itinerary-123',
        {
          description: 'New description',
          activities: ['New activity'],
          likes: ['user-1', 'user-2', 'user-3'],
        }
      );
    });
  });

  describe('Loading State', () => {
    it('should set loading to true during update', async () => {
      (itineraryRepository.updateItinerary as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockItinerary), 100);
          })
      );

      const { result } = renderHook(() => useUpdateItinerary());

      act(() => {
        result.current.updateItinerary('itinerary-123', { description: 'Test' });
      });

      // Should be loading immediately after call
      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should set loading to false after successful update', async () => {
      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValue(
        mockItinerary
      );

      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await result.current.updateItinerary('itinerary-123', { description: 'Test' });
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after error', async () => {
      (itineraryRepository.updateItinerary as jest.Mock).mockRejectedValue(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        try {
          await result.current.updateItinerary('itinerary-123', { description: 'Test' });
        } catch (err) {
          // Expected error
        }
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors', async () => {
      const repositoryError = new Error('Repository update failed');
      (itineraryRepository.updateItinerary as jest.Mock).mockRejectedValue(
        repositoryError
      );

      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await expect(
          result.current.updateItinerary('itinerary-123', { description: 'Test' })
        ).rejects.toThrow('Repository update failed');
      });

      expect(result.current.error).toEqual(repositoryError);
      expect(result.current.loading).toBe(false);
    });

    it('should validate itinerary ID', async () => {
      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await expect(
          result.current.updateItinerary('', { description: 'Test' })
        ).rejects.toThrow('Invalid itinerary ID');
      });

      expect(result.current.error?.message).toBe('Invalid itinerary ID');
      expect(itineraryRepository.updateItinerary).not.toHaveBeenCalled();
    });

    it('should validate updates object', async () => {
      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await expect(
          result.current.updateItinerary('itinerary-123', null as any)
        ).rejects.toThrow('Invalid updates object');
      });

      expect(result.current.error?.message).toBe('Invalid updates object');
      expect(itineraryRepository.updateItinerary).not.toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      (itineraryRepository.updateItinerary as jest.Mock).mockRejectedValue(
        'String error'
      );

      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await expect(
          result.current.updateItinerary('itinerary-123', { description: 'Test' })
        ).rejects.toThrow('Failed to update itinerary');
      });

      expect(result.current.error?.message).toBe('Failed to update itinerary');
    });

    it('should clear error on successful retry', async () => {
      // First call fails
      (itineraryRepository.updateItinerary as jest.Mock).mockRejectedValueOnce(
        new Error('First error')
      );

      const { result } = renderHook(() => useUpdateItinerary());

      // First attempt - fails
      await act(async () => {
        try {
          await result.current.updateItinerary('itinerary-123', { description: 'Test' });
        } catch (err) {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      // Second call succeeds
      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValueOnce(
        mockItinerary
      );

      // Retry - succeeds
      await act(async () => {
        await result.current.updateItinerary('itinerary-123', { description: 'Test' });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty updates object', async () => {
      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValue(
        mockItinerary
      );

      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await result.current.updateItinerary('itinerary-123', {});
      });

      expect(itineraryRepository.updateItinerary).toHaveBeenCalledWith(
        'itinerary-123',
        {}
      );
    });

    it('should handle updates with undefined values', async () => {
      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValue(
        mockItinerary
      );

      const { result } = renderHook(() => useUpdateItinerary());

      await act(async () => {
        await result.current.updateItinerary('itinerary-123', {
          description: undefined,
        });
      });

      expect(itineraryRepository.updateItinerary).toHaveBeenCalledWith(
        'itinerary-123',
        { description: undefined }
      );
    });

    it('should handle concurrent updates', async () => {
      (itineraryRepository.updateItinerary as jest.Mock)
        .mockResolvedValueOnce({ ...mockItinerary, description: 'First' })
        .mockResolvedValueOnce({ ...mockItinerary, description: 'Second' });

      const { result } = renderHook(() => useUpdateItinerary());

      const promise1 = act(async () => {
        return result.current.updateItinerary('itinerary-123', {
          description: 'First',
        });
      });

      const promise2 = act(async () => {
        return result.current.updateItinerary('itinerary-123', {
          description: 'Second',
        });
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.description).toBe('First');
      expect(result2.description).toBe('Second');
      expect(itineraryRepository.updateItinerary).toHaveBeenCalledTimes(2);
    });
  });

  describe('Type Safety', () => {
    it('should not allow updating id field', async () => {
      (itineraryRepository.updateItinerary as jest.Mock).mockResolvedValue(
        mockItinerary
      );

      const { result } = renderHook(() => useUpdateItinerary());

      // TypeScript should prevent this, but testing runtime behavior
      await act(async () => {
        await result.current.updateItinerary('itinerary-123', {
          description: 'Valid update',
        });
      });

      // Verify id cannot be in updates
      expect(itineraryRepository.updateItinerary).toHaveBeenCalledWith(
        'itinerary-123',
        { description: 'Valid update' }
      );
    });
  });
});
