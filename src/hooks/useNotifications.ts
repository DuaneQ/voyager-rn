import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
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
 * Hook for managing push notifications
 * Handles permissions, token registration, and notification listeners
 * 
 * Uses @react-native-firebase/messaging for FCM token management (via NotificationService).
 * Uses expo-notifications for notification channels, badge, and listeners.
 */

/**
 * Handle deep linking from notification data payload.
 * Maps cloud function notification types to navigation screens.
 */
function handleNotificationNavigation(data: Record<string, unknown> | undefined): void {
  if (!data?.type) {
    return;
  }

  const type = data.type as string;

  switch (type) {
    case 'new_match':
    case 'new_message': {
      const connectionId = data.connectionId as string | undefined;
      if (connectionId) {
        navigateFromNotification('ChatThread', { connectionId });
      } else {
        console.warn(`Missing connectionId for ${type} notification`);
      }
      break;
    }
    case 'video_comment': {
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
   * Save notification registration diagnostics to Firestore
   * Allows remote debugging of silent registration failures
   */
  const saveDiagnostics = async (userId: string, diagnostics: Record<string, unknown>) => {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        notificationDiagnostics: diagnostics,
      });
    } catch {
      // Silently fail - diagnostics should never break the app
    }
  };

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
  const registerForPushNotifications = useCallback(async (userId: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return;
    }

    setIsLoading(true);
    const diagnostics: Record<string, unknown> = {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
      step: 'started',
    };

    try {
      // Request permission
      diagnostics.step = 'requesting_permission';
      const granted = await notificationService.requestPermission();
      diagnostics.permissionGranted = granted;
      setPermissionStatus(granted ? 'granted' : 'denied');

      if (!granted) {
        diagnostics.step = 'permission_denied';
        console.warn('Push notification permission not granted');
        // Save diagnostics even on failure so we can debug remotely
        await saveDiagnostics(userId, diagnostics);
        return;
      }

      // Get device push token (FCM on Android, APNs on iOS)
      diagnostics.step = 'getting_token';
      const token = await notificationService.getFCMToken();
      diagnostics.tokenReceived = !!token;
      diagnostics.tokenLength = token?.length ?? 0;

      if (!token) {
        diagnostics.step = 'token_null';
        console.warn('🔔 Failed to get device push token');
        await saveDiagnostics(userId, diagnostics);
        return;
      }

      setFcmToken(token);

      // Save token to Firestore
      diagnostics.step = 'saving_token';
      await notificationService.saveToken(userId, token);
      
      // Store token locally for device-specific cleanup on sign-out
      await AsyncStorage.setItem(CURRENT_DEVICE_TOKEN_KEY, token);
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

      diagnostics.step = 'completed';
      await saveDiagnostics(userId, diagnostics);
    } catch (error) {
      diagnostics.step = 'error';
      diagnostics.error = error instanceof Error ? error.message : String(error);
      console.error('Error registering for push notifications:', error);
      // Try to save diagnostics even on error
      try {
        await saveDiagnostics(userId, diagnostics);
      } catch {
        // Ignore diagnostics save failure
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Unregister device from push notifications
   * Removes ONLY current device's token from Firestore
   * This ensures other devices remain registered for notifications
   * Web: No-op (returns immediately)
   */
  const unregisterPushNotifications = useCallback(async (userId: string): Promise<void> => {
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
  }, [fcmToken]);

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
        });
        // Could trigger in-app UI updates here (e.g., update chat badge, show toast)
      }
    );

    // Listen for notification interactions (taps)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
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
