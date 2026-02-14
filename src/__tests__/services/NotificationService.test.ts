/**
 * Unit tests for NotificationService (FCM-based)
 * Tests permission handling, FCM token management, and Firestore operations
 */

import { NotificationService } from '../../services/notification/NotificationService';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Mock React Native Firebase
jest.mock('@react-native-firebase/messaging');
jest.mock('@react-native-firebase/app');

// Get mocked messaging for tests
const messaging = jest.requireMock('@react-native-firebase/messaging').default;

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((value) => ({ _type: 'arrayUnion', value })),
  arrayRemove: jest.fn((value) => ({ _type: 'arrayRemove', value })),
}));

describe('NotificationService (FCM)', () => {
  let service: NotificationService;
  const mockUserId = 'test-user-123';
  const mockToken = 'mock-fcm-token-abc123xyz';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
  });

  describe('requestPermission', () => {
    it('should return true when permission is granted', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().requestPermission.mockResolvedValue(messaging.AuthorizationStatus.AUTHORIZED);

      const result = await service.requestPermission();

      expect(result).toBe(true);
      expect(mockMessaging().requestPermission).toHaveBeenCalled();
    });

    it('should return true for provisional permission', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().requestPermission.mockResolvedValue(messaging.AuthorizationStatus.PROVISIONAL);

      const result = await service.requestPermission();

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().requestPermission.mockResolvedValue(messaging.AuthorizationStatus.DENIED);

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().requestPermission.mockRejectedValue(new Error('Permission error'));

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('getFCMToken', () => {
    it('should return FCM token on success', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().getToken.mockResolvedValue(mockToken);

      const result = await service.getFCMToken();

      expect(result).toBe(mockToken);
      expect(mockMessaging().getToken).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().getToken.mockRejectedValue(new Error('Token error'));

      const result = await service.getFCMToken();

      expect(result).toBeNull();
    });

    it('should return null when token is null', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().getToken.mockResolvedValue(null);

      const result = await service.getFCMToken();

      expect(result).toBeNull();
    });
  });

  describe('saveToken', () => {
    it('should save FCM token to Firestore using arrayUnion', async () => {
      const mockDoc = doc as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;
      const mockArrayUnion = arrayUnion as jest.Mock;

      mockDoc.mockReturnValue({ path: `users/${mockUserId}` });
      mockUpdateDoc.mockResolvedValue(undefined);

      await service.saveToken(mockUserId, mockToken);

      expect(mockDoc).toHaveBeenCalled();
      expect(mockArrayUnion).toHaveBeenCalledWith(mockToken);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: `users/${mockUserId}` },
        { fcmTokens: { _type: 'arrayUnion', value: mockToken } }
      );
    });

    it('should throw error on Firestore failure', async () => {
      const mockUpdateDoc = updateDoc as jest.Mock;
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      await expect(service.saveToken(mockUserId, mockToken)).rejects.toThrow('Firestore error');
    });
  });

  describe('removeToken', () => {
    it('should remove FCM token from Firestore using arrayRemove', async () => {
      const mockDoc = doc as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;
      const mockArrayRemove = arrayRemove as jest.Mock;

      mockDoc.mockReturnValue({ path: `users/${mockUserId}` });
      mockUpdateDoc.mockResolvedValue(undefined);

      await service.removeToken(mockUserId, mockToken);

      expect(mockArrayRemove).toHaveBeenCalledWith(mockToken);
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: `users/${mockUserId}` },
        { fcmTokens: { _type: 'arrayRemove', value: mockToken } }
      );
    });

    it('should not throw error on Firestore failure', async () => {
      const mockUpdateDoc = updateDoc as jest.Mock;
      mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

      // Should not throw - sign-out should continue
      await expect(service.removeToken(mockUserId, mockToken)).resolves.not.toThrow();
    });
  });

  describe('removeAllTokens', () => {
    it('should clear all tokens by setting empty array', async () => {
      const mockDoc = doc as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;

      mockDoc.mockReturnValue({ path: `users/${mockUserId}` });
      mockUpdateDoc.mockResolvedValue(undefined);

      await service.removeAllTokens(mockUserId);

      expect(mockDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: `users/${mockUserId}` },
        { fcmTokens: [] }
      );
    });
  });

  describe('onTokenRefresh', () => {
    it('should set up token refresh listener', () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      const mockUnsubscribe = jest.fn();
      mockMessaging().onTokenRefresh.mockReturnValue(mockUnsubscribe);

      const callback = jest.fn();
      const unsubscribe = service.onTokenRefresh(mockUserId, callback);

      expect(mockMessaging().onTokenRefresh).toHaveBeenCalled();
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('deleteToken', () => {
    it('should delete FCM token', async () => {
      const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;
      mockMessaging().deleteToken.mockResolvedValue();

      await service.deleteToken();

      expect(mockMessaging().deleteToken).toHaveBeenCalled();
    });
  });

  describe('setBadgeCount', () => {
    it('should set iOS badge count (or skip if no expo-notifications)', async () => {
      // This test may not be meaningful without expo-notifications
      // Just verify it doesn't throw
      await expect(service.setBadgeCount(5)).resolves.not.toThrow();
    });

    it('should clear badge with clearBadge', async () => {
      await expect(service.clearBadge()).resolves.not.toThrow();
    });
  });
});
