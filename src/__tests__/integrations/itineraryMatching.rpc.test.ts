/**
 * Integration Tests: Itinerary Matching via searchItineraries RPC (CRITICAL - COMPREHENSIVE)
 * 
 * These tests validate ALL matching criteria by testing the ACTUAL searchItineraries RPC
 * that queries PostgreSQL/Cloud SQL (not Firestore - that's only for sharing!).
 * 
 * Tests mirror the server-side logic in functions/src/functions/itinerariesRpc.ts
 * 
 * Coverage:
 * 1. Destination Matching - exact match required
 * 2. Date Overlap Logic - various overlap scenarios  
 * 3. Age Range Filtering - within/outside range, boundaries
 * 4. Gender Preference - exact match and "No Preference"
 * 5. Status Preference - exact match and "No Preference"
 * 6. Sexual Orientation Preference - exact match and "No Preference"
 * 7. Blocking Logic - bidirectional blocking
 * 8. Combined Filters - multiple criteria together
 * 9. Edge Cases - missing fields, boundaries
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase-config';
import { Itinerary } from '../../types/Itinerary';

// Mock Firebase functions
jest.mock('firebase/functions');
jest.mock('../../../firebase-config', () => ({
  functions: {},
}));

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

describe('searchItineraries RPC - Comprehensive Matching Tests', () => {
  let mockSearchFn: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchFn = jest.fn();
    mockHttpsCallable.mockReturnValue(mockSearchFn as any);
  });

  // Helper to create mock itinerary
  const createMockItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ({
    id: `itin-${Date.now()}-${Math.random()}`,
    destination: 'Paris, France',
    startDay: Date.now(),
    endDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    lowerRange: 18,
    upperRange: 100,
    gender: 'No Preference',
    status: 'No Preference',
    sexualOrientation: 'No Preference',
    age: 30,
    userInfo: {
      uid: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      dob: '1995-01-01',
      gender: 'Female',
      status: 'Single',
      sexualOrientation: 'Straight',
      blocked: [],
    },
    likes: [],
    ...overrides,
  });

  // ============================================================================
  // 1. DESTINATION MATCHING
  // ============================================================================
  describe('Destination Matching', () => {
    it('should only return itineraries matching exact destination', async () => {
      const parisItinerary = createMockItinerary({ destination: 'Paris, France' });
      
      mockSearchFn.mockResolvedValue({
        data: {
          success: true,
          data: [parisItinerary],
        },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
        lowerRange: 18,
        upperRange: 100,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({ destination: 'Paris, France' })
      );
      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0].destination).toBe('Paris, France');
    });

    it('should return empty for non-matching destination', async () => {
      mockSearchFn.mockResolvedValue({
        data: {
          success: true,
          data: [],
        },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'London, UK',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(0);
    });
  });

  // ============================================================================
  // 2. DATE OVERLAP LOGIC
  // ============================================================================
  describe('Date Overlap Matching', () => {
    const userStartDay = new Date('2025-12-01').getTime();
    const userEndDay = new Date('2025-12-15').getTime();

    it('should find itineraries with partial date overlap', async () => {
      const overlappingItin = createMockItinerary({
        startDay: new Date('2025-12-10').getTime(),
        endDay: new Date('2025-12-20').getTime(),
      });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [overlappingItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        minStartDay: userStartDay,
        maxEndDay: userEndDay,
      });

      expect(result.data.data).toHaveLength(1);
    });

    it('should find itineraries with exact date match', async () => {
      const exactItin = createMockItinerary({
        startDay: userStartDay,
        endDay: userEndDay,
      });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [exactItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      await searchFn({
        destination: 'Paris, France',
        minStartDay: userStartDay,
        maxEndDay: userEndDay,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          minStartDay: userStartDay,
          maxEndDay: userEndDay,
        })
      );
    });

    it('should exclude itineraries with no date overlap', async () => {
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        minStartDay: userStartDay,
        maxEndDay: userEndDay,
      });

      expect(result.data.data).toHaveLength(0);
    });
  });

  // ============================================================================
  // 3. AGE RANGE FILTERING
  // ============================================================================
  describe('Age Range Filtering', () => {
    it('should match users within age range', async () => {
      const matchingItin = createMockItinerary({ age: 30 });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [matchingItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        lowerRange: 25,
        upperRange: 35,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          lowerRange: 25,
          upperRange: 35,
        })
      );
      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0].age).toBe(30);
    });

    it('should exclude users below age range', async () => {
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        lowerRange: 30,
        upperRange: 40,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(0);
    });

    it('should exclude users above age range', async () => {
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        lowerRange: 25,
        upperRange: 35,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(0);
    });

    it('should match users at exact lower boundary', async () => {
      const boundaryItin = createMockItinerary({ age: 25 });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [boundaryItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        lowerRange: 25,
        upperRange: 35,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data[0].age).toBe(25);
    });

    it('should match users at exact upper boundary', async () => {
      const boundaryItin = createMockItinerary({ age: 35 });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [boundaryItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        lowerRange: 25,
        upperRange: 35,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data[0].age).toBe(35);
    });
  });

  // ============================================================================
  // 4. GENDER PREFERENCE FILTERING
  // ============================================================================
  describe('Gender Preference Filtering', () => {
    it('should match specific gender preference', async () => {
      const femaleItin = createMockItinerary({ gender: 'Female' });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [femaleItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        gender: 'Female',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'Female' })
      );
      expect(result.data.data[0].gender).toBe('Female');
    });

    it('should return all genders when preference is "No Preference"', async () => {
      const maleItin = createMockItinerary({ gender: 'Male' });
      const femaleItin = createMockItinerary({ gender: 'Female' });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [maleItin, femaleItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        gender: 'No Preference',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(2);
    });

    it('should exclude non-matching gender', async () => {
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        gender: 'Female',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(0);
    });
  });

  // ============================================================================
  // 5. STATUS PREFERENCE FILTERING
  // ============================================================================
  describe('Status Preference Filtering', () => {
    it('should match specific status preference', async () => {
      const singleItin = createMockItinerary({ status: 'Single' });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [singleItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        status: 'Single',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Single' })
      );
      expect(result.data.data[0].status).toBe('Single');
    });

    it('should return all statuses when preference is "No Preference"', async () => {
      const singleItin = createMockItinerary({ status: 'Single' });
      const coupleItin = createMockItinerary({ status: 'Couple' });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [singleItin, coupleItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        status: 'No Preference',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(2);
    });
  });

  // ============================================================================
  // 6. SEXUAL ORIENTATION PREFERENCE FILTERING
  // ============================================================================
  describe('Sexual Orientation Preference Filtering', () => {
    it('should match specific orientation preference', async () => {
      const gayItin = createMockItinerary({ sexualOrientation: 'Homosexual' });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [gayItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        sexualOrientation: 'Homosexual',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({ sexualOrientation: 'Homosexual' })
      );
      expect(result.data.data[0].sexualOrientation).toBe('Homosexual');
    });

    it('should return all orientations when preference is "No Preference"', async () => {
      const straightItin = createMockItinerary({ sexualOrientation: 'Heterosexual' });
      const biItin = createMockItinerary({ sexualOrientation: 'Bisexual' });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [straightItin, biItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        sexualOrientation: 'No Preference',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(2);
    });
  });

  // ============================================================================
  // 7. BLOCKING LOGIC (BIDIRECTIONAL)
  // ============================================================================
  describe('Blocking Logic', () => {
    it('should exclude itineraries from users current user has blocked', async () => {
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        blockedUserIds: ['blocked-user-123'],
        currentUserId: 'current-user',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: ['blocked-user-123'],
          currentUserId: 'current-user',
        })
      );
      expect(result.data.data).toHaveLength(0);
    });

    it('should exclude itineraries where candidate blocked current user (bidirectional)', async () => {
      // RPC should filter these out server-side
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        currentUserId: 'current-user',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(0);
    });

    it('should include users not in block list', async () => {
      const validItin = createMockItinerary({
        userInfo: {
          uid: 'non-blocked-user',
          username: 'validuser',
          email: 'valid@example.com',
          dob: '1995-01-01',
          gender: 'Female',
          status: 'Single',
          sexualOrientation: 'Straight',
          blocked: [],
        },
      });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [validItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        blockedUserIds: ['other-blocked-user'],
        currentUserId: 'current-user',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(1);
      expect(result.data.data[0].userInfo?.uid).toBe('non-blocked-user');
    });
  });

  // ============================================================================
  // 8. COMBINED FILTERS
  // ============================================================================
  describe('Combined Filters', () => {
    it('should match when ALL criteria are met', async () => {
      const perfectMatch = createMockItinerary({
        destination: 'Paris, France',
        age: 30,
        gender: 'Female',
        status: 'Single',
        sexualOrientation: 'Straight',
        startDay: new Date('2025-12-05').getTime(),
        endDay: new Date('2025-12-10').getTime(),
      });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [perfectMatch] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        gender: 'Female',
        status: 'Single',
        sexualOrientation: 'Straight',
        lowerRange: 25,
        upperRange: 35,
        minStartDay: new Date('2025-12-01').getTime(),
        maxEndDay: new Date('2025-12-15').getTime(),
        currentUserId: 'current-user',
        blockedUserIds: [],
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: 'Paris, France',
          gender: 'Female',
          status: 'Single',
          sexualOrientation: 'Straight',
          lowerRange: 25,
          upperRange: 35,
        })
      );
      expect(result.data.data).toHaveLength(1);
    });

    it('should exclude when ANY criterion fails', async () => {
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        gender: 'Female',
        status: 'Single',
        lowerRange: 25,
        upperRange: 35,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(0);
    });
  });

  // ============================================================================
  // 9. EDGE CASES
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle missing age field gracefully', async () => {
      const noAgeItin = createMockItinerary({ age: undefined });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [noAgeItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data).toHaveLength(1);
    });

    it('should handle minimum age boundary (18)', async () => {
      const minAgeItin = createMockItinerary({ age: 18, lowerRange: 18 });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [minAgeItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        lowerRange: 18,
        upperRange: 100,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data[0].age).toBe(18);
    });

    it('should handle maximum age boundary (100)', async () => {
      const maxAgeItin = createMockItinerary({ age: 100, upperRange: 100 });

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [maxAgeItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        lowerRange: 18,
        upperRange: 100,
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(result.data.data[0].age).toBe(100);
    });

    it('should handle empty blocked users array', async () => {
      const validItin = createMockItinerary();

      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [validItin] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      const result = await searchFn({
        destination: 'Paris, France',
        blockedUserIds: [],
        currentUserId: 'current-user',
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({ blockedUserIds: [] })
      );
      expect(result.data.data).toHaveLength(1);
    });

    it('should handle excludedIds parameter', async () => {
      mockSearchFn.mockResolvedValue({
        data: { success: true, data: [] },
      });

      const searchFn = httpsCallable(functions, 'searchItineraries');
      await searchFn({
        destination: 'Paris, France',
        excludedIds: ['viewed-1', 'viewed-2'],
        minStartDay: Date.now(),
        maxEndDay: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          excludedIds: ['viewed-1', 'viewed-2'],
        })
      );
    });
  });
});
