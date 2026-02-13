import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for persisting current device's FCM token
const CURRENT_DEVICE_TOKEN_KEY = '@current_fcm_token';

// Conditionally import Firebase Messaging and notification service only on mobile platforms
// Web platform doesn't support push notifications and will cause import errors
let messaging: any = null;
let notificationService: any = null;

if (Platform.OS !== 'web') {
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default;
  notificationService = require('../services/notification/NotificationService').notificationService;
}

export interface UseNotificationsReturn {
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  fcmToken: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  registerForPushNotifications: (userId: string) => Promise<void>;
  unregisterPushNotifications: (userId: string) => Promise<void>;
}

/**
 * Hook for managing FCM push notifications
 * Handles permissions, token registration, and notification listeners
 * 
 * Uses Firebase Cloud Messaging directly for proper token compatibility
 * with Firebase Admin SDK backend.
 */
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
   * Gets FCM token and saves to Firestore
   * Web: No-op (returns immediately)
   */
  const registerForPushNotifications = async (userId: string): Promise<void> => {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
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

      // Get FCM token
      const token = await notificationService.getFCMToken();
      if (!token) {
        console.warn('Failed to get FCM token');
        return;
      }

      setFcmToken(token);

      // Save token to Firestore
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

      console.log('Push notifications registered successfully');
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
        console.log('Current device push notification token cleared');
      } else if (fcmToken) {
        // Fallback to in-memory token if AsyncStorage unavailable
        await notificationService.removeToken(userId, fcmToken);
        console.log('Current device push notification token cleared');
      } else {
        console.warn('No token found to remove - may have already been cleared');
      }

      // Clean up local storage
      await AsyncStorage.removeItem(CURRENT_DEVICE_TOKEN_KEY);
      setFcmToken(null);
      console.log('Push notifications unregistered for current device');
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  /**
   * Set up foreground notification listeners
   * Handles notifications when app is in foreground
   * Web: Skipped (no native notifications)
   */
  useEffect(() => {
    if (Platform.OS === 'web' || !messaging) {
      return;
    }

    // Set up foreground message handler
    const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage: any) => {
      console.log('Foreground notification received:', remoteMessage);
      
      // Firebase handles notification display automatically
      // Could trigger in-app UI updates here (e.g., update chat badge, show toast)
      // TODO: Handle in-app notification display or updates
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribeOnMessage();
    };
  }, []);

  /**
   * Handle notification opened when app launches from quit state or background
   */
  useEffect(() => {
    if (Platform.OS === 'web' || !messaging) {
      return;
    }

    // Check if app was opened from a notification (from quit state)
    messaging()
      .getInitialNotification()
      .then((remoteMessage: any) => {
        if (remoteMessage) {
          console.log('App opened from notification (quit state):', remoteMessage);
          // TODO: Handle deep linking based on notification data
          // Example: navigate to chat screen
        }
      })
      .catch((error: any) => {
        console.error('Error getting initial notification:', error);
      });

    // Listen for notification opened events (from background)
    const unsubscribeOnNotificationOpenedApp = messaging().onNotificationOpenedApp(
      (remoteMessage: any) => {
        console.log('App opened from notification (background):', remoteMessage);
        // TODO: Handle deep linking based on notification data
      }
    );

    return () => {
      unsubscribeOnNotificationOpenedApp();
    };
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
