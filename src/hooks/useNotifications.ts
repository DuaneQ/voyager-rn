import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notification/NotificationService';
import { navigateFromNotification } from '../navigation/navigationRef';

// Storage key for persisting current device's push token
const CURRENT_DEVICE_TOKEN_KEY = '@current_fcm_token';

export interface UseNotificationsReturn {
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  fcmToken: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  registerForPushNotifications: (userId: string) => Promise<void>;
  unregisterPushNotifications: (userId: string) => Promise<void>;
}

/**
 * Hook for managing push notifications via expo-notifications
 * Handles permissions, token registration, and notification listeners
 * 
 * Uses expo-notifications getDevicePushTokenAsync() for native FCM/APNs tokens
 * compatible with Firebase Admin SDK backend.
 */

/**
 * Handle deep linking from notification data payload.
 * Maps cloud function notification types to navigation screens.
 */
function handleNotificationNavigation(data: Record<string, unknown> | undefined): void {
  if (!data?.type) {
    console.log('Notification has no type, skipping navigation');
    return;
  }

  const type = data.type as string;

  switch (type) {
    case 'new_match':
    case 'new_message': {
      const connectionId = data.connectionId as string | undefined;
      if (connectionId) {
        console.log(`Navigating to ChatThread for ${type}:`, connectionId);
        navigateFromNotification('ChatThread', { connectionId });
      } else {
        console.warn(`Missing connectionId for ${type} notification`);
      }
      break;
    }
    case 'video_comment': {
      console.log('Navigating to Videos tab for video_comment');
      navigateFromNotification('MainApp', { screen: 'Videos' });
      break;
    }
    default:
      console.log('Unknown notification type, skipping navigation:', type);
  }
}

export function useNotifications(): UseNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tokenRefreshUnsubscribe = useRef<(() => void) | null>(null);

  /**
   * Request notification permissions
   */
  const requestPermission = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const granted = await notificationService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      setPermissionStatus('denied');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register device for push notifications
   * Gets device push token and saves to Firestore
   * Web: No-op (returns immediately)
   */
  const registerForPushNotifications = async (userId: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    setIsLoading(true);
    try {
      // Request permission
      const granted = await notificationService.requestPermission();
      setPermissionStatus(granted ? 'granted' : 'denied');

      if (!granted) {
        console.warn('Push notification permission not granted');
        return;
      }

      // Get device push token (FCM on Android, APNs on iOS)
      const token = await notificationService.getFCMToken();
      if (!token) {
        console.warn('Failed to get device push token');
        return;
      }

      setFcmToken(token);

      // Save token to Firestore
      console.log('💾 Saving FCM token to Firestore for user:', userId);
      await notificationService.saveToken(userId, token);
      console.log('✅ FCM token saved successfully');
      
      // Store token locally for device-specific cleanup on sign-out
      await AsyncStorage.setItem(CURRENT_DEVICE_TOKEN_KEY, token);
      console.log('✅ FCM token stored in AsyncStorage');

      // Set up token refresh listener
      if (tokenRefreshUnsubscribe.current) {
        tokenRefreshUnsubscribe.current();
      }
      tokenRefreshUnsubscribe.current = notificationService.onTokenRefresh(
        userId,
        (newToken: string) => {
          setFcmToken(newToken);
        }
      );
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Unregister device from push notifications
   * Removes ONLY current device's token from Firestore
   * This ensures other devices remain registered for notifications
   * Web: No-op (returns immediately)
   */
  const unregisterPushNotifications = async (userId: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      // Clean up token refresh listener
      if (tokenRefreshUnsubscribe.current) {
        tokenRefreshUnsubscribe.current();
        tokenRefreshUnsubscribe.current = null;
      }

      // Get current device's token from AsyncStorage (most reliable source)
      const currentDeviceToken = await AsyncStorage.getItem(CURRENT_DEVICE_TOKEN_KEY);
      
      if (currentDeviceToken) {
        // Remove ONLY this device's token (preserves other devices)
        await notificationService.removeToken(userId, currentDeviceToken);
      } else if (fcmToken) {
        // Fallback to in-memory token if AsyncStorage unavailable
        await notificationService.removeToken(userId, fcmToken);
      } else {
        console.warn('No token found to remove - may have already been cleared');
      }

      // Clean up local storage
      await AsyncStorage.removeItem(CURRENT_DEVICE_TOKEN_KEY);
      setFcmToken(null);
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  /**
   * Set up notification listeners for foreground and interaction events
   * NOTE: setNotificationHandler is called at module level in App.tsx
   * (must be outside React components to catch notifications early)
   */
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    // Listen for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('🔔 Notification received in foreground:', {
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notification.request.content.data,
          identifier: notification.request.identifier,
        });
        // Could trigger in-app UI updates here (e.g., update chat badge, show toast)
      }
    );

    // Listen for notification interactions (taps)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', {
          title: response.notification.request.content.title,
          body: response.notification.request.content.body,
          data: response.notification.request.content.data,
          actionIdentifier: response.actionIdentifier,
        });
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      }
    );

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  /**
   * Handle notification that launched the app from quit state
   */
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    // Check if app was opened from a notification (from quit state)
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) {
          const data = response.notification.request.content.data;
          // Delay navigation slightly to let NavigationContainer mount
          setTimeout(() => handleNotificationNavigation(data), 500);
        }
      })
      .catch((error) => {
        console.error('Error getting initial notification:', error);
      });
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (tokenRefreshUnsubscribe.current) {
        tokenRefreshUnsubscribe.current();
      }
    };
  }, []);

  return {
    permissionStatus,
    fcmToken,
    isLoading,
    requestPermission,
    registerForPushNotifications,
    unregisterPushNotifications,
  };
}
