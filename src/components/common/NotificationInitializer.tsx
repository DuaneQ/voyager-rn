import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * NotificationInitializer Component
 * 
 * Handles automatic push notification registration when user signs in.
 * Manages token lifecycle in sync with authentication state.
 * 
 * NOTE: Push notifications are only supported on iOS and Android.
 * Web platform uses App.web.tsx which excludes this component entirely.
 * 
 * Flow:
 * 1. User signs in → registerForPushNotifications(userId)
 * 2. Token saved to Firestore users/{uid}.fcmTokens array
 * 3. User signs out → unregisterPushNotifications(userId)
 * 4. Token removed from Firestore
 */
export function NotificationInitializer() {
  const { user, status } = useAuth();
  const { registerForPushNotifications } = useNotifications();

  useEffect(() => {
    // Only proceed if auth has finished initializing
    if (status === 'loading' || status === 'idle') {
      return;
    }

    if (!user?.uid) {
      return;
    }

    // Register for push notifications when user signs in
    registerForPushNotifications(user.uid)
      .then(() => {
        console.log('✅ Push notification registration completed successfully');
      })
      .catch(error => {
        console.error('❌ Failed to register for push notifications:', error);
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            stack: error.stack
          });
        }
        // Don't block app startup on push notification failures
      });
  }, [user?.uid, status, registerForPushNotifications]);

  // This component doesn't render anything; cleanup of push tokens on sign-out
  // is handled explicitly in AuthContext.signOut to avoid affecting other devices.

  // This component doesn't render anything
  return null;
}
