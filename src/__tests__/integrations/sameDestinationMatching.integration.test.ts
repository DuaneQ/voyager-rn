/**
 * Integration Test: Same-Destination Traveller Matching Pipeline
 *
 * Regression guard for the Nov 2025 destination-dedup bug (commit bc287bea8).
 * That commit introduced `seen.has(dest)` which silently collapsed all travellers
 * going to the same destination to a single result — destroying the core
 * matching feature.
 *
 * What this test covers (full hook pipeline, NOT just the dedup flag):
 *   CF response (realistic shape)
 *   → fetchFromCloudSQL response normalisation
 *   → validate() structural check
 *   → ID-only dedup
 *   → self-exclusion by userId
 *   → setAllMatchingItineraries / matchingItineraries slice
 *   → getNextItinerary (swipe) advances state
 *   → AsyncStorage records each viewed ID
 *   → Next search excludes previously viewed IDs via excludedIds
 *
 * These tests use a mocked httpsCallable that returns a response shaped
 * exactly like the real searchItineraries Cloud Function, so the full
 * hook pipeline is exercised without needing a live Firebase connection.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useSearchItineraries from '../../hooks/useSearchItineraries';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('../../../firebase-config', () => ({
  auth: { currentUser: { uid: 'searcher-uid' } },
  db: {},
  app: {},
  storage: {},
  functions: {},
}));
jest.mock('../../config/firebaseConfig');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEARCHER_UID = 'searcher-uid';

/** Mirrors the real createItinerary/searchItineraries CloudSQL field shape */
const makeItinerary = (overrides: Partial<Record<string, any>>) => ({
  id: `itin-${Math.random().toString(36).slice(2)}`,
  destination: 'Paris, France',
  title: 'Paris Adventure',
  description: 'Testing in Paris',
  startDate: '2026-04-15T00:00:00.000Z',
  endDate: '2026-04-22T00:00:00.000Z',
  startDay: new Date('2026-04-15').getTime(),
  endDay: new Date('2026-04-22').getTime(),
  lowerRange: 22,
  upperRange: 40,
  gender: 'No Preference',
  status: 'No Preference',
  sexualOrientation: 'No Preference',
  age: 28,
  userInfo: {
    uid: `user-${Math.random().toString(36).slice(2)}`,
    username: 'traveller',
    blocked: [],
  },
  ...overrides,
});

/** CF response envelope */
const cfResponse = (itineraries: object[]) => ({
  data: { success: true, data: itineraries },
});

