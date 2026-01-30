/**
 * Alert Context for React Native
 * Replicates the exact functionality of voyager-pwa AlertContext
 * Uses React Native Alert for mobile, window.alert for web
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Alert, Linking, Platform } from 'react-native';

interface AlertContextType {
  showAlert: (severity: string, message: string, actionUrl?: string, actionLabel?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

let alertProviderRenderCount = 0;

const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  alertProviderRenderCount++;
  console.log(`[AlertProvider] 🔵 Rendering (count: ${alertProviderRenderCount})`);
  const showAlert = (severity: string, message: string, actionUrl?: string, actionLabel?: string) => {
    // Map severity to Alert types
    const title = severity === 'error' ? 'Error' : 
                  severity === 'warning' ? 'Warning' : 
                  severity === 'success' ? 'Success' : 'Info';
    
    // Use window.alert for web, React Native Alert for mobile
    if (Platform.OS === 'web') {
      // Web: use window.alert (or could use a toast library)
      if (actionUrl) {
        const shouldOpen = window.confirm(`${title}: ${message}\n\nClick OK to ${actionLabel || 'open link'}.`);
        if (shouldOpen) {
          window.open(actionUrl, '_blank');
        }
      } else {
        window.alert(`${title}: ${message}`);
      }
    } else {
      // Mobile: use React Native Alert
      if (actionUrl) {
        Alert.alert(
          title, 
          message,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: actionLabel || 'Open Link', 
              onPress: () => Linking.openURL(actionUrl).catch(err => 
                console.error('Failed to open URL:', err)
              )
            }
          ]
        );
      } else {
        Alert.alert(title, message);
      }
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

// Custom hook for using AlertContext
export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export { AlertContext, AlertProvider };