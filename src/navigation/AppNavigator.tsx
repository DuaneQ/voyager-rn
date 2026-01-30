/**
 * Main App Navigation
 * Replicates the exact structure and functionality of voyager-pwa App.tsx
 * Uses React Navigation instead of React Router
 */

import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Pages - Direct imports (no expo-av dependency)
import AuthPage from '../pages/AuthPage';
import ChatPage from '../pages/ChatPage';
import LandingPage from '../pages/LandingPage.web';

// Pages with expo-av dependency - Platform-specific loading strategy
// WHY: On iOS Safari web, loading expo-av at app startup causes
// "Maximum call stack size exceeded" errors due to deprecation warning handler.
//
// WEB: Lazy load to defer expo-av until navigation (improves Lighthouse score)
// MOBILE: Direct import for best performance (Metro bundles everything anyway)
//
// Dependency chains (expo-av):
// - VideoFeedPage -> expo-av (Audio, Video directly)
// - ProfilePage -> VideoGrid -> expo-av (Video)
// - SearchPage -> ItineraryCard -> ViewProfileModal -> expo-av (Video)
// - ChatThreadScreen -> ViewProfileModal -> expo-av (Video)

// On WEB: Lazy load (code splitting + deferred initialization)
// On MOBILE: Direct import (no performance penalty from lazy loading)
const VideoFeedPage = Platform.OS === 'web'
  ? lazy(() => import('../pages/VideoFeedPage'))
  : require('../pages/VideoFeedPage').default;

const ChatThreadScreen = Platform.OS === 'web'
  ? lazy(() => import('../pages/ChatThreadScreen'))
  : require('../pages/ChatThreadScreen').default;

const ProfilePage = Platform.OS === 'web'
  ? lazy(() => import('../pages/ProfilePage'))
  : require('../pages/ProfilePage').default;

const SearchPage = Platform.OS === 'web'
  ? lazy(() => import('../pages/SearchPage'))
  : require('../pages/SearchPage').default;

// Loading fallback for lazy-loaded screens
const LazyLoadFallback: React.FC = () => (
  <View style={lazyStyles.container}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

const lazyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

// Guards
import { TermsGuard } from '../components/auth/TermsGuard';

// Context Providers
import { AlertProvider } from '../context/AlertContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';

// Validation utility
import { validateProfileForItinerary } from '../utils/profileValidation';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Wrapper components for lazy-loaded screens
// ONLY use Suspense on web (where lazy loading is actually lazy)
// On mobile, components are already loaded, so Suspense is unnecessary overhead
// CRITICAL: Memoize these to prevent new component references on every render
const VideoFeedPageWrapper: React.FC = React.memo(() =>
  Platform.OS === 'web' ? (
    <Suspense fallback={<LazyLoadFallback />}>
      <VideoFeedPage />
    </Suspense>
  ) : (
    <VideoFeedPage />
  )
);

const ChatThreadScreenWrapper: React.FC = React.memo(() =>
  Platform.OS === 'web' ? (
    <Suspense fallback={<LazyLoadFallback />}>
      <ChatThreadScreen />
    </Suspense>
  ) : (
    <ChatThreadScreen />
  )
);

const ProfilePageWrapper: React.FC = React.memo(() =>
  Platform.OS === 'web' ? (
    <Suspense fallback={<LazyLoadFallback />}>
      <ProfilePage />
    </Suspense>
  ) : (
    <ProfilePage />
  )
);

const SearchPageWrapper: React.FC = React.memo(() =>
  Platform.OS === 'web' ? (
    <Suspense fallback={<LazyLoadFallback />}>
      <SearchPage />
    </Suspense>
  ) : (
    <SearchPage />
  )
);

// Define tabBarStyle outside to prevent recreation
const videosTabBarStyle = {
  position: 'absolute' as const,
  backgroundColor: 'transparent',
  borderTopWidth: 0,
  elevation: 0,
};

// Bottom Tab Navigator (replicates BottomNav from PWA)
let mainTabRenderCount = 0;

const MainTabNavigator: React.FC = () => {
  mainTabRenderCount++;
  console.log(`[MainTabNavigator] 🔵 Rendering (count: ${mainTabRenderCount})`);
  
  // Memoize ALL options objects AND tabBarIcon functions to prevent infinite re-renders
  // CRITICAL: tabBarIcon functions must be useCallback, not just module-level functions
  const searchIcon = React.useCallback(({ focused, color, size }: any) => (
    <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
  ), []);
  
  const videosIcon = React.useCallback(({ focused, color, size }: any) => (
    <Ionicons name={focused ? 'play-circle' : 'play-circle-outline'} size={size} color={color} />
  ), []);
  
  const chatIcon = React.useCallback(({ focused, color, size }: any) => (
    <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
  ), []);
  
  const profileIcon = React.useCallback(({ focused, color, size }: any) => (
    <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
  ), []);
  
  const screenOptions = React.useMemo(() => ({
    tabBarActiveTintColor: '#1976d2',
    tabBarInactiveTintColor: 'gray',
    headerShown: false,
  }), []);
  
  const searchOptions = React.useMemo(() => ({ 
    title: 'TravalMatch',
    tabBarIcon: searchIcon,
  }), [searchIcon]);
  
  const videosOptions = React.useMemo(() => ({ 
    title: 'Travals',
    tabBarIcon: videosIcon,
    tabBarStyle: videosTabBarStyle,
  }), [videosIcon]);
  
  const chatOptions = React.useMemo(() => ({ 
    title: 'Chat',
    tabBarIcon: chatIcon,
  }), [chatIcon]);
  
  const profileOptions = React.useMemo(() => ({ 
    title: 'Profile',
    tabBarIcon: profileIcon,
  }), [profileIcon]);
  
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen 
        name="Search" 
        component={SearchPageWrapper}
        options={searchOptions} 
      />
      <Tab.Screen 
        name="Videos" 
        component={VideoFeedPageWrapper}
        options={videosOptions} 
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatPage}
        options={chatOptions} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfilePageWrapper}
        options={profileOptions} 
      />
    </Tab.Navigator>
  );
};

