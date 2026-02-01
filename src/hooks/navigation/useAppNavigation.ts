/**
 * Native Navigation Hook (iOS/Android)
 * 
 * Uses React Navigation under the hood.
 * This file is automatically selected by Metro bundler for native platforms.
 * 
 * S.O.L.I.D. Implementation:
 * - Implements AppNavigation interface (Dependency Inversion)
 * - Can be swapped with web implementation (Liskov Substitution)
 */

import { useCallback } from 'react';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { AppRoute, RouteParams, UseAppNavigationReturn } from './types';

/**
 * Navigation hook for native platforms (iOS/Android)
 * Uses React Navigation's useNavigation hook internally
 */
export const useAppNavigation = (): UseAppNavigationReturn => {
  const navigation = useNavigation<any>();

  const navigate = useCallback(<T extends AppRoute>(
    route: T, 
    params?: RouteParams[T]
  ) => {
    // Handle nested navigation for MainApp tabs
    if (route === 'MainApp' && params && 'screen' in params) {
      navigation.navigate('MainApp', {
        screen: params.screen,
        params: params.params,
      });
    } else {
      navigation.navigate(route, params);
    }
  }, [navigation]);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const reset = useCallback((route: AppRoute) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: route }],
      })
    );
  }, [navigation]);

  const canGoBack = useCallback(() => {
    return navigation.canGoBack();
  }, [navigation]);

  return {
    navigate,
    goBack,
    reset,
    canGoBack,
  };
};

export default useAppNavigation;
