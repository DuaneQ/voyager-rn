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
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://0d88754efcec4b4a8f8f9b07f2b2f8f6@o4510829247987712.ingest.us.sentry.io/4510829255196672',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

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
export default Sentry.wrap(function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

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
    <SafeAreaProvider>
      <AuthProvider>
        <AlertProvider>
          <UserProfileProvider>
            <AppNavigator />
          </UserProfileProvider>
        </AlertProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});