// Removed: Old AuthStackNavigator with separate Login/Register screens
// Now using single AuthScreen that handles all auth flows internally

// Main Tab Navigator wrapped with TermsGuard
const GuardedMainTabNavigator: React.FC = () => {
  return (
    <TermsGuard>
      <MainTabNavigator />
    </TermsGuard>
  );
};

// Main Stack Navigator with conditional rendering based on auth state
let rootNavigatorRenderCount = 0;

const RootNavigator: React.FC = () => {
  rootNavigatorRenderCount++;
  console.log(`[RootNavigator] 🔵 Rendering (count: ${rootNavigatorRenderCount})`);
  
  const { user, status, isInitializing } = useAuth();
  
  console.log('[RootNavigator] 🔐 Auth state:', { 
    hasUser: !!user, 
    status, 
    isInitializing,
    emailVerified: user?.emailVerified 
  });

  // Show loading state while checking authentication
  // CRITICAL: Also check isInitializing to prevent landing page flash on web refresh
  // isInitializing is true until Firebase auth state is first resolved
  // Also prevent flash during sign-in by keeping loading state until authenticated
  const isLoading = Boolean(status === 'loading') || isInitializing;
  
  if (isLoading) {
    return null; // Or a loading spinner component
  }

  // Conditionally render auth or main app based on user authentication
  // IMPORTANT: Only show main app if user is authenticated AND email is verified
  const isAuthenticated = user && user.emailVerified;
  
  // Check if user exists but is not verified (signed up but needs to verify email)
  const hasUnverifiedUser = user && !user.emailVerified;
  
  // On web, show landing page for completely unauthenticated users (no user at all)
  // If user exists but is unverified, show Auth page directly (not landing page)
  // On mobile (iOS/Android), always go directly to auth page
  const showLandingPage = Platform.OS === 'web' && !user;
  
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated ? (
        // User is authenticated and verified - check terms acceptance before showing main app
        <>
          <Stack.Screen name="MainApp" component={GuardedMainTabNavigator} />
          <Stack.Screen name="ChatThread" component={ChatThreadScreenWrapper} />
        </>
      ) : showLandingPage ? (
        // Web only: Show landing page for completely unauthenticated users (no Firebase user)
        <>
          <Stack.Screen name="Landing" component={LandingPage} />
          <Stack.Screen name="Auth" component={AuthPage} />
        </>
      ) : hasUnverifiedUser ? (
        // User exists but email not verified - show Auth page directly
        // This keeps user on Auth page after signup so they can sign in after verification
        // Also allows resend verification to work since Firebase auth.currentUser exists
        <>
          <Stack.Screen name="Auth" component={AuthPage} />
          {Platform.OS === 'web' && <Stack.Screen name="Landing" component={LandingPage} />}
        </>
      ) : (
        // Mobile (iOS/Android): Show auth page directly
        <Stack.Screen name="Auth" component={AuthPage} />
      )}
    </Stack.Navigator>
  );
};

