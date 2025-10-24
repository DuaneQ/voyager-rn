import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AlertProvider } from './src/context/AlertContext';
import { UserProfileProvider } from './src/context/UserProfileContext';

/**
 * Main App Component
 * 
 * Provides authentication, alerts, and user profile context to the entire app.
 * Simplified architecture matching PWA patterns exactly.
 */
export default function App() {
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
