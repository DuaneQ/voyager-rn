/**
 * Unit Tests for ItineraryRepository
 * Tests Firebase Cloud Functions integration for itinerary operations
 * Uses global handler pattern per develop_unit_tests_prompt.md
 */

// Mock Firebase Functions BEFORE imports
jest.mock('firebase/functions');

import { itineraryRepository } from '../../repositories/ItineraryRepository';
import { Itinerary } from '../../types/Itinerary';
import { httpsCallable } from 'firebase/functions';

// Setup global mock handlers before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Clear any previous global handlers
  Object.keys(global).forEach(key => {
    if (key.startsWith('__mock_httpsCallable_')) {
      delete (global as any)[key];
    }
  });
});

describe('ItineraryRepository', () => {
  const mockItinerary: Itinerary = {
    id: 'test-itinerary-1',
    destination: 'Paris, France',
    startDay: 1704067200000, // 2024-01-01
    endDay: 1704672000000, // 2024-01-08
    startDate: '2024-01-01',
    endDate: '2024-01-08',
    description: 'A wonderful trip to Paris',
    activities: ['Eiffel Tower', 'Louvre Museum'],
    likes: ['user1', 'user2'],
    gender: 'Any',
    status: 'Single',
    sexualOrientation: 'Straight',
    age: 30,
    lowerRange: 25,
    upperRange: 40,
    userInfo: {
      uid: 'test-user-123',
      username: 'traveler1',
      email: 'traveler1@example.com',
      gender: 'Male',
      dob: '1994-01-01',
      status: 'Single',
      sexualOrientation: 'Straight',
    },
  };

  describe('searchItineraries', () => {
    it('should search itineraries successfully', async () => {
      // Setup mock handler for searchItineraries function
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const searchParams: any = {
        destination: 'Paris',
        currentUserId: 'test-user-123',
        gender: 'Male',
        lowerRange: 25,
        upperRange: 40,
      };

      const result = await itineraryRepository.searchItineraries(searchParams as any);

      // Repository returns Itinerary[] directly
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0].destination).toBe('Paris, France');
      expect(mockCallable).toHaveBeenCalledWith(searchParams);
    });

    it('should handle search errors', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('Network error'));
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const searchParams: any = {
        destination: 'Paris',
        currentUserId: 'test-user-123',
      };

      await expect(itineraryRepository.searchItineraries(searchParams)).rejects.toThrow('Network error');
    });

    it('should handle error responses from function', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Search failed',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const searchParams: any = {
        destination: 'Paris',
        currentUserId: 'test-user-123',
      };

      await expect(itineraryRepository.searchItineraries(searchParams)).rejects.toThrow('Search failed');
    });

    it('should handle excluded IDs and blocked users', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [mockItinerary],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const searchParams: any = {
        destination: 'Paris',
        currentUserId: 'test-user-123',
        excludedIds: ['itinerary-1', 'itinerary-2'],
        blockedUserIds: ['blocked-user-1'],
        pageSize: 20,
      };

      const result = await itineraryRepository.searchItineraries(searchParams);

      expect(result).toHaveLength(1);
      expect(mockCallable).toHaveBeenCalledWith(searchParams);
    });
  });

  describe('updateItinerary', () => {
    it('should update itinerary likes successfully', async () => {
      const updatedItinerary = { ...mockItinerary, likes: ['user1', 'user2', 'user3'] };
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: updatedItinerary,
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const updates = { likes: ['user1', 'user2', 'user3'] };
      const result = await itineraryRepository.updateItinerary('test-itinerary-1', updates);

      // Repository returns Itinerary directly
      expect(result.id).toBe('test-itinerary-1');
      expect(result.likes).toHaveLength(3);
      expect(result.likes).toContain('user3');
      expect(mockCallable).toHaveBeenCalledWith({
        itineraryId: 'test-itinerary-1',
        updates,
      });
    });

    it('should handle update errors', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('Update failed'));
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const updates = { likes: ['user1'] };
      await expect(itineraryRepository.updateItinerary('test-itinerary-1', updates)).rejects.toThrow(
        'Update failed'
      );
    });

    it('should validate itinerary ID', async () => {
      const updates = { likes: ['user1'] };
      
      await expect(itineraryRepository.updateItinerary('', updates)).rejects.toThrow('Invalid itinerary ID');
      await expect(itineraryRepository.updateItinerary(null as any, updates)).rejects.toThrow(
        'Invalid itinerary ID'
      );
    });

    it('should handle error responses from function', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Itinerary not found',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const updates = { likes: ['user1'] };
      await expect(itineraryRepository.updateItinerary('non-existent-id', updates)).rejects.toThrow(
        'Itinerary not found'
      );
    });
  });

  describe('listUserItineraries', () => {
    it('should list user itineraries successfully', async () => {
      const userItineraries = [mockItinerary, { ...mockItinerary, id: 'test-itinerary-2' }];
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: userItineraries,
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const result = await itineraryRepository.listUserItineraries('test-user-123');

      // Repository returns Itinerary[] directly
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('test-itinerary-1');
      expect(result[1].id).toBe('test-itinerary-2');
      expect(mockCallable).toHaveBeenCalledWith({ userId: 'test-user-123' });
    });

    it('should return empty array for user with no itineraries', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: [],
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const result = await itineraryRepository.listUserItineraries('new-user');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should validate user ID', async () => {
      await expect(itineraryRepository.listUserItineraries('')).rejects.toThrow('Invalid user ID');
      await expect(itineraryRepository.listUserItineraries(null as any)).rejects.toThrow('Invalid user ID');
    });

    it('should handle error responses from function', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'User not found',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await expect(itineraryRepository.listUserItineraries('invalid-user')).rejects.toThrow('User not found');
    });

    it('should handle network errors', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('Network timeout'));
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await expect(itineraryRepository.listUserItineraries('test-user-123')).rejects.toThrow('Network timeout');
    });
  });

  describe('createItinerary', () => {
    it('should create itinerary successfully', async () => {
      const newItinerary: Partial<Itinerary> = {
        destination: 'Tokyo, Japan',
        startDay: 1704067200000,
        endDay: 1704672000000,
        startDate: '2024-01-01',
        endDate: '2024-01-08',
        description: 'Amazing trip to Tokyo',
        activities: ['Shibuya Crossing', 'Tokyo Tower'],
        userInfo: {
          uid: 'test-user-123',
          username: 'traveler1',
          email: 'traveler1@example.com',
          gender: 'Male',
          dob: '1994-01-01',
          status: 'Single',
          sexualOrientation: 'Straight',
        },
      };

      const createdItinerary = { ...mockItinerary, ...newItinerary, id: 'generated-id-123' };
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: true,
          data: createdItinerary,
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const result = await itineraryRepository.createItinerary(newItinerary);

      expect(result.id).toBe('generated-id-123');
      expect(result.destination).toBe('Tokyo, Japan');
      expect(result.activities).toHaveLength(2);
      expect(mockCallable).toHaveBeenCalledWith({ itinerary: newItinerary });
    });

    it('should handle creation errors', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('Creation failed'));
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const newItinerary = { destination: 'Paris', startDay: 1704067200000 };
      await expect(itineraryRepository.createItinerary(newItinerary)).rejects.toThrow('Creation failed');
    });

    it('should handle error responses from function', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Invalid itinerary data',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      const newItinerary = { destination: '' }; // Invalid
      await expect(itineraryRepository.createItinerary(newItinerary)).rejects.toThrow('Invalid itinerary data');
    });
  });

  describe('deleteItinerary', () => {
    it('should delete itinerary successfully', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: true,
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await itineraryRepository.deleteItinerary('test-itinerary-1');

      expect(mockCallable).toHaveBeenCalledWith({ itineraryId: 'test-itinerary-1' });
    });

    it('should validate itinerary ID', async () => {
      await expect(itineraryRepository.deleteItinerary('')).rejects.toThrow('Invalid itinerary ID');
      await expect(itineraryRepository.deleteItinerary(null as any)).rejects.toThrow('Invalid itinerary ID');
    });

    it('should handle deletion errors', async () => {
      const mockCallable = jest.fn().mockRejectedValue(new Error('Deletion failed'));
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await expect(itineraryRepository.deleteItinerary('test-itinerary-1')).rejects.toThrow('Deletion failed');
    });

    it('should handle error responses from function', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Itinerary not found',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await expect(itineraryRepository.deleteItinerary('non-existent-id')).rejects.toThrow('Itinerary not found');
    });

    it('should handle permission errors', async () => {
      const mockCallable = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Permission denied',
        },
      });
      (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

      await expect(itineraryRepository.deleteItinerary('other-users-itinerary')).rejects.toThrow(
        'Permission denied'
      );
    });
  });
});