/** User's own itinerary used as the search context ("my trip") */
const MY_ITINERARY = makeItinerary({
  id: 'my-trip',
  destination: 'Paris, France',
  startDate: '2026-04-15T00:00:00.000Z',
  endDate: '2026-04-22T00:00:00.000Z',
  startDay: new Date('2026-04-15').getTime(),
  endDay: new Date('2026-04-22').getTime(),
  userInfo: { uid: SEARCHER_UID, username: 'searcher', blocked: [] },
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Same-Destination Matching — integration pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); // no prior views
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    const { setMockUser } = require('../../testUtils/mockAuth');
    setMockUser();
  });

  afterEach(() => {
    const { clearMockUser } = require('../../testUtils/mockAuth');
    clearMockUser();
  });

  // ── Core regression ────────────────────────────────────────────────────────

  it('surfaces ALL same-destination travellers — not just the first one', async () => {
    // 6 different users all going to Paris (the seeded scenario from testing)
    const parisUsers = [
      makeItinerary({ id: 'paris-alex',    userInfo: { uid: 'uid-alex',    username: 'AlexChaudhary',   blocked: [] } }),
      makeItinerary({ id: 'paris-sophie',  userInfo: { uid: 'uid-sophie',  username: 'SophieBlanc',     blocked: [] } }),
      makeItinerary({ id: 'paris-lucas',   userInfo: { uid: 'uid-lucas',   username: 'LucasMartinez',   blocked: [] } }),
      makeItinerary({ id: 'paris-amina',   userInfo: { uid: 'uid-amina',   username: 'AminaKonate',     blocked: [] } }),
      makeItinerary({ id: 'paris-ryo',     userInfo: { uid: 'uid-ryo',     username: 'RyoSuzuki',       blocked: [] } }),
      makeItinerary({ id: 'paris-isabel',  userInfo: { uid: 'uid-isabel',  username: 'IsabellaRossi',   blocked: [] } }),
    ];

    (httpsCallable as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue(cfResponse(parisUsers))
    );

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(MY_ITINERARY as any, SEARCHER_UID);
    });

    await waitFor(() => {
      // All 6 Paris travellers must be present — never collapsed to 1
      expect(result.current.matchingItineraries).toHaveLength(6);
    });

    const returnedIds = result.current.matchingItineraries.map(i => i.id);
    expect(returnedIds).toEqual(
      expect.arrayContaining(['paris-alex', 'paris-sophie', 'paris-lucas', 'paris-amina', 'paris-ryo', 'paris-isabel'])
    );
  });

  // ── Swipe-through all same-destination cards ───────────────────────────────

  it('allows swiping through all same-destination cards one by one', async () => {
    const cards = [
      makeItinerary({ id: 'card-1', userInfo: { uid: 'u1', username: 'User1', blocked: [] } }),
      makeItinerary({ id: 'card-2', userInfo: { uid: 'u2', username: 'User2', blocked: [] } }),
      makeItinerary({ id: 'card-3', userInfo: { uid: 'u3', username: 'User3', blocked: [] } }),
    ];

    (httpsCallable as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue(cfResponse(cards))
    );

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(MY_ITINERARY as any, SEARCHER_UID);
    });

    await waitFor(() => expect(result.current.matchingItineraries).toHaveLength(3));

    // Swipe card-1 — card-2 should now be at the front
    await act(async () => { await result.current.getNextItinerary(); });
    expect(result.current.matchingItineraries[0].id).toBe('card-2');
    expect(result.current.matchingItineraries).toHaveLength(2);

    // Swipe card-2 — card-3 should now be at the front
    await act(async () => { await result.current.getNextItinerary(); });
    expect(result.current.matchingItineraries[0].id).toBe('card-3');
    expect(result.current.matchingItineraries).toHaveLength(1);

    // Swipe card-3 (last card) — queue exhausted
    await act(async () => { await result.current.getNextItinerary(); });
    expect(result.current.matchingItineraries).toHaveLength(0);
    expect(result.current.hasMore).toBe(false);
  });

  // ── AsyncStorage records each viewed ID ────────────────────────────────────

  it('records every swiped card ID in AsyncStorage', async () => {
    const cards = [
      makeItinerary({ id: 'store-1', userInfo: { uid: 'u1', username: 'User1', blocked: [] } }),
      makeItinerary({ id: 'store-2', userInfo: { uid: 'u2', username: 'User2', blocked: [] } }),
    ];

    (httpsCallable as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue(cfResponse(cards))
    );

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(MY_ITINERARY as any, SEARCHER_UID);
    });

    await act(async () => { await result.current.getNextItinerary(); }); // swipe store-1
    await act(async () => { await result.current.getNextItinerary(); }); // swipe store-2

    await waitFor(() => {
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const stored: string[] = JSON.parse(lastCall[1]);
      expect(stored).toContain('store-1');
      expect(stored).toContain('store-2');
    });
  });

  // ── Second search excludes already-viewed IDs ──────────────────────────────

  it('passes viewed card IDs as excludedIds on the next search', async () => {
    const initialCards = [
      makeItinerary({ id: 'viewed-1', userInfo: { uid: 'u1', username: 'User1', blocked: [] } }),
    ];

    const mockSearchFn = jest.fn().mockResolvedValue(cfResponse(initialCards));
    (httpsCallable as jest.Mock).mockReturnValue(mockSearchFn);

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(MY_ITINERARY as any, SEARCHER_UID);
    });

    // Swipe — now 'viewed-1' is in the viewed set
    await act(async () => { await result.current.getNextItinerary(); });

    // Second search — should include 'viewed-1' in excludedIds
    await act(async () => {
      await result.current.searchItineraries(MY_ITINERARY as any, SEARCHER_UID);
    });

    const secondCallArgs = mockSearchFn.mock.calls[1][0];
    expect(secondCallArgs.excludedIds).toContain('viewed-1');
  });

  // ── Self-exclusion ─────────────────────────────────────────────────────────

  it('never shows the searching user their own itinerary', async () => {
    const ownItinerary = makeItinerary({
      id: 'own-paris-trip',
      destination: 'Paris, France',
      userInfo: { uid: SEARCHER_UID, username: 'me', blocked: [] },
    });
    const otherItinerary = makeItinerary({
      id: 'other-paris-trip',
      userInfo: { uid: 'someone-else', username: 'other', blocked: [] },
    });

    (httpsCallable as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue(cfResponse([ownItinerary, otherItinerary]))
    );

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(MY_ITINERARY as any, SEARCHER_UID);
    });

    await waitFor(() => {
      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].id).toBe('other-paris-trip');
    });
  });

  // ── ID-only dedup (server duplicate) ──────────────────────────────────────

  it('deduplicates by ID but preserves all unique same-destination itineraries', async () => {
    const paris1 = makeItinerary({ id: 'unique-paris-1', userInfo: { uid: 'ua', username: 'A', blocked: [] } });
    const paris2 = makeItinerary({ id: 'unique-paris-2', userInfo: { uid: 'ub', username: 'B', blocked: [] } });
    const paris1Dup = { ...paris1 }; // same ID — server sent it twice

    (httpsCallable as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue(cfResponse([paris1, paris2, paris1Dup]))
    );

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(MY_ITINERARY as any, SEARCHER_UID);
    });

    await waitFor(() => {
      const ids = result.current.matchingItineraries.map(i => i.id);
      // Unique IDs kept, duplicate collapsed — but BOTH destinations preserved
      expect(ids).toEqual(['unique-paris-1', 'unique-paris-2']);
    });
  });
});
