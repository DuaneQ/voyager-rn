import { Platform } from 'react-native';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

/**
 * NotificationService - Push notification service using expo-notifications
 * 
 * Uses expo-notifications to get native push tokens:
 * - Android: FCM device registration token (compatible with Firebase Admin SDK)
 * - iOS: APNs device token → converted to FCM token via registerAPNsToken cloud function
 * 
 * Token Storage: Firestore users/{uid}.fcmTokens array
 * Backend: Firebase Admin SDK messaging().send() - uses FCM tokens on both platforms
 * 
 * NOTE: Push notifications require physical devices.
 * Remote push does NOT work in Expo Go (requires development build).
 */
export class NotificationService {
  private _db?: ReturnType<typeof getFirestore>;

  /**
   * Lazy-load Firestore instance to prevent initialization errors in tests
   */
  private get db() {
    if (!this._db) {
      this._db = getFirestore();
    }
    return this._db;
  }

  /**
   * Request notification permissions from the user
   * iOS: Shows system permission dialog
   * Android: Auto-granted on <API 33, runtime permission on API 33+
   * Web: Returns false (not supported)
   * 
   * Android 13+: Must create a notification channel BEFORE requesting permission
   * for the system prompt to appear.
   * 
   * @returns Promise<boolean> - true if permission granted, false otherwise
   */
  async requestPermission(): Promise<boolean> {
    console.log('🔔 NotificationService.requestPermission() called');
    
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web platform');
      return false;
    }

    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications require a physical device');
      return false;
    }

    try {
      // Android 13+: Create notification channels first (required for permission prompt)
      // Channel IDs must match what cloud functions send to: 'default', 'matches', 'chat-messages'
      if (Platform.OS === 'android') {
        await Promise.all([
          Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
          }),
          Notifications.setNotificationChannelAsync('matches', {
            name: 'Matches',
            description: 'New travel match notifications',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
          }),
          Notifications.setNotificationChannelAsync('chat-messages', {
            name: 'Messages',
            description: 'New chat message notifications',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
          }),
        ]);
      }

      console.log('📱 Requesting push notification permission...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permission denied by user');
        return false;
      }

      console.log('✅ Push notification permission granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting push notification permission:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return false;
    }
  }

  /**
   * Get the native device push token (FCM on Android, APNs on iOS)
   * Returns the token string compatible with Firebase Admin SDK
   * Requires notification permissions to be granted first
   * 
   * @returns Promise<string | null> - Device push token or null if unavailable
   */
  async getFCMToken(): Promise<string | null> {
    console.log('🔑 NotificationService.getFCMToken() called');
    
    if (Platform.OS === 'web') {
      console.log('⚠️ Skipping push token on web platform');
      return null;
    }

    if (!Device.isDevice) {
      console.warn('⚠️ Push tokens require a physical device');
      return null;
    }

    try {
      console.log('📱 Requesting device push token...');
      // getDevicePushTokenAsync returns native FCM token (Android) or APNs token (iOS)
      const tokenData = await Notifications.getDevicePushTokenAsync();
      let token = tokenData.data;
      
      if (!token) {
        console.warn('⚠️ Device push token is null');
        return null;
      }

      token = typeof token === 'string' ? token : String(token);

      // iOS: APNs token must be converted to FCM registration token
      if (Platform.OS === 'ios') {
        console.log('🍎 iOS detected — converting APNs token to FCM token...');
        const fcmToken = await this.convertAPNsToFCM(token);
        if (!fcmToken) {
          console.error('❌ Failed to convert APNs token to FCM token');
          return null;
        }
        console.log('✅ FCM token obtained from APNs conversion:', 
          fcmToken.substring(0, 30) + '...' + fcmToken.substring(fcmToken.length - 10)
        );
        return fcmToken;
      }

      console.log('✅ Device push token obtained:', 
        token.substring(0, 30) + '...' + token.substring(token.length - 10)
      );
      return token;
    } catch (error) {
      console.error('❌ Error getting device push token:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      return null;
    }
  }

  /**
   * Convert an iOS APNs device token to an FCM registration token
   * via the registerAPNsToken cloud function.
   * 
   * @param apnsToken - Raw APNs device token (hex string)
   * @returns FCM registration token or null on failure
   */
  private async convertAPNsToFCM(apnsToken: string): Promise<string | null> {
    try {
      const functions = getFunctions();
      const registerFn = httpsCallable<
        { apnsToken: string; sandbox: boolean },
        { fcmToken: string }
      >(functions, 'registerAPNsToken');

      const result = await registerFn({
        apnsToken,
        sandbox: __DEV__,
      });

      return result.data.fcmToken || null;
    } catch (error) {
      console.error('❌ APNs → FCM conversion failed:', error);
      return null;
    }
  }

  /**
   * Save push token to Firestore user document
   * Adds token to fcmTokens array field (idempotent - won't add duplicates)
   * 
   * @param userId - Firestore user ID
   * @param token - Device push token
   */
  async saveToken(userId: string, token: string): Promise<void> {
    console.log('💾 NotificationService.saveToken() called', {
      userId,
      tokenPreview: token.substring(0, 30) + '...' + token.substring(token.length - 10)
    });
    try {
      const userRef = doc(this.db, 'users', userId);
      console.log('📝 Saving push token to Firestore users/' + userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });
      console.log('✅ Push token saved to Firestore successfully');
    } catch (error) {
      console.error('❌ Error saving push token to Firestore:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  /**
   * Remove push token from Firestore user document
   * Called on sign-out or when token is invalidated
   * 
   * @param userId - Firestore user ID
   * @param token - Device push token to remove
   */
  async removeToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(token),
      });
      console.log('Push token removed from Firestore');
    } catch (error) {
      console.error('Error removing push token:', error);
      // Don't throw - sign-out should continue even if token cleanup fails
    }
  }

  /**
   * Remove all push tokens for a user
   * Called on sign-out when we don't have the specific token
   * 
   * @param userId - Firestore user ID
   */
  async removeAllTokens(userId: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: [],
      });
      console.log('All push tokens removed from Firestore');
    } catch (error) {
      console.error('Error removing all push tokens:', error);
      // Don't throw - sign-out should continue even if token cleanup fails
    }
  }

  /**
   * Listen for push token refresh events
   * Tokens can be refreshed by the system, so we need to update Firestore
   * 
   * @param userId - Firestore user ID
   * @param callback - Function to call when token is refreshed
   * @returns Unsubscribe function
   */
  onTokenRefresh(userId: string, callback: (token: string) => void): () => void {
    if (Platform.OS === 'web') {
      return () => {}; // No-op on web
    }

    const subscription = Notifications.addPushTokenListener((tokenData) => {
      const token = typeof tokenData.data === 'string' ? tokenData.data : String(tokenData.data);
      console.log('Push token refreshed:', token.substring(0, 20) + '...');
      
      // Save new token to Firestore
      this.saveToken(userId, token)
        .then(() => callback(token))
        .catch((error) => console.error('Error saving refreshed token:', error));
    });

    return () => subscription.remove();
  }

  /**
   * Set badge count (iOS primarily, some Android launchers)
   * Call with 0 to clear badge
   * 
   * @param count - Badge number to display
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear badge count
   */
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Unregister from push notifications
   * Call this when user explicitly disables notifications
   */
  async deleteToken(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      await Notifications.unregisterForNotificationsAsync();
      console.log('Push token unregistered');
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
