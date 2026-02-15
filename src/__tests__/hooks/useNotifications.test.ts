/**
 * Unit tests for useNotifications hook
 * Tests state management and integration with NotificationService (expo-notifications)
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { notificationService } from '../../services/notification/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
}));

// Mock AsyncStorage (auto-loaded from __mocks__)
jest.mock('@react-native-async-storage/async-storage');

// Mock NotificationService
jest.mock('../../services/notification/NotificationService', () => ({
  notificationService: {
    requestPermission: jest.fn(),
    getFCMToken: jest.fn(),
    saveToken: jest.fn(),
    removeToken: jest.fn(),
    removeAllTokens: jest.fn(),
    onTokenRefresh: jest.fn(() => jest.fn()),
  },
}));

describe('useNotifications', () => {
  const mockUserId = 'test-user-123';
  const mockToken = 'mock-fcm-token-abc123xyz';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset AsyncStorage mocks to default behavior
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('should initialize with null permission and token', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permissionStatus).toBeNull();
    expect(result.current.fcmToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  describe('requestPermission', () => {
    it('should request permission and update state', async () => {
      (notificationService.requestPermission as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() => useNotifications());

      let permissionGranted: boolean = false;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(true);
      expect(result.current.permissionStatus).toBe('granted');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle permission denial', async () => {
      (notificationService.requestPermission as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useNotifications());

      let permissionGranted: boolean = false;
      await act(async () => {
        permissionGranted = await result.current.requestPermission();
      });

      expect(permissionGranted).toBe(false);
      expect(result.current.permissionStatus).toBe('denied');
    });
  });

  describe('registerForPushNotifications', () => {
    it('should register device and save token', async () => {
      (notificationService.requestPermission as jest.Mock).mockResolvedValue(true);
      (notificationService.getFCMToken as jest.Mock).mockResolvedValue(mockToken);
      (notificationService.saveToken as jest.Mock).mockResolvedValue(undefined);
      (notificationService.onTokenRefresh as jest.Mock).mockReturnValue(jest.fn());

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      await waitFor(() => {
        expect(result.current.fcmToken).toBe(mockToken);
        expect(result.current.permissionStatus).toBe('granted');
      });

      expect(notificationService.getFCMToken).toHaveBeenCalled();
      expect(notificationService.saveToken).toHaveBeenCalledWith(mockUserId, mockToken);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@current_fcm_token', mockToken);
    });

    it('should not save token if permission denied', async () => {
      (notificationService.requestPermission as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      expect(notificationService.getFCMToken).not.toHaveBeenCalled();
      expect(notificationService.saveToken).not.toHaveBeenCalled();
    });

    it('should handle missing token gracefully', async () => {
      (notificationService.requestPermission as jest.Mock).mockResolvedValue(true);
      (notificationService.getFCMToken as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      expect(notificationService.saveToken).not.toHaveBeenCalled();
    });
  });

  describe('unregisterPushNotifications', () => {
    it('should remove only current device token from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockToken);
      (notificationService.removeToken as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.unregisterPushNotifications(mockUserId);
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@current_fcm_token');
      expect(notificationService.removeToken).toHaveBeenCalledWith(mockUserId, mockToken);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@current_fcm_token');
      expect(result.current.fcmToken).toBeNull();
    });

    it('should fallback to in-memory token if AsyncStorage unavailable', async () => {
      // First register to set fcmToken
      (notificationService.requestPermission as jest.Mock).mockResolvedValue(true);
      (notificationService.getFCMToken as jest.Mock).mockResolvedValue(mockToken);
      (notificationService.saveToken as jest.Mock).mockResolvedValue(undefined);
      (notificationService.onTokenRefresh as jest.Mock).mockReturnValue(jest.fn());

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      // Now unregister with AsyncStorage returning null
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (notificationService.removeToken as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.unregisterPushNotifications(mockUserId);
      });

      expect(notificationService.removeToken).toHaveBeenCalledWith(mockUserId, mockToken);
      expect(result.current.fcmToken).toBeNull();
    });
  });
});
