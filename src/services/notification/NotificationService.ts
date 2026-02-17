import { Platform } from 'react-native';
import { getFirestore, doc, updateDoc, arrayRemove } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
// Platform-specific import: messaging.native.ts on iOS/Android, messaging.ts on web
// Metro bundler automatically picks the right one based on platform
import messaging from './messaging';

/**
 * NotificationService - Push notification service
 * 
 * Uses @react-native-firebase/messaging for FCM token management:
 * - Android: FCM device registration token (native)
 * - iOS: APNs → FCM token mapping handled natively by Firebase iOS SDK
 *   (no deprecated IID batchImport API needed)
 * 
 * Uses expo-notifications for:
 * - Permission handling and notification channels (Android)
 * - Badge management
 * - Notification listeners and deep linking
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
   * iOS: Shows system permission dialog via @react-native-firebase/messaging
   * Android: Auto-granted on <API 33, runtime permission on API 33+
   * Web: Returns false (not supported)
   * 
   * Android 13+: Must create a notification channel BEFORE requesting permission
   * for the system prompt to appear.
   * 
   * Strategy: Try RNFB messaging first, fall back to expo-notifications if needed.
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

      // iOS: Use RNFB messaging for permission (handles APNs registration natively)
      // Android: RNFB requestPermission() does NOT trigger the Android 13+ POST_NOTIFICATIONS
      //          runtime permission dialog — it only checks FCM-level auth (always AUTHORIZED).
      //          We MUST use expo-notifications requestPermissionsAsync() on Android.
      if (Platform.OS === 'ios' && messaging) {
        try {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (enabled) {
            return true;
          }
          console.warn(`⚠️ iOS: RNFB permission status: ${authStatus}`);
          return false;
        } catch (rnfbError) {
          console.error('❌ iOS: RNFB requestPermission failed, trying expo-notifications fallback:', rnfbError);
        }
      }

      // Android (and iOS fallback): Use expo-notifications for runtime permission dialog
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        return true;
      }

      console.warn('⚠️ Push notification permission denied by user');
      return false;
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
   * Get the FCM device token for this device
   * 
   * Strategy: Try @react-native-firebase/messaging first, fall back to
   * expo-notifications on Android if RNFB fails.
   * 
   * - Android: Both RNFB messaging().getToken() and expo-notifications
   *   getDevicePushTokenAsync() return FCM registration tokens directly.
   * - iOS: RNFB handles APNs→FCM mapping natively via Firebase iOS SDK.
   * 
   * Requires notification permissions to be granted first.
   * 
   * @returns Promise<string | null> - FCM token or null if unavailable
   */
  async getFCMToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    if (!Device.isDevice) {
      console.warn('⚠️ Push tokens require a physical device');
      return null;
    }

    // Try RNFB messaging first (works on both platforms, handles APNs→FCM on iOS)
    if (messaging) {
      try {
        const token = await messaging().getToken();
        if (token) {
          return token;
        }
        console.warn('⚠️ RNFB messaging().getToken() returned null/empty');
      } catch (error) {
        console.error('❌ RNFB messaging().getToken() failed:', error);
        if (error instanceof Error) {
          console.error('RNFB error details:', error.message);
        }
      }
    }

    // Fallback for Android: use expo-notifications getDevicePushTokenAsync()
    // This returns a native FCM token on Android (same format as RNFB)
    if (Platform.OS === 'android') {
      try {
        const tokenData = await Notifications.getDevicePushTokenAsync();
        const token = typeof tokenData.data === 'string' ? tokenData.data : String(tokenData.data);
        if (token) {
          return token;
        }
      } catch (fallbackError) {
        console.error('❌ Fallback getDevicePushTokenAsync() also failed:', fallbackError);
      }
    }

    console.warn('⚠️ FCM token is null — may need permissions or physical device');
    return null;
  }

  /**
   * Save FCM token to Firestore user document
   * REPLACES all existing tokens with the new one to prevent stale token accumulation.
   * Each device/app instance should have exactly one active token.
   * Also stores platform info to identify tokens later.
   * 
   * @param userId - Firestore user ID
   * @param token - FCM device registration token
   */
  async saveToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      // REPLACE all tokens with current one — prevents stale token accumulation
      // Old approach used arrayUnion which caused "1/2 succeeded" failures
      // because stale tokens from old builds/environments accumulated
      await updateDoc(userRef, {
        fcmTokens: [token],
        lastTokenPlatform: Platform.OS,
        lastTokenRegistered: new Date().toISOString(),
      });
    } catch (error) {
      console.error('❌ Error saving FCM token to Firestore:', error);
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
   * Remove FCM token from Firestore user document
   * Called on sign-out or when token is invalidated
   * 
   * @param userId - Firestore user ID
   * @param token - FCM device registration token to remove
   */
  async removeToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(token),
      });
    } catch (error) {
      console.error('Error removing FCM token:', error);
      // Don't throw - sign-out should continue even if token cleanup fails
    }
  }

  /**
   * Remove all FCM tokens for a user
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
      console.error('❌ Error removing all FCM tokens:', error);
      // Don't throw - sign-out should continue even if token cleanup fails
    }
  }

  /**
   * Listen for FCM token refresh events
   * Uses @react-native-firebase/messaging.onTokenRefresh() which provides
   * proper FCM tokens directly (no APNs→FCM conversion needed on refresh).
   * 
   * @param userId - Firestore user ID
   * @param callback - Function to call when token is refreshed
   * @returns Unsubscribe function
   */
  onTokenRefresh(userId: string, callback: (token: string) => void): () => void {
    if (Platform.OS === 'web' || !messaging) {
      return () => {}; // No-op on web
    }

    // messaging().onTokenRefresh provides FCM tokens directly on both platforms
    // No APNs→FCM conversion needed — the SDK handles it natively
    const unsubscribe = messaging().onTokenRefresh(async (token: string) => {
      try {
        await this.saveToken(userId, token);
        callback(token);
      } catch (error) {
        console.error('Error saving refreshed FCM token:', error);
      }
    });

    return unsubscribe;
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
   * Delete FCM token (revoke on server)
   * Call this when user explicitly disables notifications
   */
  async deleteToken(): Promise<void> {
    if (Platform.OS === 'web' || !messaging) {
      return;
    }

    try {
      await messaging().deleteToken();
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
