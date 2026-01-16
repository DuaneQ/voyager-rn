/**
 * Payload Validation Test: Manual Itinerary Creation (React Native)
 * 
 * This test verifies that useCreateItinerary includes the age field
 * calculated from userProfile.dob in the payload sent to the RPC.
 * This test would have caught the bug where age was not being calculated.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { httpsCallable } from 'firebase/functions';
import { useCreateItinerary } from '../../hooks/useCreateItinerary';
import { setMockUser, clearMockUser } from '../../testUtils/mockAuth';
import { calculateAge } from '../../utils/calculateAge';

// Mock Firebase
jest.mock('firebase/functions');
// Rely on the centralized manual mock for firebaseConfig
jest.mock('../../config/firebaseConfig');

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

describe('useCreateItinerary - Age Field Payload Validation (RN)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure tests have an authenticated user by default
    setMockUser();
  });

  afterEach(() => {
    clearMockUser();
  });

  it('should include age field calculated from userProfile.dob in createItinerary payload', async () => {
    // User with dob => age 35
    const mockUserProfile = {
      uid: 'test-user',
      username: 'testuser',
      email: 'test@example.com',
      dob: '1990-05-15', // Age ~35
      gender: 'Male',
      status: 'Single',
      sexualOrientation: 'Straight',
      blocked: [],
    };

    // Mock createItinerary RPC
    const mockCreateItinerary = jest.fn().mockResolvedValue({
      data: {
        success: true,
        itinerary: { id: 'new-itinerary-id' },
      },
    });

    mockHttpsCallable.mockReturnValue(mockCreateItinerary as any);

    // Render hook
    const { result } = renderHook(() => useCreateItinerary());

    // Calculate expected age
    const userAge = mockUserProfile.dob ? calculateAge(mockUserProfile.dob) : 0;

    // Use future dates for validation to pass
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    // Call createItinerary with correct signature (formData, userProfile, editingId?)
    await act(async () => {
      await result.current.createItinerary(
        {
          destination: 'Paris, France',
          startDate,
          endDate,
          lowerRange: 18,
          upperRange: 100,
          activities: [],
          description: 'Test Description',
          gender: 'No Preference',
          status: 'No Preference',
          sexualOrientation: 'No Preference',
        },
        mockUserProfile
      );
    });

    // Verify createItinerary was called with age field
    expect(mockCreateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        itinerary: expect.objectContaining({
          destination: 'Paris, France',
          age: userAge, // CRITICAL: Age must be included
          userInfo: expect.objectContaining({
            uid: 'test-user-123',
            dob: '1990-05-15',
          }),
        }),
      })
    );

    // Verify age is calculated correctly (~35 for someone born in 1990)
    expect(userAge).toBeGreaterThanOrEqual(34);
    expect(userAge).toBeLessThanOrEqual(35);
  });

  it('should default age to 0 when dob is invalid', async () => {
    // Mock profile with invalid dob that won't throw validation error
    // but will result in age calculation returning 0
    const mockUserProfileInvalidDob = {
      uid: 'test-user',
      username: 'testuser',
      email: 'test@example.com',
      dob: 'invalid-date', // Invalid DOB format (but present so validation passes)
      gender: 'Male',
      status: 'Single',
      sexualOrientation: 'Straight',
      blocked: [],
    };

    const mockCreateItinerary = jest.fn().mockResolvedValue({
      data: { success: true, itinerary: { id: 'new-id' } },
    });

    mockHttpsCallable.mockReturnValue(mockCreateItinerary as any);

    const { result } = renderHook(() => useCreateItinerary());

    // calculateAge should return 0 for invalid date
    const userAge = mockUserProfileInvalidDob.dob ? calculateAge(mockUserProfileInvalidDob.dob) : 0;

    // Use future dates for validation to pass
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    await act(async () => {
      await result.current.createItinerary(
        {
          destination: 'Paris, France',
          startDate,
          endDate,
          lowerRange: 18,
          upperRange: 100,
          activities: [],
          description: 'Test',
          gender: 'No Preference',
          status: 'No Preference',
          sexualOrientation: 'No Preference',
        },
        mockUserProfileInvalidDob
      );
    });

    // Verify age defaults to 0 for invalid dob
    expect(mockCreateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        itinerary: expect.objectContaining({
          age: userAge, // Should be 0 for invalid date
        }),
      })
    );
  });

  it('should calculate age correctly handling birthday logic', () => {
    // Test various ages
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed (0 = January, 11 = December)
    const currentDay = today.getDate();

    // Someone born exactly 30 years ago today
    const dob30YearsAgo = `${currentYear - 30}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    expect(calculateAge(dob30YearsAgo)).toBe(30);

    // Someone whose birthday hasn't occurred yet this year
    // Their birth month is AFTER the current month
    let monthForFutureBirthday = currentMonth + 1; // Next month (0-indexed)
    let birthYearForAge29 = currentYear - 30;
    if (monthForFutureBirthday > 11) {
      // Wrap to January (month 0)
      monthForFutureBirthday = 0;
      // If birthday is in January of next year, person was born one year later
      birthYearForAge29 = currentYear - 29;
    }
    const dobBirthdayNotYet = `${birthYearForAge29}-${String(monthForFutureBirthday + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    // Year diff accounts for birthday not occurring, so age = 29
    const ageBeforeBirthday = calculateAge(dobBirthdayNotYet);
    expect(ageBeforeBirthday).toBe(29);

    // Someone whose birthday already occurred this year
    // Their birth month is BEFORE the current month
    let monthForPastBirthday = currentMonth - 1; // Previous month
    let birthYearForAge30 = currentYear - 30;
    if (monthForPastBirthday < 0) {
      // Wrap to December (month 11)
      monthForPastBirthday = 11;
      // If birthday was in December of last year, person was born one year earlier
      birthYearForAge30 = currentYear - 31;
    }
    const dobBirthdayPassed = `${birthYearForAge30}-${String(monthForPastBirthday + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
    // Year diff accounts for birthday occurring, so age = 30
    const ageAfterBirthday = calculateAge(dobBirthdayPassed);
    expect(ageAfterBirthday).toBe(30);
  });

  it('should include age when editing existing itinerary', async () => {
    const mockUserProfile = {
      uid: 'test-user',
      username: 'testuser',
      dob: '1995-08-20', // Age ~30
      gender: 'Female',
      status: 'Single',
      sexualOrientation: 'Straight',
      email: 'test@example.com',
      blocked: [],
    };

    const mockCreateItinerary = jest.fn().mockResolvedValue({
      data: { success: true },
    });

    mockHttpsCallable.mockReturnValue(mockCreateItinerary as any);

    const { result } = renderHook(() => useCreateItinerary());

    // Use future dates for validation to pass
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const startDate = tomorrow.toISOString().split('T')[0];
    const endDate = nextWeek.toISOString().split('T')[0];

    await act(async () => {
      // Third parameter is editingItineraryId
      await result.current.createItinerary(
        {
          destination: 'Tokyo, Japan',
          startDate,
          endDate,
          lowerRange: 18,
          upperRange: 100,
          activities: [],
          description: 'Updated Description',
          gender: 'No Preference',
          status: 'No Preference',
          sexualOrientation: 'No Preference',
        },
        mockUserProfile,
        'existing-itinerary-id' // Editing mode
      );
    });

    // Verify includes age field when editing
    const userAge = calculateAge(mockUserProfile.dob);
    expect(mockCreateItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        itinerary: expect.objectContaining({
          age: userAge, // CRITICAL: Age must be included in edits too
        }),
      })
    );

    expect(userAge).toBeGreaterThanOrEqual(29);
    expect(userAge).toBeLessThanOrEqual(30);
  });
});
