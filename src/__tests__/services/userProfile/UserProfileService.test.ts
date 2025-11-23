/**
 * UserProfileService Unit Tests
 * 
 * Test Plan:
 * 1. getUserProfile - successful retrieval
 * 2. getUserProfile - handles cloud function errors
 * 3. getUserProfile - handles failed responses
 * 4. updateUserProfile - successful update
 * 5. updateUserProfile - handles errors
 * 6. createUserProfile - successful creation
 * 7. createUserProfile - handles errors
 */

import { UserProfileService } from '../../../services/userProfile/UserProfileService';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase Functions
jest.mock('firebase/functions');
jest.mock('../../../config/firebaseConfig', () => ({
  functions: { _type: 'mock-functions' },
}));

const mockHttpsCallable = httpsCallable as jest.MockedFunction<typeof httpsCallable>;

describe('UserProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should successfully retrieve user profile', async () => {
      const mockProfile = {
        uid: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        bio: 'Test bio',
        dob: '1995-05-15',
        gender: 'Female',
        photoURL: 'https://example.com/photo.jpg',
      };

      const mockCallableFunction = jest.fn().mockResolvedValue({
        data: {
          success: true,
          profile: mockProfile,
        },
      });

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      const result = await UserProfileService.getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'getUserProfile');
      expect(mockCallableFunction).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('should handle failed response from cloud function', async () => {
      const mockCallableFunction = jest.fn().mockResolvedValue({
        data: {
          success: false,
        },
      });

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      await expect(
        UserProfileService.getUserProfile('user-123')
      ).rejects.toThrow('Failed to get user profile');
    });

    it('should handle cloud function errors', async () => {
      const mockCallableFunction = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      await expect(
        UserProfileService.getUserProfile('user-123')
      ).rejects.toThrow('Network error');
    });
  });

  describe('updateUserProfile', () => {
    it('should successfully update user profile', async () => {
      const mockCallableFunction = jest.fn().mockResolvedValue({
        data: {
          success: true,
        },
      });

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      const updates = {
        bio: 'Updated bio',
        photoURL: 'https://example.com/new-photo.jpg',
      };

      await UserProfileService.updateUserProfile('user-123', updates);

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'updateUserProfile');
      expect(mockCallableFunction).toHaveBeenCalledWith({
        userId: 'user-123',
        updates,
      });
    });

    it('should handle failed response from cloud function', async () => {
      const mockCallableFunction = jest.fn().mockResolvedValue({
        data: {
          success: false,
          message: 'Invalid profile data',
        },
      });

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      await expect(
        UserProfileService.updateUserProfile('user-123', { bio: 'test' })
      ).rejects.toThrow('Invalid profile data');
    });

    it('should handle cloud function errors', async () => {
      const mockCallableFunction = jest.fn().mockRejectedValue(
        new Error('Permission denied')
      );

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      await expect(
        UserProfileService.updateUserProfile('user-123', { bio: 'test' })
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('createUserProfile', () => {
    it('should successfully create user profile', async () => {
      const mockProfile = {
        uid: 'user-123',
        username: 'newuser',
        email: 'newuser@example.com',
        bio: '',
        dob: '1995-05-15',
        gender: 'Female',
      };

      const mockCallableFunction = jest.fn().mockResolvedValue({
        data: {
          success: true,
          profile: mockProfile,
        },
      });

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      const profileData = {
        username: 'newuser',
        email: 'newuser@example.com',
        dob: '1995-05-15',
        gender: 'Female',
      };

      const result = await UserProfileService.createUserProfile('user-123', profileData);

      expect(result).toEqual(mockProfile);
      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'createUserProfile');
      expect(mockCallableFunction).toHaveBeenCalledWith({
        userId: 'user-123',
        profile: profileData,
      });
    });

    it('should handle failed response from cloud function', async () => {
      const mockCallableFunction = jest.fn().mockResolvedValue({
        data: {
          success: false,
          message: 'Username already exists',
        },
      });

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      await expect(
        UserProfileService.createUserProfile('user-123', { username: 'existing' })
      ).rejects.toThrow('Username already exists');
    });

    it('should handle cloud function errors', async () => {
      const mockCallableFunction = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      mockHttpsCallable.mockReturnValue(mockCallableFunction as any);

      await expect(
        UserProfileService.createUserProfile('user-123', { username: 'test' })
      ).rejects.toThrow('Database connection failed');
    });
  });
});
