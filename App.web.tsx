// Import polyfills first (must be before any other imports)
import 'react-native-get-random-values';
import './patches/react-native-fetch-polyfill'; // Fix Android sendRequest bug

import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View, StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { UserProfileProvider } from './src/context/UserProfileContext';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { setupGlobalErrorHandlers } from './src/utils/globalErrorHandler';

// Initialize global error handlers for uncaught errors and unhandled promise rejections
setupGlobalErrorHandlers();

// Enable react-native-screens for better performance and compatibility with React 19
enableScreens(true);

/**
 * Main App Component - WEB VERSION
 * 
 * Provides authentication, alerts, and user profile context to the entire app.
 * Simplified architecture matching PWA patterns exactly.
 * 
 * NOTE: This is the web-specific version that excludes NotificationInitializer
 * (push notifications are not supported on web platform)
 */
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      // Load fonts on web platform to fix icon rendering in production
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
    }

    loadFonts();
  }, []);

  // Show loading indicator while fonts load
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
              {/* NotificationInitializer excluded - not supported on web */}
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
