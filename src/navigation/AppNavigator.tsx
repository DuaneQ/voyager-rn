/**
 * Main App Navigation
 * Replicates the exact structure and functionality of voyager-pwa App.tsx
 * Uses React Navigation instead of React Router
 */

import React, { useEffect, useRef } from 'react';
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
  const { user, status } = useAuth();

  // Show loading state while checking authentication
  // CRITICAL: Expo SDK 54 JSI bridge requires explicit boolean conversion
  // Direct string comparison causes: "TypeError: expected dynamic type 'boolean', but had type 'string'"
  const isLoading = Boolean(status === 'loading');
  
  if (isLoading) {
    return null; // Or a loading spinner component
  }

  // Conditionally render auth or main app based on user authentication
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      {user ? (
        // User is authenticated - check terms acceptance before showing main app
        <>
          <Stack.Screen name="MainApp" component={GuardedMainTabNavigator} />
          <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
        </>
      ) : (
        // User is not authenticated - show single auth page
        <Stack.Screen name="Auth" component={AuthPage} />
      )}
    </Stack.Navigator>
  );
};

// Main App Navigator (replicates Routes from PWA)
const AppNavigator: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  return (
    <AlertProvider>
      <NavigationContainer ref={navigationRef}>
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
  const hasCheckedProfile = useRef(false);

  useEffect(() => {
    // Reset flag when user changes (logout/login)
    if (!user) {
      hasCheckedProfile.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && userProfile && user && !hasCheckedProfile.current && navigationRef.current) {
      hasCheckedProfile.current = true;
      
      const validationResult = validateProfileForItinerary(userProfile);
      if (!validationResult.isValid) {
        // Small delay to ensure navigation is ready
        setTimeout(() => {
          navigationRef.current?.navigate('MainApp', {
            screen: 'Profile',
            params: { 
              openEditModal: true,
              incompleteProfile: true 
            }
          });
        }, 100);
      }
    }
  }, [isLoading, userProfile, user, navigationRef]);

  return <>{children}</>;
};

export default AppNavigator;