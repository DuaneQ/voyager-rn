/**
 * Unit tests for NotificationService (expo-notifications)
 * Tests permission handling, push token management, and Firestore operations
 */

import { NotificationService } from '../../services/notification/NotificationService';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  addPushTokenListener: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  unregisterForNotificationsAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

// Mock expo-device with mutable isDevice flag
let mockIsDevice = true;
jest.mock('expo-device', () => ({
  get isDevice() { return mockIsDevice; },
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn((value) => ({ _type: 'arrayUnion', value })),
  arrayRemove: jest.fn((value) => ({ _type: 'arrayRemove', value })),
}));

// Mock Firebase Functions (for APNs → FCM conversion on iOS)
const mockConvertedFcmToken = 'mock-converted-fcm-token-xyz';
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => jest.fn().mockResolvedValue({
    data: { fcmToken: mockConvertedFcmToken }
  })),
}));

describe('NotificationService (expo-notifications)', () => {
  let service: NotificationService;
  const mockUserId = 'test-user-123';
  const mockToken = 'mock-fcm-token-abc123xyz';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
    // Default: physical device
    mockIsDevice = true;
  });

  describe('requestPermission', () => {
    it('should return true when permission is already granted', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

      const result = await service.requestPermission();

      expect(result).toBe(true);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      // Should NOT request again if already granted
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should request permission and return true when user grants', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

      const result = await service.requestPermission();

      expect(result).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(new Error('Permission error'));

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });

    it('should return false on non-device (emulator/simulator)', async () => {
      mockIsDevice = false;

      const result = await service.requestPermission();

      expect(result).toBe(false);
      expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('getFCMToken', () => {
    it('should return device push token on success (iOS: converts APNs to FCM)', async () => {
      (Notifications.getDevicePushTokenAsync as jest.Mock).mockResolvedValue({ data: mockToken });

      const result = await service.getFCMToken();

      // Platform.OS defaults to 'ios' in test env, so APNs → FCM conversion runs
      expect(result).toBe(mockConvertedFcmToken);
      expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalled();
    });

    it('should return null on error', async () => {
      (Notifications.getDevicePushTokenAsync as jest.Mock).mockRejectedValue(new Error('Token error'));

      const result = await service.getFCMToken();

      expect(result).toBeNull();
    });

    it('should return null on non-device (emulator/simulator)', async () => {
      mockIsDevice = false;

      const result = await service.getFCMToken();

      expect(result).toBeNull();
      expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('saveToken', () => {
    it('should save push token to Firestore using arrayUnion', async () => {
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
    it('should remove push token from Firestore using arrayRemove', async () => {
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
    it('should set up push token listener and return unsubscribe', () => {
      const mockRemove = jest.fn();
      (Notifications.addPushTokenListener as jest.Mock).mockReturnValue({ remove: mockRemove });

      const callback = jest.fn();
      const unsubscribe = service.onTokenRefresh(mockUserId, callback);

      expect(Notifications.addPushTokenListener).toHaveBeenCalled();
      
      // Calling unsubscribe should call subscription.remove()
      unsubscribe();
      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('deleteToken', () => {
    it('should unregister from push notifications', async () => {
      (Notifications.unregisterForNotificationsAsync as jest.Mock).mockResolvedValue(undefined);

      await service.deleteToken();

      expect(Notifications.unregisterForNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('setBadgeCount', () => {
    it('should set badge count via expo-notifications', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);

      await service.setBadgeCount(5);

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('should clear badge with clearBadge', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);

      await service.clearBadge();

      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });
});
