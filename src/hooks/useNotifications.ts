import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notification/NotificationService';

/**
 * Configure default notification behavior
 * Shows alerts, plays sound, and sets badge when notification arrives
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface UseNotificationsReturn {
  permissionStatus: 'granted' | 'denied' | 'undetermined' | null;
  expoPushToken: string | null;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  registerForPushNotifications: (userId: string) => Promise<void>;
  unregisterPushNotifications: (userId: string) => Promise<void>;
}

/**
 * Hook for managing push notifications
 * Handles permissions, token registration, and notification listeners
 */
export function useNotifications(): UseNotificationsReturn {
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined' | null>(null);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

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
   * Gets token and saves to Firestore
   */
  const registerForPushNotifications = async (userId: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Check/request permission first
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== 'granted') {
        console.warn('Push notification permission not granted');
        return;
      }

      // Get push token
      const token = await notificationService.getExpoPushToken();
      if (!token) {
        console.warn('Failed to get push token');
        return;
      }

      setExpoPushToken(token);

      // Save token to Firestore
      await notificationService.saveToken(userId, token);

      // Create Android notification channels
      await notificationService.createNotificationChannels();

      console.log('Push notifications registered successfully');
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Unregister device from push notifications
   * Removes token from Firestore
   */
  const unregisterPushNotifications = async (userId: string): Promise<void> => {
    try {
      if (expoPushToken) {
        await notificationService.removeToken(userId, expoPushToken);
      } else {
        // Fallback: remove all tokens if we don't have the specific token
        await notificationService.removeAllTokens(userId);
      }
      setExpoPushToken(null);
      console.log('Push notifications unregistered');
    } catch (error) {
      console.error('Error unregistering push notifications:', error);
    }
  };

  /**
   * Set up notification listeners
   * Listens for foreground notifications and notification taps
   */
  useEffect(() => {
    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
      
      // Could trigger in-app UI updates here (e.g., update chat badge, show toast)
      // For now, just log it - system will show notification banner
    });

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);

      // TODO: Handle deep linking based on notification type
      // Example: response.notification.request.content.data.type === 'chat'
      // Navigate to chat screen with response.notification.request.content.data.connectionId
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return {
    permissionStatus,
    expoPushToken,
    isLoading,
    requestPermission,
    registerForPushNotifications,
    unregisterPushNotifications,
  };
}
