import { renderHook, waitFor } from '@testing-library/react-native';
import { useRemoveConnection } from '../../hooks/useRemoveConnection';
import { deleteDoc } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../config/firebaseConfig');
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(() => ({})),
  deleteDoc: jest.fn(),
}));

describe('useRemoveConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return removeConnection function', () => {
    const { result } = renderHook(() => useRemoveConnection());

    expect(typeof result.current).toBe('function');
  });

  it('should successfully remove connection', async () => {
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveConnection());

    const response = await result.current('connection-123');

    expect(response.success).toBe(true);
    expect(deleteDoc).toHaveBeenCalled();
  });

  it('should handle removal errors', async () => {
    const error = new Error('Delete failed');
    (deleteDoc as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useRemoveConnection());

    const response = await result.current('connection-123');

    expect(response.success).toBe(false);
    expect(response.error).toBe(error);
  });

  it('should call deleteDoc with correct parameters', async () => {
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveConnection());

    await result.current('test-connection-id');

    expect(deleteDoc).toHaveBeenCalledTimes(1);
  });
});
