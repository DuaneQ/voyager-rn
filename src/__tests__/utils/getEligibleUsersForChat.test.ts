import { getEligibleUsersForChat } from '../../utils/getEligibleUsersForChat';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../../firebase-config');
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDocs: jest.fn(),
}));

describe('getEligibleUsersForChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return eligible users from connections', async () => {
    const mockSnapshot = {
      forEach: (callback: any) => {
        [
          { data: () => ({ users: ['user1', 'user2'] }) },
          { data: () => ({ users: ['user1', 'user3'] }) },
        ].forEach(callback);
      }
    };

    (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

    const result = await getEligibleUsersForChat('user1', ['user1']);

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        { userId: 'user2' },
        { userId: 'user3' }
      ])
    );
  });

  it('should exclude current user from eligible users', async () => {
    const mockSnapshot = {
      forEach: (callback: any) => {
        [
          { data: () => ({ users: ['user1', 'user2', 'user3'] }) },
        ].forEach(callback);
      }
    };

    (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

    const result = await getEligibleUsersForChat('user1', ['user1']);

    expect(result).not.toContainEqual({ userId: 'user1' });
  });

  it('should exclude users already in current chat', async () => {
    const mockSnapshot = {
      forEach: (callback: any) => {
        [
          { data: () => ({ users: ['user1', 'user2', 'user3'] }) },
        ].forEach(callback);
      }
    };

    (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

    const result = await getEligibleUsersForChat('user1', ['user1', 'user2']);

    expect(result).toEqual([{ userId: 'user3' }]);
    expect(result).not.toContainEqual({ userId: 'user2' });
  });

  it('should deduplicate users across multiple connections', async () => {
    const mockSnapshot = {
      forEach: (callback: any) => {
        [
          { data: () => ({ users: ['user1', 'user2'] }) },
          { data: () => ({ users: ['user1', 'user2'] }) },
          { data: () => ({ users: ['user1', 'user2'] }) },
        ].forEach(callback);
      }
    };

    (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

    const result = await getEligibleUsersForChat('user1', ['user1']);

    expect(result).toHaveLength(1);
    expect(result).toEqual([{ userId: 'user2' }]);
  });

  it('should return empty array if no eligible users', async () => {
    const mockSnapshot = {
      forEach: (callback: any) => {
        [
          { data: () => ({ users: ['user1'] }) },
        ].forEach(callback);
      }
    };

    (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

    const result = await getEligibleUsersForChat('user1', ['user1']);

    expect(result).toEqual([]);
  });

  it('should handle connections with empty users array', async () => {
    const mockSnapshot = {
      forEach: (callback: any) => {
        [
          { data: () => ({ users: [] }) },
          { data: () => ({ users: ['user1', 'user2'] }) },
        ].forEach(callback);
      }
    };

    (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

    const result = await getEligibleUsersForChat('user1', ['user1']);

    expect(result).toEqual([{ userId: 'user2' }]);
  });
});
