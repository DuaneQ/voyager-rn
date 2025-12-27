/**
 * UserProfileService Unit Tests
 * 
 * Test Plan:
 * 1. getUserProfile - successful retrieval
 * 2. getUserProfile - handles Firestore errors
 * 3. getUserProfile - handles missing profile
 * 4. updateUserProfile - successful update
 * 5. updateUserProfile - handles errors
 * 6. createUserProfile - successful creation
 * 7. createUserProfile - handles errors
 * 8. acceptTerms - successful update
 */

import { UserProfileService } from '../../../services/userProfile/UserProfileService';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Mock Firebase Firestore
jest.mock('firebase/firestore');
jest.mock('../../../config/firebaseConfig', () => ({
  db: { _type: 'mock-firestore' },
  functions: { _type: 'mock-functions' },
}));

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockServerTimestamp = serverTimestamp as jest.MockedFunction<typeof serverTimestamp>;

describe('UserProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDoc.mockReturnValue({ id: 'user-123' } as any);
    mockServerTimestamp.mockReturnValue(new Date() as any);
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

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockProfile,
      } as any);

      const result = await UserProfileService.getUserProfile('user-123');

      expect(result).toEqual(mockProfile);
      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-123');
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('should handle missing profile', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      await expect(
        UserProfileService.getUserProfile('user-123')
      ).rejects.toThrow('Profile not found');
    });

    it('should handle Firestore errors', async () => {
      mockGetDoc.mockRejectedValue(new Error('Network error'));

      await expect(
        UserProfileService.getUserProfile('user-123')
      ).rejects.toThrow('Network error');
    });
  });

  describe('updateUserProfile', () => {
    it('should successfully update user profile', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      const updates = {
        bio: 'Updated bio',
        photoURL: 'https://example.com/new-photo.jpg',
      };

      await UserProfileService.updateUserProfile('user-123', updates);

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-123');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining(updates)
      );
    });

    it('should handle Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Permission denied'));

      await expect(
        UserProfileService.updateUserProfile('user-123', { bio: 'test' })
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('createUserProfile', () => {
    it('should successfully create user profile', async () => {
      mockSetDoc.mockResolvedValue(undefined);

      const profileData = {
        username: 'newuser',
        email: 'newuser@example.com',
        dob: '1995-05-15',
        gender: 'Female',
      };

      const result = await UserProfileService.createUserProfile('user-123', profileData);

      expect(result).toMatchObject(profileData);
      expect(result.uid).toBe('user-123');
      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-123');
      expect(mockSetDoc).toHaveBeenCalled();
    });

    it('should handle Firestore errors', async () => {
      mockSetDoc.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        UserProfileService.createUserProfile('user-123', { username: 'test' })
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('acceptTerms', () => {
    it('should successfully update terms acceptance', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await UserProfileService.acceptTerms('user-123');

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-123');
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          hasAcceptedTerms: true,
        })
      );
    });

    it('should handle Firestore errors', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Permission denied'));

      await expect(
        UserProfileService.acceptTerms('user-123')
      ).rejects.toThrow('Permission denied');
    });
  });
});
