// Import polyfills first (must be before any other imports)
import 'react-native-get-random-values';
import './patches/react-native-fetch-polyfill'; // Fix Android sendRequest bug

import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View, StyleSheet, AppState } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { UserProfileProvider } from './src/context/UserProfileContext';
import * as Notifications from 'expo-notifications';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { NotificationInitializer } from './src/components/common/NotificationInitializer';
import { setupGlobalErrorHandlers } from './src/utils/globalErrorHandler';

// Initialize global error handlers for uncaught errors and unhandled promise rejections
setupGlobalErrorHandlers();

// Configure foreground notification display behavior
// MUST be called at module level (outside React components) so it's registered
// before any notification arrives. Without this, foreground notifications are silently dropped.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

// Enable react-native-screens for better performance and compatibility with React 19
enableScreens(true);

/**
 * Main App Component
 * 
 * Provides authentication, alerts, and user profile context to the entire app.
 * Simplified architecture matching PWA patterns exactly.
 * 
 * NOTE: Font loading is critical for web builds to display icons properly
 */
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Clear badge count when app comes to foreground
  useEffect(() => {
    if (Platform.OS === 'web') return;

    // Clear badge immediately on mount
    Notifications.setBadgeCountAsync(0);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        Notifications.setBadgeCountAsync(0);
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    async function loadFonts() {
      // Only load fonts on web platform to fix icon rendering in production
      if (Platform.OS === 'web') {
        try {
          await Font.loadAsync({
            ...Ionicons.font,
          });
          setFontsLoaded(true);
        } catch (error) {
          console.error('Error loading fonts:', error);
          // Proceed anyway to avoid blocking the app
          setFontsLoaded(true);
        }
      } else {
        // Native platforms handle font loading automatically
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  // Show loading indicator while fonts load on web
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ErrorBoundary level="global">
      <SafeAreaProvider>
        <AuthProvider>
          <AlertProvider>
            <UserProfileProvider>
              <NotificationInitializer />
              <AppNavigator />
            </UserProfileProvider>
          </AlertProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});