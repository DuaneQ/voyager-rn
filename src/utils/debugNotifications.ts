/**
 * Debug utility for troubleshooting push notifications
 * 
 * Usage: Import and call debugNotificationSetup() from a screen or component
 * when testing push notifications to see detailed diagnostic info.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const CURRENT_DEVICE_TOKEN_KEY = '@current_fcm_token';

export async function debugNotificationSetup(userId: string): Promise<void> {
  console.log('\n🔍 === NOTIFICATION DEBUG INFO ===');
  
  // Platform info
  console.log('📱 Platform:', Platform.OS);
  console.log('📱 Is Physical Device:', Device.isDevice);
  
  // Permission status
  const { status } = await Notifications.getPermissionsAsync();
  console.log('🔐 Permission Status:', status);
  
  // Local token
  const localToken = await AsyncStorage.getItem(CURRENT_DEVICE_TOKEN_KEY);
  console.log('💾 Local Token (AsyncStorage):', localToken ? 
    `${localToken.substring(0, 30)}...${localToken.substring(localToken.length - 10)}` : 
    'NONE'
  );
  
  // Firestore tokens
  try {
    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    const firestoreTokens = userData?.fcmTokens || [];
    
    console.log('☁️ Firestore Tokens Count:', firestoreTokens.length);
    firestoreTokens.forEach((token: string, index: number) => {
      console.log(`   Token ${index + 1}:`, 
        `${token.substring(0, 30)}...${token.substring(token.length - 10)}`
      );
    });
    
    // Check if local token is in Firestore
    if (localToken) {
      const isRegistered = firestoreTokens.includes(localToken);
      console.log('✅ Local token registered in Firestore:', isRegistered);
      if (!isRegistered) {
        console.warn('⚠️ WARNING: Local token NOT found in Firestore! Re-registration needed.');
      }
    }
  } catch (error) {
    console.error('❌ Error fetching Firestore tokens:', error);
  }
  
  // Notification channels (Android only)
  if (Platform.OS === 'android') {
    try {
      const channels = await Notifications.getNotificationChannelsAsync();
      console.log('📢 Android Notification Channels:', channels.length);
      channels.forEach((channel: any) => {
        console.log(`   - ${channel.id}: ${channel.name} (importance: ${channel.importance})`);
      });
    } catch (error) {
      console.error('❌ Error fetching notification channels:', error);
    }
  }
  
  // Check notification handler
  console.log('🔔 Notification Handler:', 
    Platform.OS !== 'web' ? 'Should be set up in App.tsx' : 'N/A (web)'
  );
  
  console.log('=== END DEBUG INFO ===\n');
}

/**
 * Test sending a local notification to verify display works
 */
export async function testLocalNotification(): Promise<void> {
  if (Platform.OS === 'web') {
    console.log('⚠️ Local notifications not supported on web');
    return;
  }
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification 📬',
        body: 'This is a local test notification',
        data: { type: 'test' },
      },
      trigger: null, // Show immediately
    });
    console.log('✅ Local test notification scheduled');
  } catch (error) {
    console.error('❌ Error scheduling test notification:', error);
  }
}
