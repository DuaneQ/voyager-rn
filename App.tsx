import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { UserProfileProvider } from './src/context/UserProfileContext';
import testFirebaseAuth from './src/utils/testFirebaseAuth';

// Ignore Firebase Auth warnings in LogBox (development only)
// These warnings appear as blocking yellow/red boxes during E2E tests
// Reference: https://github.com/firebase/firebase-js-sdk/issues/7481
LogBox.ignoreLogs([
  '@firebase/auth',
  'AsyncStorage has been extracted',
  'Attempted to log a message with',
]);

/**
 * Main App Component
 * 
 * Provides authentication, alerts, and user profile context to the entire app.
 * Simplified architecture matching PWA patterns exactly.
 */
export default function App() {
  // Test Firebase Auth on startup (development only)
  useEffect(() => {
    if (__DEV__) {
      console.log('🚀 Starting Firebase Auth test...');
      testFirebaseAuth();
    }
  }, []);

  return (
    <AuthProvider>
      <AlertProvider>
        <UserProfileProvider>
          <AppNavigator />
        </UserProfileProvider>
      </AlertProvider>
    </AuthProvider>
  );
}
