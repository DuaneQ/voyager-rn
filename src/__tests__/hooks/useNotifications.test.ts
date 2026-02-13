/**
 * Unit tests for useNotifications hook
 * Tests state management and integration with NotificationService
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useNotifications } from '../../hooks/useNotifications';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../../services/notification/NotificationService';

// Mock expo-notifications
jest.mock('expo-notifications');

// Mock NotificationService
jest.mock('../../services/notification/NotificationService', () => ({
  notificationService: {
    requestPermission: jest.fn(),
    getExpoPushToken: jest.fn(),
    saveToken: jest.fn(),
    removeToken: jest.fn(),
    removeAllTokens: jest.fn(),
    createNotificationChannels: jest.fn(),
  },
}));

describe('useNotifications', () => {
  const mockUserId = 'test-user-123';
  const mockToken = 'ExponentPushToken[MOCK_TOKEN_123]';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'undetermined',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
  });

  it('should initialize with null permission and token', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.permissionStatus).toBeNull();
    expect(result.current.expoPushToken).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should set up notification listeners on mount', () => {
    renderHook(() => useNotifications());

    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
  });

  it('should clean up listeners on unmount', () => {
    const mockRemove = jest.fn();
    (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({
      remove: mockRemove,
    });
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue({
      remove: mockRemove,
    });

    const { unmount } = renderHook(() => useNotifications());

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(2);
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
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (notificationService.getExpoPushToken as jest.Mock).mockResolvedValue(mockToken);
      (notificationService.saveToken as jest.Mock).mockResolvedValue(undefined);
      (notificationService.createNotificationChannels as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      await waitFor(() => {
        expect(result.current.expoPushToken).toBe(mockToken);
        expect(result.current.permissionStatus).toBe('granted');
      });

      expect(notificationService.getExpoPushToken).toHaveBeenCalled();
      expect(notificationService.saveToken).toHaveBeenCalledWith(mockUserId, mockToken);
      expect(notificationService.createNotificationChannels).toHaveBeenCalled();
    });

    it('should not save token if permission denied', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      expect(notificationService.getExpoPushToken).not.toHaveBeenCalled();
      expect(notificationService.saveToken).not.toHaveBeenCalled();
    });

    it('should handle missing token gracefully', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (notificationService.getExpoPushToken as jest.Mock).mockResolvedValue(null);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      expect(notificationService.saveToken).not.toHaveBeenCalled();
    });
  });

  describe('unregisterPushNotifications', () => {
    it('should remove specific token if available', async () => {
      // First register to get a token
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (notificationService.getExpoPushToken as jest.Mock).mockResolvedValue(mockToken);
      (notificationService.removeToken as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.registerForPushNotifications(mockUserId);
      });

      await act(async () => {
        await result.current.unregisterPushNotifications(mockUserId);
      });

      expect(notificationService.removeToken).toHaveBeenCalledWith(mockUserId, mockToken);
      expect(result.current.expoPushToken).toBeNull();
    });

    it('should remove all tokens if specific token unavailable', async () => {
      (notificationService.removeAllTokens as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useNotifications());

      await act(async () => {
        await result.current.unregisterPushNotifications(mockUserId);
      });

      expect(notificationService.removeAllTokens).toHaveBeenCalledWith(mockUserId);
    });
  });
});
