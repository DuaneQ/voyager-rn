import { Platform } from 'react-native';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Conditionally import Firebase Messaging only on mobile platforms
let messaging: any = null;
let NotificationsExpo: any = null; // Keep for badge count on iOS

if (Platform.OS !== 'web') {
  const firebaseMessaging = require('@react-native-firebase/messaging');
  messaging = firebaseMessaging.default;
  
  // Keep expo-notifications for badge management (optional)
  try {
    NotificationsExpo = require('expo-notifications');
  } catch {
    // Expo notifications optional - only for badge count
  }
}

/**
 * NotificationService - FCM-based push notification service
 * Uses Firebase Cloud Messaging directly for proper FCM token compatibility
 * 
 * Token Format: FCM device registration tokens (long alphanumeric strings)
 * Backend: Firebase Admin SDK messaging().send() - compatible with these tokens
 * 
 * NOTE: Push notifications are only supported on iOS and Android physical devices.
 * iOS Simulator does NOT support push notifications.
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
   * Android: Permissions granted by default on <API 33, requires runtime permission on API 33+
   * Web: Returns false (not supported)
   * 
   * @returns Promise<boolean> - true if permission granted, false otherwise
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web platform');
      return false;
    }

    if (!messaging) {
      console.error('Firebase Messaging not initialized');
      return false;
    }

    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('Push notification permission denied');
        return false;
      }

      console.log('Push notification permission granted');
      return true;
    } catch (error) {
      console.error('Error requesting push notification permission:', error);
      return false;
    }
  }

  /**
   * Get the FCM device token for this device
   * Returns FCM registration token compatible with Firebase Admin SDK
   * Requires notification permissions to be granted first
   * 
   * @returns Promise<string | null> - FCM token or null if unavailable
   */
  async getFCMToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    if (!messaging) {
      console.error('Firebase Messaging not initialized');
      return null;
    }

    try {
      // Get FCM token - this is the token Firebase Admin SDK expects
      const token = await messaging().getToken();
      
      if (!token) {
        console.warn('FCM token is null - may need permissions or physical device');
        return null;
      }

      console.log('FCM token obtained:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to Firestore user document
   * Adds token to fcmTokens array field (idempotent - won't add duplicates)
   * 
   * @param userId - Firestore user ID
   * @param token - FCM device registration token
   */
  async saveToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });
      console.log('FCM token saved to Firestore');
    } catch (error) {
      console.error('Error saving FCM token:', error);
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
      console.log('FCM token removed from Firestore');
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
      });
      console.log('All FCM tokens removed from Firestore');
    } catch (error) {
      console.error('Error removing all FCM tokens:', error);
      // Don't throw - sign-out should continue even if token cleanup fails
    }
  }

  /**
   * Listen for FCM token refresh events
   * Tokens can be refreshed by the system, so we need to update Firestore
   * 
   * @param userId - Firestore user ID
   * @param callback - Function to call when token is refreshed
   * @returns Unsubscribe function
   */
  onTokenRefresh(userId: string, callback: (token: string) => void): () => void {
    if (Platform.OS === 'web' || !messaging) {
      return () => {}; // No-op on web
    }

    const unsubscribe = messaging().onTokenRefresh(async (token: string) => {
      console.log('FCM token refreshed:', token.substring(0, 20) + '...');
      
      // Save new token to Firestore
      try {
        await this.saveToken(userId, token);
        callback(token);
      } catch (error) {
        console.error('Error saving refreshed token:', error);
      }
    });

    return unsubscribe;
  }

  /**
   * Set iOS badge count
   * Call with 0 to clear badge
   * 
   * @param count - Badge number to display
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      // Try using expo-notifications for badge (if available)
      if (NotificationsExpo) {
        await NotificationsExpo.setBadgeCountAsync(count);
      } else {
        // Fallback: Use messaging badge (requires additional setup)
        console.warn('Badge count requires expo-notifications or additional setup');
      }
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear iOS badge count
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
      console.log('FCM token deleted');
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
