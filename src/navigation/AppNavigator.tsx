/**
 * Main App Navigation
 * Replicates the exact structure and functionality of voyager-pwa App.tsx
 * Uses React Navigation instead of React Router
 */

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Pages
import AuthPage from '../pages/AuthPage';
import ProfilePage from '../pages/ProfilePage';
import SearchPage from '../pages/SearchPage';
import ChatPage from '../pages/ChatPage';
import ChatThreadScreen from '../pages/ChatThreadScreen';
import VideoFeedPage from '../pages/VideoFeedPage';
import LandingPage from '../pages/LandingPage.web';

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

// Bottom Tab Navigator (replicates BottomNav from PWA)
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Search" 
        component={SearchPage}
        options={{ 
          title: 'TravalMatch',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'search' : 'search-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }} 
      />
      <Tab.Screen 
        name="Videos" 
        component={VideoFeedPage}
        options={{ 
          title: 'Travals',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'play-circle' : 'play-circle-outline'} 
              size={size} 
              color={color} 
            />
          ),
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
          }
        }} 
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatPage}
        options={{ 
          title: 'Chat',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'chatbubble' : 'chatbubble-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfilePage}
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              size={size} 
              color={color} 
            />
          ),
        }} 
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
const RootNavigator: React.FC = () => {
  const { user, status, isInitializing } = useAuth();

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
  
  // TEMPORARILY DISABLED LANDING PAGE FOR iOS DEBUGGING
  // On web, show landing page for completely unauthenticated users (no user at all)
  // If user exists but is unverified, show Auth page directly (not landing page)
  // On mobile (iOS/Android), always go directly to auth page
  const showLandingPage = false; // Platform.OS === 'web' && !user;
  
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      {isAuthenticated ? (
        // User is authenticated and verified - check terms acceptance before showing main app
        <>
          <Stack.Screen name="MainApp" component={GuardedMainTabNavigator} />
          <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
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
        // Mobile (iOS/Android) AND WEB (temporary): Show auth page directly
        <Stack.Screen name="Auth" component={AuthPage} />
      )}
    </Stack.Navigator>
  );
};

// Main App Navigator (replicates Routes from PWA)
const AppNavigator: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Linking configuration for web URL routing
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

  return (
    <AlertProvider>
      <NavigationContainer ref={navigationRef} linking={linking}>
        <ProfileValidationWrapper navigationRef={navigationRef}>
          <RootNavigator />
        </ProfileValidationWrapper>
      </NavigationContainer>
    </AlertProvider>
  );
};

// Profile Validation Wrapper - checks profile completeness after login
const ProfileValidationWrapper: React.FC<{ 
  children: React.ReactNode; 
  navigationRef: React.RefObject<NavigationContainerRef<any>>; 
}> = ({ children, navigationRef }) => {
  const { userProfile, isLoading } = useUserProfile();
  const { user } = useAuth();
  const hasPromptedUser = useRef(false); // Track if we've shown the prompt this session

  useEffect(() => {
    // Reset flag when user changes (logout/login)
    if (!user) {
      hasPromptedUser.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && userProfile && user && navigationRef.current) {
      const validationResult = validateProfileForItinerary(userProfile);
      
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