// Import polyfills first (must be before any other imports)
import 'react-native-get-random-values';
import './patches/react-native-fetch-polyfill'; // Fix Android sendRequest bug

import React, { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View, StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
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

  // Clarity: configure via environment variable or global window var.
  // Set `EXPO_PUBLIC_CLARITY_ID` (preferred for Expo),
  // or `REACT_APP_CLARITY_ID`, or `window.__CLARITY_PROJECT_ID__` at runtime.
  const CLARITY_PROJECT_ID =
    (typeof process !== 'undefined' && process.env && (process.env.EXPO_PUBLIC_CLARITY_ID as unknown as string)) ||
    (typeof process !== 'undefined' && process.env && (process.env.REACT_APP_CLARITY_ID as unknown as string)) ||
    (typeof window !== 'undefined' && (window as any).__CLARITY_PROJECT_ID__) ||
    'REPLACE_WITH_CLARITY_ID';

  useEffect(() => {
    // Inject Clarity script on web only
    if (typeof document === 'undefined') return;

    if (!CLARITY_PROJECT_ID || CLARITY_PROJECT_ID === 'REPLACE_WITH_CLARITY_ID') {
      // Not configured yet — skip injection. Developer should replace placeholder with real ID.
      console.info('Microsoft Clarity not initialized: set EXPO_PUBLIC_CLARITY_ID (or REACT_APP_CLARITY_ID) or window.__CLARITY_PROJECT_ID__');
      return;
    }

    // Avoid injecting twice
    if (document.querySelector("script[data-clarity-id='" + CLARITY_PROJECT_ID + "']")) return;

    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      t.setAttribute('data-clarity-id', i);
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID);
  }, []);

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
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
