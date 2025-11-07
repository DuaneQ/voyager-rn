import { renderHook, act } from '@testing-library/react-native';
import { waitFor } from '@testing-library/react-native';

// We'll require the hook inside each test after configuring module mocks to avoid duplicate React instances

// Mocks: firebase config and functions (mutable mock objects used across tests)
const mockFirebaseConfig = { auth: { currentUser: undefined }, functions: {} };
jest.mock('../../config/firebaseConfig', () => mockFirebaseConfig);

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

describe('useAIGeneratedItineraries', () => {
  beforeEach(() => {
    // reset mock state between tests
    mockFirebaseConfig.auth.currentUser = undefined;
    const { httpsCallable } = require('firebase/functions');
    (httpsCallable as jest.Mock).mockReset();
    jest.clearAllMocks();
  });

  it('sets error when there is no authenticated user', async () => {
    const { useAIGeneratedItineraries: useHook } = require('../../hooks/useAIGeneratedItineraries');
    const { result } = renderHook(() => useHook());

    await waitFor(() => {
      expect(result.current.error).toBe('User not authenticated');
    });

    expect(result.current.itineraries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetches itineraries when user is authenticated and httpsCallable returns success', async () => {
    mockFirebaseConfig.auth.currentUser = { uid: 'user-1' };

    const fakeResponse = { data: { success: true, data: [ { id: 'ai-1', startDay: 2 }, { id: 'ai-2', startDay: 1 } ] } };
  const { httpsCallable } = require('firebase/functions');
  (httpsCallable as jest.Mock).mockImplementation(() => jest.fn(() => Promise.resolve(fakeResponse)));

    const { useAIGeneratedItineraries: useHook } = require('../../hooks/useAIGeneratedItineraries');
    const { result } = renderHook(() => useHook());

    await waitFor(() => {
      expect(result.current.itineraries.length).toBe(2);
    });

    expect(result.current.itineraries[0].id).toBe('ai-1');
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('sets error when RPC returns success: false', async () => {
    mockFirebaseConfig.auth.currentUser = { uid: 'user-2' };
  const failResponse = { data: { success: false, error: 'backend failure' } };
  const { httpsCallable } = require('firebase/functions');
  (httpsCallable as jest.Mock).mockImplementation(() => jest.fn(() => Promise.resolve(failResponse)));

    const { useAIGeneratedItineraries: useHook } = require('../../hooks/useAIGeneratedItineraries');
    const { result } = renderHook(() => useHook());

    await waitFor(() => {
      expect(result.current.error).toMatch(/backend failure/);
    });

    expect(result.current.itineraries).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
