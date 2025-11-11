/**
 * Unit Tests for useCreateItinerary Hook
 * Tests manual itinerary creation with validation
 * Follows React hooks testing best practices
 */

// use @testing-library/react-hooks for renderHook in hook unit tests
import { useCreateItinerary } from '../../hooks/useCreateItinerary';
import * as firebaseFunctions from 'firebase/functions';
import type { ManualItineraryFormData } from '../../types/ManualItinerary';

import { renderHook, act } from '@testing-library/react-hooks';
import { setMockUser, clearMockUser } from '../../testUtils/mockAuth';
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

// Use centralized manual mock for firebaseConfig
jest.mock('../../config/firebaseConfig');

describe('useCreateItinerary', () => {
  // Helper function to create future dates in YYYY-MM-DD format
  const getFutureDate = (daysFromNow: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  };

  const mockUserProfile = {
    username: 'testuser',
    email: 'test@example.com',
    gender: 'Male',
    dob: '1990-01-01',
    status: 'Single',
    sexualOrientation: 'Straight',
    blocked: [],
  };

  const validFormData: ManualItineraryFormData = {
    destination: 'Paris, France',
    startDate: getFutureDate(30), // 30 days from now
    endDate: getFutureDate(40), // 40 days from now
    description: 'Trip to Paris',
    activities: ['Eiffel Tower', 'Louvre Museum'],
    gender: 'Female',
    status: 'Single',
    sexualOrientation: 'Heterosexual',
    lowerRange: 25,
    upperRange: 40,
  };

  const mockHttpsCallable = jest.fn();

  beforeEach(() => {
    // Reset mocks and their implementations to avoid cross-test leakage
    jest.resetAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
    (firebaseFunctions.httpsCallable as jest.Mock).mockReturnValue(mockHttpsCallable);
    // Ensure mocked auth returns a default authenticated user
    const cfg = require('../../config/firebaseConfig');
    // Always ensure a mocked authenticated user exists for tests.
    setMockUser();
    try {
      if (cfg && cfg.getAuthInstance && typeof (cfg.getAuthInstance as any).mockImplementation === 'function') {
        // Ensure the mock returns the current auth object
        (cfg.getAuthInstance as jest.Mock).mockImplementation(() => (cfg as any).auth || { currentUser: { uid: 'test-user-123' } });
      } else if (cfg) {
        // Fallback: ensure getAuthInstance exists and returns auth
        (cfg as any).getAuthInstance = () => (cfg as any).auth || { currentUser: { uid: 'test-user-123' } };
      }
    } catch (e) {
      // defensive - continue
    }
  });

  describe('Initial State', () => {
    clearMockUser();
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useCreateItinerary());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.createItinerary).toBe('function');
      expect(typeof result.current.validateItinerary).toBe('function');
    });
  });

  describe('Validation', () => {
    it('should validate all required fields', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const invalidData: any = {
        destination: '',
        startDate: '',
        endDate: '',
        description: '',
        activities: [],
        gender: '',
        status: '',
        sexualOrientation: '',
        lowerRange: 18,
        upperRange: 100,
      };

      const errors = result.current.validateItinerary(invalidData, mockUserProfile);

      expect(errors).toContainEqual({ field: 'destination', message: 'Destination is required' });
      expect(errors).toContainEqual({ field: 'startDate', message: 'Start date is required' });
      expect(errors).toContainEqual({ field: 'endDate', message: 'End date is required' });
      expect(errors).toContainEqual({ field: 'gender', message: 'Gender preference is required' });
      expect(errors).toContainEqual({ field: 'status', message: 'Status preference is required' });
      expect(errors).toContainEqual({ field: 'sexualOrientation', message: 'Sexual orientation preference is required' });
    });

    it('should validate user profile completeness', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const incompleteProfile = {
        username: 'testuser',
        // Missing dob and gender
      };

      const errors = result.current.validateItinerary(validFormData, incompleteProfile);

      expect(errors).toContainEqual({
        field: 'profile',
        message: 'Please complete your profile by setting your date of birth and gender before creating an itinerary.',
      });
    });

    it('should validate date is not in the past', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const pastData = {
        ...validFormData,
        startDate: '2020-01-01',
        endDate: '2020-01-10',
      };

      const errors = result.current.validateItinerary(pastData, mockUserProfile);

      expect(errors).toContainEqual({
        field: 'startDate',
        message: 'Start date cannot be in the past',
      });
    });

    it('should validate end date after start date', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const invalidDateData = {
        ...validFormData,
        startDate: getFutureDate(40),
        endDate: getFutureDate(30), // End before start
      };

      const errors = result.current.validateItinerary(invalidDateData, mockUserProfile);

      expect(errors).toContainEqual({
        field: 'endDate',
        message: 'End date must be after start date',
      });
    });

    it('should validate age range minimum', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const invalidAgeData = {
        ...validFormData,
        lowerRange: 16,
      };

      const errors = result.current.validateItinerary(invalidAgeData, mockUserProfile);

      expect(errors).toContainEqual({
        field: 'lowerRange',
        message: 'Minimum age must be at least 18',
      });
    });

    it('should validate age range maximum', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const invalidAgeData = {
        ...validFormData,
        upperRange: 105,
      };

      const errors = result.current.validateItinerary(invalidAgeData, mockUserProfile);

      expect(errors).toContainEqual({
        field: 'upperRange',
        message: 'Maximum age cannot exceed 100',
      });
    });

    it('should validate lower range less than upper range', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const invalidRangeData = {
        ...validFormData,
        lowerRange: 50,
        upperRange: 30,
      };

      const errors = result.current.validateItinerary(invalidRangeData, mockUserProfile);

      expect(errors).toContainEqual({
        field: 'ageRange',
        message: 'Minimum age must be less than maximum age',
      });
    });

    it('should return empty errors for valid data', () => {
      const { result } = renderHook(() => useCreateItinerary());

      const errors = result.current.validateItinerary(validFormData, mockUserProfile);

      expect(errors).toEqual([]);
    });
  });

  describe('Create Itinerary', () => {
    it('should create itinerary successfully', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: {
          success: true,
          data: {
            id: 'new-itinerary-123',
            ...validFormData,
          },
        },
      });

      const { result } = renderHook(() => useCreateItinerary());

      let response;
      await act(async () => {
        response = await result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(response.success).toBe(true);
      expect(response.data?.id).toBe('new-itinerary-123');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle Firebase Function errors', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Firebase error'));

      const { result } = renderHook(() => useCreateItinerary());

      let response;
      await act(async () => {
        response = await result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Firebase error');
      expect(result.current.error).toBe('Firebase error');
    });

    it('should handle validation errors', async () => {
      const { result } = renderHook(() => useCreateItinerary());

      const invalidData = {
        ...validFormData,
        destination: '',
      };

      let response;
      await act(async () => {
        response = await result.current.createItinerary(invalidData, mockUserProfile);
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Destination is required');
      expect(response.validationErrors).toBeDefined();
      expect(mockHttpsCallable).not.toHaveBeenCalled();
    });

    it('should handle unauthenticated user', async () => {
      // Use the test helper to clear the mock user so the module remains
      // consistent (clears auth.currentUser and makes getAuthInstance return it)
      clearMockUser();

      const { result } = renderHook(() => useCreateItinerary());

      let response;
      await act(async () => {
        response = await result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('User not authenticated');

      // Restore authenticated state for subsequent tests
      setMockUser();
    });

    it('should call Firebase Function with correct payload', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, data: { id: 'test-id' } },
      });

      const { result } = renderHook(() => useCreateItinerary());

      await act(async () => {
        await result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        itinerary: expect.objectContaining({
          userId: 'test-user-123',
          destination: 'Paris, France',
          startDate: expect.any(String), // Dynamic date
          endDate: expect.any(String), // Dynamic date
          startDay: expect.any(Number), // Timestamp
          endDay: expect.any(Number), // Timestamp
          description: 'Trip to Paris',
          activities: ['Eiffel Tower', 'Louvre Museum'],
          gender: 'Female',
          status: 'Single',
          sexualOrientation: 'Heterosexual',
          lowerRange: 25,
          upperRange: 40,
          likes: [],
          userInfo: expect.objectContaining({
            uid: 'test-user-123',
            username: 'testuser',
            gender: 'Male',
            dob: '1990-01-01',
            email: 'test@example.com',
            status: 'Single',
            sexualOrientation: 'Straight',
          }),
        }),
      });
    });

    it('should trim destination and description', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, data: { id: 'test-id' } },
      });

      const { result } = renderHook(() => useCreateItinerary());

      const dataWithWhitespace = {
        ...validFormData,
        destination: '  Paris, France  ',
        description: '  Trip description  ',
      };

      await act(async () => {
        await result.current.createItinerary(dataWithWhitespace, mockUserProfile);
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        itinerary: expect.objectContaining({
          destination: 'Paris, France',
          description: 'Trip description',
        }),
      });
    });

    it('should filter empty activities', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, data: { id: 'test-id' } },
      });

      const { result } = renderHook(() => useCreateItinerary());

      const dataWithEmptyActivities = {
        ...validFormData,
        activities: ['Activity 1', '', '  ', 'Activity 2'],
      };

      await act(async () => {
        await result.current.createItinerary(dataWithEmptyActivities, mockUserProfile);
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        itinerary: expect.objectContaining({
          activities: ['Activity 1', 'Activity 2'],
        }),
      });
    });

    it('should handle editing existing itinerary', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, data: { id: 'existing-id' } },
      });

      const { result } = renderHook(() => useCreateItinerary());

      await act(async () => {
        await result.current.createItinerary(
          validFormData,
          mockUserProfile,
          'existing-id'
        );
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        itinerary: expect.objectContaining({
          id: 'existing-id',
        }),
      });

      // When editing, likes should be undefined (not overwritten)
      const payload = mockHttpsCallable.mock.calls[0][0].itinerary;
      expect(payload.likes).toBeUndefined();
    });

    it('should convert dates to timestamps', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, data: { id: 'test-id' } },
      });

      const { result } = renderHook(() => useCreateItinerary());

      await act(async () => {
        await result.current.createItinerary(validFormData, mockUserProfile);
      });

      const payload = mockHttpsCallable.mock.calls[0][0].itinerary;
      expect(payload.startDay).toBeGreaterThan(0);
      expect(payload.endDay).toBeGreaterThan(payload.startDay);
    });

    it('should handle Firebase function returning error', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: {
          success: false,
          error: 'Database error',
        },
      });

      const { result } = renderHook(() => useCreateItinerary());

      let response;
      await act(async () => {
        response = await result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Database error');
    });

    it('should handle missing userInfo fields gracefully', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, data: { id: 'test-id' } },
      });

      const { result } = renderHook(() => useCreateItinerary());

      const partialProfile = {
        username: 'testuser',
        gender: 'Male',
        dob: '1990-01-01',
        // Missing email, status, sexualOrientation
      };

      await act(async () => {
        await result.current.createItinerary(validFormData, partialProfile as any);
      });

      const payload = mockHttpsCallable.mock.calls[0][0].itinerary;
      expect(payload.userInfo.email).toBe('');
      expect(payload.userInfo.status).toBe('single');
      expect(payload.userInfo.sexualOrientation).toBe('not specified');
    });
  });

  describe('Loading State', () => {
    it('should set loading during creation', async () => {
      mockHttpsCallable.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: { success: true, data: { id: 'test' } } }), 100);
          })
      );

      const { result } = renderHook(() => useCreateItinerary());

      act(() => {
        result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(result.current.loading).toBe(false);
    });

    it('should set loading to false after error', async () => {
      mockHttpsCallable.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useCreateItinerary());

      await act(async () => {
        await result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty description', async () => {
      mockHttpsCallable.mockResolvedValue({
        data: { success: true, data: { id: 'test-id' } },
      });

      const { result } = renderHook(() => useCreateItinerary());

      const dataWithoutDescription = {
        ...validFormData,
        description: '',
      };

      await act(async () => {
        await result.current.createItinerary(dataWithoutDescription, mockUserProfile);
      });

      expect(mockHttpsCallable).toHaveBeenCalledWith({
        itinerary: expect.objectContaining({
          description: '',
        }),
      });
    });

    it('should handle non-Error exceptions', async () => {
      mockHttpsCallable.mockRejectedValue('String error');

      const { result } = renderHook(() => useCreateItinerary());

      let response;
      await act(async () => {
        response = await result.current.createItinerary(validFormData, mockUserProfile);
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Failed to create itinerary');
    });
  });
});
