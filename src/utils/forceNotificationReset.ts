/**
 * Force refresh push notification tokens
 * 
 * Use this when notifications stop working to:
 * 1. Clear ALL tokens from Firestore (removes stale tokens from other devices)
 * 2. Get a fresh token from the current device
 * 3. Save the new token to Firestore
 * 
 * This is useful for debugging when:
 * - Notifications worked before but stopped
 * - Token in Firestore is from a different device/platform
 * - You've switched between devices or reinstalled the app
 */

import { notificationService } from '../services/notification/NotificationService';

export async function forceNotificationReset(userId: string): Promise<{
  success: boolean;
  message: string;
  newToken?: string;
}> {
  console.log('🔄 === FORCE NOTIFICATION RESET ===');
  console.log('User ID:', userId);
  
  try {
    // Step 1: Remove ALL tokens from Firestore
    console.log('🗑️ Step 1: Removing all existing tokens...');
    await notificationService.removeAllTokens(userId);
    console.log('✅ All tokens removed');
    
    // Step 2: Request fresh permissions
    console.log('🔐 Step 2: Requesting notification permissions...');
    const permissionGranted = await notificationService.requestPermission();
    
    if (!permissionGranted) {
      return {
        success: false,
        message: 'Notification permission denied. Please enable in device settings.',
      };
    }
    console.log('✅ Permission granted');
    
    // Step 3: Get new device token
    console.log('🔑 Step 3: Getting fresh device token...');
    const newToken = await notificationService.getFCMToken();
    
    if (!newToken) {
      return {
        success: false,
        message: 'Failed to get device token. Make sure you\'re on a physical device.',
      };
    }
    console.log('✅ New token obtained:', `${newToken.substring(0, 30)}...${newToken.substring(newToken.length - 10)}`);
    
    // Step 4: Save new token to Firestore
    console.log('💾 Step 4: Saving new token to Firestore...');
    await notificationService.saveToken(userId, newToken);
    console.log('✅ Token saved successfully');
    
    console.log('🎉 === RESET COMPLETE ===');
    
    return {
      success: true,
      message: 'Notifications reset successfully! New token registered.',
      newToken,
    };
    
  } catch (error) {
    console.error('❌ Force notification reset failed:', error);
    return {
      success: false,
      message: `Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
