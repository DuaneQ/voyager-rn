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
import VideoFeedPage from '../pages/VideoFeedPage';

// Context Providers
import { AlertProvider } from '../context/AlertContext';
import { UserProfileProvider, useUserProfile } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';

// Validation utility
import { validateProfileForItinerary } from '../utils/profileValidation';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator (replicates BottomNav from PWA)
const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }: { route: any }) => ({
        tabBarIcon: ({ focused, color, size }: any) => {
          let iconName: string;

          if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'Videos') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        // Make tab bar transparent on video feed page
        tabBarStyle: route.name === 'Videos' ? {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        } : undefined,
      })}
    >
      <Tab.Screen 
        name="Search" 
        component={SearchPage}
        options={{ title: 'TravalMatch' }} 
      />
      <Tab.Screen 
        name="Videos" 
        component={VideoFeedPage}
        options={{ title: 'Travals' }} 
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatPage}
        options={{ title: 'Chat' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfilePage}
        options={{ title: 'Profile' }} 
      />
    </Tab.Navigator>
  );
};

// Removed: Old AuthStackNavigator with separate Login/Register screens
// Now using single AuthScreen that handles all auth flows internally

// Main Stack Navigator with conditional rendering based on auth state
const RootNavigator: React.FC = () => {
  const { user, status } = useAuth();

  // Show loading state while checking authentication
  if (status === 'loading') {
    return null; // Or a loading spinner component
  }

  // Conditionally render auth or main app based on user authentication
  return (
    <Stack.Navigator 
      id={undefined}
      screenOptions={{ headerShown: false }}
    >
      {user ? (
        // User is authenticated - show main app
        <Stack.Screen name="MainApp" component={MainTabNavigator} />
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