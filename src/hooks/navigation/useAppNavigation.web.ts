/**
 * Web Navigation Hook
 * 
 * Uses React Router under the hood.
 * This file is automatically selected by Metro/Webpack bundler for web platform
 * via the .web.ts extension.
 * 
 * S.O.L.I.D. Implementation:
 * - Implements AppNavigation interface (Dependency Inversion)
 * - Can be swapped with native implementation (Liskov Substitution)
 */

import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppRoute, RouteParams, WEB_ROUTES, UseAppNavigationReturn } from './types';

/**
 * Navigation hook for web platform
 * Uses React Router's useNavigate hook internally
 */
export const useAppNavigation = (): UseAppNavigationReturn => {
  const routerNavigate = useNavigate();
  const location = useLocation();

  const navigate = useCallback(<T extends AppRoute>(
    route: T, 
    params?: RouteParams[T]
  ) => {
    let path = WEB_ROUTES[route];
    
    // Handle ChatThread with connectionId parameter
    if (route === 'ChatThread' && params && 'connectionId' in params) {
      path = `/chat/${params.connectionId}`;
    }
    
    // Handle MainApp nested navigation
    if (route === 'MainApp' && params && 'screen' in params) {
      const screenRoutes: Record<string, string> = {
        Search: '/app/search',
        Videos: '/app/videos',
        Chat: '/app/chat',
        Profile: '/app/profile',
      };
      path = screenRoutes[params.screen || 'Search'] || '/app/search';
    }
    
    // Handle Profile with query params
    if (route === 'Profile' && params) {
      const queryParams = new URLSearchParams();
      if ('openEditModal' in params && params.openEditModal) {
        queryParams.set('edit', 'true');
      }
      if ('incompleteProfile' in params && params.incompleteProfile) {
        queryParams.set('incomplete', 'true');
      }
      const queryString = queryParams.toString();
      if (queryString) {
        path = `${path}?${queryString}`;
      }
    }
    
    routerNavigate(path);
  }, [routerNavigate]);

  const goBack = useCallback(() => {
    routerNavigate(-1);
  }, [routerNavigate]);

  const reset = useCallback((route: AppRoute) => {
    // On web, replace current history entry to prevent back navigation
    routerNavigate(WEB_ROUTES[route], { replace: true });
  }, [routerNavigate]);

  const canGoBack = useCallback(() => {
    // On web, we can check if there's history to go back to
    // This is a simplification - in practice, window.history.length > 1
    // but that includes external sites, so we use a heuristic
    return location.key !== 'default';
  }, [location]);

  return {
    navigate,
    goBack,
    reset,
    canGoBack,
  };
};

export default useAppNavigation;
