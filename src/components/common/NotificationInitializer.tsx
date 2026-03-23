import { useEffect, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
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
 * 
 * Token refresh:
 * - Runs on sign-in AND every time the app comes back to the foreground.
 * - APNs can silently issue a new device token after OS updates, new builds,
 *   or reinstalls. Re-registering on foreground ensures Firestore always has
 *   the current token and stale tokens never block delivery.
 * - getFCMToken() is fast (cached by the SDK if unchanged); the cost when
 *   the token hasn't changed is a single Firestore updateDoc write.
 */
export function NotificationInitializer() {
  const { user, status } = useAuth();
  const { registerForPushNotifications, refreshTokenIfStale } = useNotifications();
  const appState = useRef(AppState.currentState);

  const tryRegister = (uid: string) => {
    registerForPushNotifications(uid).catch(error => {
      console.error('❌ Failed to register for push notifications:', error);
    });
  };

  // Register on sign-in / auth state resolved (full flow: permission + diagnostics)
  useEffect(() => {
    if (status === 'loading' || status === 'idle' || !user?.uid) {
      return;
    }
    tryRegister(user.uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, status]);

  // Lightweight token check on foreground — compares SDK-cached token against
  // AsyncStorage. Only writes to Firestore if the token has actually changed.
  // Firebase docs: "no benefit to doing the refresh more frequently than weekly"
  // so we avoid the 2 Firestore writes of the full registration flow here.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      const isNowActive = nextState === 'active';

      if (wasBackground && isNowActive && user?.uid) {
        refreshTokenIfStale(user.uid).catch(error => {
          console.error('❌ Failed to refresh FCM token on foreground:', error);
        });
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  return null;
}
