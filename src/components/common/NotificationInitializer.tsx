import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';

/**
 * NotificationInitializer Component
 * 
 * Handles automatic push notification registration when user signs in.
 * Manages token lifecycle in sync with authentication state.
 * 
 * NOTE: Push notifications are only supported on iOS and Android.
 * Web platform is explicitly excluded as expo-notifications is not web-compatible.
 * 
 * Flow:
 * 1. User signs in → registerForPushNotifications(userId)
 * 2. Token saved to Firestore users/{uid}.fcmTokens array
 * 3. User signs out → unregisterPushNotifications(userId)
 * 4. Token removed from Firestore
 */
export function NotificationInitializer() {
  // Skip push notifications entirely on web platform
  // Don't even import the hook to avoid module loading issues
  if (Platform.OS === 'web') {
    return null;
  }

  // Only import and use notifications on mobile platforms
  // This is a non-standard pattern but necessary for web compatibility
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { useNotifications } = require('../../hooks/useNotifications');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { user, status } = useAuth();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { registerForPushNotifications, unregisterPushNotifications } = useNotifications();

  useEffect(() => {
    // Only proceed if auth has finished initializing
    if (status === 'loading' || status === 'idle') {
      return;
    }

    // Register for push notifications when user signs in
    if (user?.uid && user.emailVerified) {
      console.log('User authenticated, registering for push notifications...');
      registerForPushNotifications(user.uid).catch(error => {
        console.error('Failed to register for push notifications:', error);
        // Don't block app startup on push notification failures
      });
    }
  }, [user?.uid, user?.emailVerified, status, registerForPushNotifications]);

  // This component doesn't render anything; cleanup of push tokens on sign-out
  // is handled explicitly in AuthContext.signOut to avoid affecting other devices.

  // This component doesn't render anything
  return null;
}