// Linking configuration for web URL routing - MUST be module-level to prevent recreation
const linking = {
  prefixes: ['https://travalpass.com'],
  config: {
    screens: {
      Landing: '',  // Root URL shows landing page
      Auth: 'auth', // /auth for authentication
      MainApp: {
        path: 'app',
        screens: {
          Search: 'search',
          Videos: 'videos',
          Chat: 'chat',
          Profile: 'profile',
        },
      },
      ChatThread: 'chat/:connectionId',
    },
  },
};

// Main App Navigator (replicates Routes from PWA)
let appNavigatorRenderCount = 0;

const AppNavigator: React.FC = () => {
  appNavigatorRenderCount++;
  console.log(`[AppNavigator] 🔵 Rendering (count: ${appNavigatorRenderCount})`);
  
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  
  console.log('[AppNavigator] 📍 Navigation setup:', {
    hasNavigationRef: !!navigationRef.current,
    linkingConfigStable: linking === linking, // Should always be true
  });
  
  const onNavigationStateChange = React.useCallback((state: any) => {
    console.log('[AppNavigator] 🧭 Navigation state changed:', {
      routeNames: state?.routeNames,
      index: state?.index,
      currentRoute: state?.routes?.[state?.index]?.name
    });
  }, []);

  return (
    <AlertProvider>
      <NavigationContainer 
        ref={navigationRef} 
        linking={linking}
        onStateChange={onNavigationStateChange}
      >
        <ProfileValidationWrapper navigationRef={navigationRef}>
          <RootNavigator />
        </ProfileValidationWrapper>
      </NavigationContainer>
    </AlertProvider>
  );
};

// Profile Validation Wrapper - checks profile completeness after login
let profileValidationRenderCount = 0;

const ProfileValidationWrapper: React.FC<{ 
  children: React.ReactNode; 
  navigationRef: React.RefObject<NavigationContainerRef<any>>; 
}> = ({ children, navigationRef }) => {
  profileValidationRenderCount++;
  console.log(`[ProfileValidationWrapper] 🔵 Rendering (count: ${profileValidationRenderCount})`);
  
  const { userProfile, isLoading } = useUserProfile();
  const { user } = useAuth();
  const hasPromptedUser = useRef(false); // Track if we've shown the prompt this session
  
  console.log('[ProfileValidationWrapper] 📊 Render state:', {
    hasUser: !!user,
    hasProfile: !!userProfile,
    isLoading,
    hasPromptedUser: hasPromptedUser.current,
    navigationRefReady: !!navigationRef.current
  });

  useEffect(() => {
    console.log('[ProfileValidationWrapper] 🔍 useEffect[user] triggered:', {
      hasUser: !!user,
      userId: user?.uid,
      action: 'Reset hasPromptedUser if no user'
    });
    // Reset flag when user changes (logout/login)
    if (!user) {
      hasPromptedUser.current = false;
    }
  }, [user]);

  useEffect(() => {
    console.log('[ProfileValidationWrapper] 🔍 useEffect[validation] triggered:', {
      isLoading,
      hasProfile: !!userProfile,
      hasUser: !!user,
      hasNavRef: !!navigationRef.current,
      hasPromptedUser: hasPromptedUser.current
    });
    
    if (!isLoading && userProfile && user && navigationRef.current) {
      const validationResult = validateProfileForItinerary(userProfile);
      
      console.log('[ProfileValidationWrapper] ✅ Validation result:', {
        isValid: validationResult.isValid,
        hasPromptedUser: hasPromptedUser.current,
        willNavigate: !validationResult.isValid && !hasPromptedUser.current
      });
      
      // Only show prompt ONCE per session when profile is invalid
      // Once user has been prompted (either saves or dismisses), don't prompt again
      // This prevents modal from reopening after user clicks Save or X
      if (!validationResult.isValid && !hasPromptedUser.current) {
        hasPromptedUser.current = true; // Mark as prompted immediately
        
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          navigationRef.current?.navigate('MainApp', {
            screen: 'Profile',
            params: { 
              openEditModal: true,
              incompleteProfile: true,
              missingFields: validationResult.missingFields
            }
          });
        }, 100);
      }
    }
  }, [isLoading, userProfile, user, navigationRef]);

  return <>{children}</>;
};

export default AppNavigator;