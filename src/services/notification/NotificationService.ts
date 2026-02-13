import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

/**
 * NotificationService - Simplified service combining business logic + data access
 * Handles push notification permissions, token registration, and Firestore operations
 */
export class NotificationService {
  private db = getFirestore();

  /**
   * Request notification permissions from the user
   * iOS: Shows system permission dialog
   * Android: Permissions granted by default on <API 33, requires runtime permission on API 33+
   */
  async requestPermission(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push notification permissions');
      return false;
    }

    return true;
  }

  /**
   * Get the Expo push token for this device
   * Requires notification permissions to be granted first
   */
  async getExpoPushToken(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn('Push tokens only work on physical devices');
      return null;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '6fc90234-4d23-427c-918f-75d141efe8ed',
      });
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Save FCM token to Firestore user document
   * Adds token to fcmTokens array field (idempotent - won't add duplicates)
   */
  async saveToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(token),
      });
      console.log('Push token saved to Firestore');
    } catch (error) {
      console.error('Error saving push token:', error);
      throw error;
    }
  }

  /**
   * Remove FCM token from Firestore user document
   * Called on sign-out or when token is invalidated
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
   * Remove all FCM tokens for a user
   * Called on sign-out when we don't have the specific token
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
   * Create Android notification channels
   * Required for Android 8+ (API 26)
   * Must be called before any notifications are sent
   */
  async createNotificationChannels(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Chat messages channel - high priority
      await Notifications.setNotificationChannelAsync('chat-messages', {
        name: 'Chat Messages',
        description: 'Notifications for new chat messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableLights: true,
        lightColor: '#FF6B35',
      });

      // Matches channel - high priority
      await Notifications.setNotificationChannelAsync('matches', {
        name: 'New Matches',
        description: 'Notifications for new travel matches',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
        enableLights: true,
        lightColor: '#FF6B35',
      });

      console.log('Android notification channels created');
    } catch (error) {
      console.error('Error creating notification channels:', error);
    }
  }

  /**
   * Set iOS badge count
   * Call with 0 to clear badge
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      await Notifications.setBadgeCountAsync(count);
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
}

// Export singleton instance
export const notificationService = new NotificationService();
