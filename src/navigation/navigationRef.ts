/**
 * Navigation Reference for use outside React components
 * 
 * Allows notification handlers, deep links, and other non-component code
 * to trigger navigation. Must be passed to <NavigationContainer ref={...}>.
 * 
 * Usage:
 *   import { navigationRef } from '../navigation/navigationRef';
 *   if (navigationRef.isReady()) {
 *     navigationRef.navigate('ChatThread', { connectionId: '...' });
 *   }
 */

import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  Auth: undefined;
  Landing: undefined;
  MainApp: {
    screen?: string;
    params?: Record<string, unknown>;
  } | undefined;
  ChatThread: { connectionId: string };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen, with a safety check for readiness.
 * Use this from notification handlers or other non-component code.
 */
export function navigateFromNotification(
  screen: keyof RootStackParamList,
  params?: RootStackParamList[keyof RootStackParamList]
): void {
  if (navigationRef.isReady()) {
    // @ts-ignore - dynamic navigation call
    navigationRef.navigate(screen, params);
  } else {
    console.warn('Navigation not ready, cannot navigate to:', screen);
  }
}
