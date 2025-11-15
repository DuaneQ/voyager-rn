/**
 * Unit Tests for useAllItineraries Hook
 * Tests fetching all user itineraries (AI + manual) from PostgreSQL
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useAllItineraries } from '../../hooks/useAllItineraries';
import { auth } from '../../config/firebaseConfig';

// Use centralized manual mock for firebaseConfig
jest.mock('../../config/firebaseConfig');

// Mock Firebase Functions
const mockListItinerariesFn = jest.fn();
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => mockListItinerariesFn),
}));

describe('useAllItineraries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset auth mock
    (auth as any).currentUser = { uid: 'test-user-123' };
  });

  it('should fetch all itineraries successfully', async () => {
    const mockItineraries = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Tokyo, Japan',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
        ai_status: 'completed',
      },
      {
        id: 'itin-2',
        userId: 'test-user-123',
        destination: 'Paris, France',
        startDate: '2025-07-01',
        endDate: '2025-07-10',
        startDay: Date.parse('2025-07-01'),
        endDay: Date.parse('2025-07-10'),
      },
    ];

    mockListItinerariesFn.mockResolvedValue({
      data: {
        success: true,
        data: mockItineraries,
      },
    });

    const { result } = renderHook(() => useAllItineraries());

    expect(result.current.loading).toBe(true);
    expect(result.current.itineraries).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.itineraries).toHaveLength(2);
    expect(result.current.itineraries[0].destination).toBe('Paris, France'); // Sorted by startDay desc
    expect(result.current.itineraries[1].destination).toBe('Tokyo, Japan');
    expect(result.current.error).toBeNull();
  });

  it('should handle authentication error', async () => {
    (auth as any).currentUser = null;

    const { result } = renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('User not authenticated');
    expect(result.current.itineraries).toEqual([]);
  });

  it('should handle API error', async () => {
    mockListItinerariesFn.mockResolvedValue({
      data: {
        success: false,
        error: 'Database connection failed',
      },
    });

    const { result } = renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Database connection failed');
    expect(result.current.itineraries).toEqual([]);
  });

  it('should handle network error', async () => {
    mockListItinerariesFn.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.itineraries).toEqual([]);
  });

  it('should fetch both AI and manual itineraries', async () => {
    const mockItineraries = [
      {
        id: 'ai-1',
        userId: 'test-user-123',
        destination: 'AI Tokyo',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
        ai_status: 'completed',
      },
      {
        id: 'manual-1',
        userId: 'test-user-123',
        destination: 'Manual Paris',
        startDate: '2025-07-01',
        endDate: '2025-07-10',
        startDay: Date.parse('2025-07-01'),
        endDay: Date.parse('2025-07-10'),
      },
      {
        id: 'ai-2',
        userId: 'test-user-123',
        destination: 'AI London',
        startDate: '2025-08-01',
        endDate: '2025-08-05',
        startDay: Date.parse('2025-08-01'),
        endDay: Date.parse('2025-08-05'),
        ai_status: 'completed',
      },
    ];

    mockListItinerariesFn.mockResolvedValue({
      data: {
        success: true,
        data: mockItineraries,
      },
    });

    const { result } = renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.itineraries).toHaveLength(3);
    
    // Should include both AI and manual itineraries
    const aiItineraries = result.current.itineraries.filter(i => i.ai_status === 'completed');
    const manualItineraries = result.current.itineraries.filter(i => !i.ai_status || i.ai_status !== 'completed');
    
    expect(aiItineraries).toHaveLength(2);
    expect(manualItineraries).toHaveLength(1);
  });

  it('should sort itineraries by startDay descending', async () => {
    const mockItineraries = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Oldest',
        startDate: '2025-01-01',
        endDate: '2025-01-07',
        startDay: Date.parse('2025-01-01'),
        endDay: Date.parse('2025-01-07'),
      },
      {
        id: 'itin-2',
        userId: 'test-user-123',
        destination: 'Newest',
        startDate: '2025-12-01',
        endDate: '2025-12-07',
        startDay: Date.parse('2025-12-01'),
        endDay: Date.parse('2025-12-07'),
      },
      {
        id: 'itin-3',
        userId: 'test-user-123',
        destination: 'Middle',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
      },
    ];

    mockListItinerariesFn.mockResolvedValue({
      data: {
        success: true,
        data: mockItineraries,
      },
    });

    const { result } = renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.itineraries[0].destination).toBe('Newest');
    expect(result.current.itineraries[1].destination).toBe('Middle');
    expect(result.current.itineraries[2].destination).toBe('Oldest');
  });

  it('should refresh itineraries when refreshItineraries is called', async () => {
    const initialMockData = [
      {
        id: 'itin-1',
        userId: 'test-user-123',
        destination: 'Initial',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        startDay: Date.parse('2025-06-01'),
        endDay: Date.parse('2025-06-07'),
      },
    ];

    const updatedMockData = [
      ...initialMockData,
      {
        id: 'itin-2',
        userId: 'test-user-123',
        destination: 'New',
        startDate: '2025-07-01',
        endDate: '2025-07-07',
        startDay: Date.parse('2025-07-01'),
        endDay: Date.parse('2025-07-07'),
      },
    ];

    mockListItinerariesFn
      .mockResolvedValueOnce({
        data: { success: true, data: initialMockData },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: updatedMockData },
      });

    const { result } = renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.itineraries).toHaveLength(1);

    // Refresh itineraries
    await result.current.refreshItineraries();

    await waitFor(() => {
      expect(result.current.itineraries).toHaveLength(2);
    });

    expect(mockListItinerariesFn).toHaveBeenCalledTimes(2);
  });

  it('should handle empty itineraries list', async () => {
    mockListItinerariesFn.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    const { result } = renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.itineraries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should call listItinerariesForUser without ai_status filter', async () => {
    mockListItinerariesFn.mockResolvedValue({
      data: {
        success: true,
        data: [],
      },
    });

    renderHook(() => useAllItineraries());

    await waitFor(() => {
      expect(mockListItinerariesFn).toHaveBeenCalled();
    });

    // Verify the function was called with userId only (no ai_status filter)
    const callArgs = mockListItinerariesFn.mock.calls[0][0];
    expect(callArgs).toEqual({ userId: 'test-user-123' });
    expect(callArgs.ai_status).toBeUndefined();
  });
});
