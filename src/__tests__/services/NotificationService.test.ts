/**
 * Unit tests for NotificationService (@react-native-firebase/messaging + expo-notifications)
 * Tests permission handling, FCM token management, and Firestore operations
 * 
 * @react-native-firebase/messaging handles:
 *   - FCM token retrieval (messaging().getToken())
 *   - Permission requests (messaging().requestPermission())
 *   - Token refresh (messaging().onTokenRefresh())
 *   - Token deletion (messaging().deleteToken())
 * 
 * expo-notifications handles:
 *   - Notification channels (Android)
 *   - Badge management
 *   - Notification listeners (foreground, interaction)
 */

import { NotificationService } from '../../services/notification/NotificationService';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import messaging from '../../services/notification/messaging';

// Mock the platform-specific messaging module
jest.mock('../../services/notification/messaging', () => {
  const mockGetToken = jest.fn().mockResolvedValue('mock-fcm-token-abc123xyz');
  const mockRequestPermission = jest.fn().mockResolvedValue(1); // AUTHORIZED
  const mockDeleteToken = jest.fn().mockResolvedValue(undefined);
  const mockOnTokenRefresh = jest.fn().mockReturnValue(jest.fn());

  const mockInstance = {
    getToken: mockGetToken,
    requestPermission: mockRequestPermission,
    deleteToken: mockDeleteToken,
    onTokenRefresh: mockOnTokenRefresh,
  };

  const messagingFn: any = jest.fn(() => mockInstance);
  messagingFn.AuthorizationStatus = {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  };

  return { __esModule: true, default: messagingFn };
});

// Mock expo-notifications (channels + badges only)
jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4 },
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
  arrayRemove: jest.fn((value) => ({ _type: 'arrayRemove', value })),
}));

describe('NotificationService (@react-native-firebase/messaging)', () => {
  let service: NotificationService;
  const mockUserId = 'test-user-123';
  const mockToken = 'mock-fcm-token-abc123xyz';
  const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
    // Default: physical device
    mockIsDevice = true;
  });

  describe('requestPermission', () => {
    it('should return true when permission is authorized', async () => {
      (mockMessaging() as any).requestPermission.mockResolvedValue(1); // AUTHORIZED

      const result = await service.requestPermission();

      expect(result).toBe(true);
    });

    it('should return true when permission is provisional', async () => {
      (mockMessaging() as any).requestPermission.mockResolvedValue(2); // PROVISIONAL

      const result = await service.requestPermission();

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      (mockMessaging() as any).requestPermission.mockResolvedValue(0); // DENIED

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (mockMessaging() as any).requestPermission.mockRejectedValue(new Error('Permission error'));

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });

    it('should return false on non-device (emulator/simulator)', async () => {
      mockIsDevice = false;

      const result = await service.requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('getFCMToken', () => {
    it('should return FCM token from @react-native-firebase/messaging', async () => {
      (mockMessaging() as any).getToken.mockResolvedValue(mockToken);

      const result = await service.getFCMToken();

      expect(result).toBe(mockToken);
    });

    it('should return null when token is null', async () => {
      (mockMessaging() as any).getToken.mockResolvedValue(null);

      const result = await service.getFCMToken();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      (mockMessaging() as any).getToken.mockRejectedValue(new Error('Token error'));

      const result = await service.getFCMToken();

      expect(result).toBeNull();
    });

    it('should return null on non-device (emulator/simulator)', async () => {
      mockIsDevice = false;

      const result = await service.getFCMToken();

      expect(result).toBeNull();
    });
  });

  describe('saveToken', () => {
    it('should save FCM token to Firestore replacing all existing tokens', async () => {
      const mockDoc = doc as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;

      mockDoc.mockReturnValue({ path: `users/${mockUserId}` });
      mockUpdateDoc.mockResolvedValue(undefined);

      await service.saveToken(mockUserId, mockToken);

      expect(mockDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: `users/${mockUserId}` },
        { 
          fcmTokens: [mockToken],
          lastTokenPlatform: 'ios',
          lastTokenRegistered: expect.any(String)
        }
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
        { 
          fcmTokens: [],
          lastTokenPlatform: null,
          lastTokenRegistered: null
        }
      );
    });
  });

  describe('onTokenRefresh', () => {
    it('should set up messaging token refresh listener and return unsubscribe', () => {
      const mockUnsubscribe = jest.fn();
      (mockMessaging() as any).onTokenRefresh.mockReturnValue(mockUnsubscribe);

      const callback = jest.fn();
      const unsubscribe = service.onTokenRefresh(mockUserId, callback);

      expect((mockMessaging() as any).onTokenRefresh).toHaveBeenCalled();
      
      // Calling unsubscribe should call the returned unsubscribe function
      unsubscribe();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should save new token and call callback on token refresh', async () => {
      const mockUnsubscribe = jest.fn();
      const newToken = 'new-refreshed-token-xyz';
      let tokenRefreshHandler: ((token: string) => void) | null = null;

      // Capture the handler passed to onTokenRefresh
      (mockMessaging() as any).onTokenRefresh.mockImplementation((handler: any) => {
        tokenRefreshHandler = handler;
        return mockUnsubscribe;
      });

      const mockDoc = doc as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;
      mockDoc.mockReturnValue({ path: `users/${mockUserId}` });
      mockUpdateDoc.mockResolvedValue(undefined);

      const callback = jest.fn();
      service.onTokenRefresh(mockUserId, callback);

      // Simulate token refresh
      await tokenRefreshHandler!(newToken);

      // Verify saveToken was called (via Firestore updateDoc)
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: `users/${mockUserId}` },
        expect.objectContaining({
          fcmTokens: [newToken],
        })
      );

      // Verify user callback was invoked with new token
      expect(callback).toHaveBeenCalledWith(newToken);
    });

    it('should catch and log errors during token save without crashing', async () => {
      const mockUnsubscribe = jest.fn();
      const newToken = 'new-refreshed-token-xyz';
      let tokenRefreshHandler: ((token: string) => void) | null = null;

      (mockMessaging() as any).onTokenRefresh.mockImplementation((handler: any) => {
        tokenRefreshHandler = handler;
        return mockUnsubscribe;
      });

      const mockDoc = doc as jest.Mock;
      const mockUpdateDoc = updateDoc as jest.Mock;
      mockDoc.mockReturnValue({ path: `users/${mockUserId}` });
      mockUpdateDoc.mockRejectedValue(new Error('Firestore write failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const callback = jest.fn();
      service.onTokenRefresh(mockUserId, callback);

      // Simulate token refresh with Firestore failure
      await tokenRefreshHandler!(newToken);

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error saving refreshed FCM token:',
        expect.any(Error)
      );

      // Verify callback was NOT called (error occurred before callback)
      expect(callback).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('deleteToken', () => {
    it('should delete FCM token via messaging().deleteToken()', async () => {
      (mockMessaging() as any).deleteToken.mockResolvedValue(undefined);

      await service.deleteToken();

      expect((mockMessaging() as any).deleteToken).toHaveBeenCalled();
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
