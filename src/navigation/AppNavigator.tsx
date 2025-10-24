/**
 * Main App Navigation
 * Replicates the exact structure and functionality of voyager-pwa App.tsx
 * Uses React Navigation instead of React Router
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Pages
import AuthPage from '../pages/AuthPage';
import ProfileScreen from '../pages/ProfileScreenWorking';
import SearchScreen from '../pages/SearchScreenWorking';
import ChatScreen from '../pages/ChatScreenWorking';
import VideoFeedScreen from '../pages/VideoFeedScreenWorking';

// Context Providers
import { AlertProvider } from '../context/AlertContext';
import { UserProfileProvider } from '../context/UserProfileContext';
import { useAuth } from '../context/AuthContext';

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
          } else if (route.name === 'VideoFeed') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1976d2',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Search" 
        component={SearchScreen}
        options={{ title: 'TravalMatch' }} 
      />
      <Tab.Screen 
        name="Videos" 
        component={VideoFeedScreen}
        options={{ title: 'Travals' }} 
      />
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen}
        options={{ title: 'Chat' }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
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
  return (
    <AlertProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AlertProvider>
  );
};

export default AppNavigator;