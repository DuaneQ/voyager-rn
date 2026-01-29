// Web-specific App entry point
// This file is ONLY loaded on web platform (Metro automatically uses .web.tsx extension)

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { UserProfileProvider } from './src/context/UserProfileContext';

// Enable react-native-screens for better performance
enableScreens(true);

/**
 * Web-specific App Component
 * 
 * IMPORTANT: This file is ONLY used for web builds.
 * Native platforms use App.tsx instead.
 * 
 * Key differences from native:
 * - No expo-av imports (uses expo-audio/expo-video stubs via Metro)
 * - Font loading required for web icon rendering
 * - Uses HTML5 video elements instead of native video players
 */
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('[Web App] Error loading fonts:', error);
        setFontsLoaded(true); // Proceed anyway
      }
    }

    loadFonts();
  }, []);

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
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
