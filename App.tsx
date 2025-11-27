// Import polyfills first (must be before any other imports)
import 'react-native-get-random-values';
import './patches/react-native-fetch-polyfill'; // Fix Android sendRequest bug

import React from 'react';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { UserProfileProvider } from './src/context/UserProfileContext';

// Enable react-native-screens for better performance and compatibility with React 19
enableScreens(true);

/**
 * Main App Component
 * 
 * Provides authentication, alerts, and user profile context to the entire app.
 * Simplified architecture matching PWA patterns exactly.
 */
export default function App() {
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
