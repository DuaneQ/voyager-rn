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
    
    if (Platform.OS === 'web') {
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
    if (Platform.OS === 'web') {
      return null;
    }

    if (!Device.isDevice) {
      console.warn('⚠️ Push tokens require a physical device');
      return null;
    }

    try {
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
        const fcmToken = await this.convertAPNsToFCM(token);
        if (!fcmToken) {
          console.error('❌ Failed to convert APNs token to FCM token');
          return null;
        }
        return fcmToken;
      }
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
   * APNs sandbox vs production:
   * - Development builds + TestFlight → sandbox (true)
   * - App Store builds → production (false)
   * 
   * Strategy: try sandbox first, fall back to production.
   * This handles TestFlight (release build but sandbox APNs) correctly.
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

      // Try sandbox first (covers dev builds + TestFlight)
      try {
        const result = await registerFn({ apnsToken, sandbox: true });
        if (result.data.fcmToken) {
          return result.data.fcmToken;
        }
      } catch (sandboxError) {
      }

      // Fall back to production (App Store builds)
      const result = await registerFn({ apnsToken, sandbox: false });
      if (result.data.fcmToken) {
        return result.data.fcmToken;
      }

      return null;
    } catch (error) {
      console.error('❌ APNs → FCM conversion failed:', error);
      return null;
    }
  }

  /**
   * Save push token to Firestore user document
   * Adds token to fcmTokens array field (idempotent - won't add duplicates)
   * Also stores platform info to identify tokens later
   * 
   * @param userId - Firestore user ID
   * @param token - Device push token
   */
  async saveToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);      
      // Save token with platform info for debugging
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
        // Store last registered platform and timestamp for debugging
        lastTokenPlatform: Platform.OS,
        lastTokenRegistered: new Date().toISOString(),
      });
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
        lastTokenPlatform: null,
        lastTokenRegistered: null,
      });
    } catch (error) {
      console.error('❌ Error removing all push tokens:', error);
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

    const subscription = Notifications.addPushTokenListener(async (tokenData) => {
      let token = typeof tokenData.data === 'string' ? tokenData.data : String(tokenData.data);
      
      // iOS: The refreshed token is a raw APNs token — must convert to FCM
      // before saving to Firestore (same as initial registration in getFCMToken)
      if (Platform.OS === 'ios') {
        const fcmToken = await this.convertAPNsToFCM(token);
        if (!fcmToken) {
          console.error('❌ Failed to convert refreshed APNs token to FCM, skipping save');
          return;
        }
        token = fcmToken;
      }

      // Save converted (iOS) or raw (Android) token to Firestore
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
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
