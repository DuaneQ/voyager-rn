/**
 * Navigation Abstraction Types
 * 
 * Platform-agnostic navigation interface following S.O.L.I.D. principles:
 * - D: Dependency Inversion - Components depend on this abstraction, not React Navigation or React Router
 * - L: Liskov Substitution - Web and native implementations are interchangeable
 * - I: Interface Segregation - Small, focused interface with only essential methods
 */

/**
 * Route names used throughout the app
 * Must be kept in sync between native (AppNavigator.tsx) and web (AppNavigator.web.tsx)
 */
export type AppRoute = 
  | 'Landing'
  | 'Auth'
  | 'Search'
  | 'Videos'
  | 'Chat'
  | 'Profile'
  | 'ChatThread'
  | 'MainApp';

/**
 * Route parameters for screens that accept them
 */
export interface RouteParams {
  Landing: undefined;
  Auth: undefined;
  Search: undefined;
  Videos: undefined;
  Chat: undefined;
  Profile: { 
    openEditModal?: boolean;
    incompleteProfile?: boolean;
    missingFields?: string[];
  };
  ChatThread: { 
    connectionId: string;
  };
  MainApp: {
    screen?: 'Search' | 'Videos' | 'Chat' | 'Profile';
    params?: object;
  };
}

/**
 * Web URL paths mapped to route names
 * Used by useAppNavigation.web.ts to convert route names to URLs
 */
export const WEB_ROUTES: Record<AppRoute, string> = {
  Landing: '/',
  Auth: '/auth',
  Search: '/app/search',
  Videos: '/app/videos',
  Chat: '/app/chat',
  Profile: '/app/profile',
  ChatThread: '/chat', // Will append /:connectionId
  MainApp: '/app',
};

/**
 * Platform-agnostic navigation interface
 * Components use this interface - they don't know which library implements it
 */
export interface AppNavigation {
  /**
   * Navigate to a screen
   * @param route - The route name to navigate to
   * @param params - Optional parameters for the route
   */
  navigate: <T extends AppRoute>(route: T, params?: RouteParams[T]) => void;
  
  /**
   * Go back to the previous screen
   */
  goBack: () => void;
  
  /**
   * Reset navigation state and navigate to a screen
   * Useful for post-login redirects where you don't want back navigation
   * @param route - The route name to reset to
   */
  reset: (route: AppRoute) => void;
  
  /**
   * Check if navigation can go back
   * @returns true if there's a screen to go back to
   */
  canGoBack: () => boolean;
}

/**
 * Hook return type for useAppNavigation
 */
export type UseAppNavigationReturn = AppNavigation;
