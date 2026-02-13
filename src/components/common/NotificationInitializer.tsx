import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * NotificationInitializer Component
 * 
 * Handles automatic push notification registration when user signs in.
 * Manages token lifecycle in sync with authentication state.
 * 
 * Flow:
 * 1. User signs in → registerForPushNotifications(userId)
 * 2. Token saved to Firestore users/{uid}.fcmTokens array
 * 3. User signs out → unregisterPushNotifications(userId)
 * 4. Token removed from Firestore
 */
export function NotificationInitializer() {
  const { user, status } = useAuth();
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

  // Cleanup on unmount (when user signs out)
  useEffect(() => {
    return () => {
      if (user?.uid) {
        // Attempt to unregister on component unmount (sign out)
        // This is a best-effort cleanup - actual cleanup happens in AuthContext.signOut
        unregisterPushNotifications(user.uid).catch(error => {
          console.error('Failed to unregister push notifications on unmount:', error);
        });
      }
    };
  }, [user?.uid, unregisterPushNotifications]);

  // This component doesn't render anything
  return null;
}
