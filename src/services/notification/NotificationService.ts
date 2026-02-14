import { Platform } from 'react-native';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// Platform-specific import - messaging.native.ts on iOS/Android, messaging.ts on web
// Metro bundler automatically picks the right one
import messaging from './messaging';

// Keep expo-notifications for badge management (optional)
let NotificationsExpo: any = null;

function loadBadgeModule() {
  if (Platform.OS !== 'web' && !NotificationsExpo) {
    try {
      NotificationsExpo = require('expo-notifications');
    } catch {
      // Expo notifications optional - only for badge count
    }
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
    console.log('🔔 NotificationService.requestPermission() called');
    
    if (Platform.OS === 'web' || !messaging) {
      console.log('Push notifications not supported on web platform');
      return false;
    }

    try {
      console.log('📱 Requesting push notification permission...');
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('⚠️ Push notification permission denied by user');
        return false;
      }

      console.log('✅ Push notification permission granted', {
        status: authStatus === messaging.AuthorizationStatus.AUTHORIZED ? 'AUTHORIZED' : 'PROVISIONAL'
      });
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
   * Get the FCM device token for this device
   * Returns FCM registration token compatible with Firebase Admin SDK
   * Requires notification permissions to be granted first
   * 
   * @returns Promise<string | null> - FCM token or null if unavailable
   */
  async getFCMToken(): Promise<string | null> {
    console.log('🔑 NotificationService.getFCMToken() called');
    
    if (Platform.OS === 'web' || !messaging) {
      console.log('⚠️ Skipping FCM token on web platform');
      return null;
    }

    try {
      console.log('📱 Requesting FCM token from Firebase...');
      // Get FCM token - this is the token Firebase Admin SDK expects
      const token = await messaging().getToken();
      
      if (!token) {
        console.warn('⚠️ FCM token is null - may need permissions or physical device');
        return null;
      }

      console.log('✅ FCM token obtained:', token.substring(0, 30) + '...' + token.substring(token.length - 10));
      return token;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
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
   * Save FCM token to Firestore user document
   * Adds token to fcmTokens array field (idempotent - won't add duplicates)
   * 
   * @param userId - Firestore user ID
   * @param token - FCM device registration token
   */
  async saveToken(userId: string, token: string): Promise<void> {
    console.log('💾 NotificationService.saveToken() called', {
      userId,
      tokenPreview: token.substring(0, 30) + '...' + token.substring(token.length - 10)
    });
    try {
      const userRef = doc(this.db, 'users', userId);
      console.log('📝 Saving FCM token to Firestore users/' + userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });
      console.log('✅ FCM token saved to Firestore successfully');
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

    loadBadgeModule(); // Load expo-notifications for badge management

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
