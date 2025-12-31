/**
 * Alert Context for React Native
 * Replicates the exact functionality of voyager-pwa AlertContext
 * Uses React Native Alert instead of Material-UI components
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Alert, Linking } from 'react-native';

interface AlertContextType {
  showAlert: (severity: string, message: string, actionUrl?: string, actionLabel?: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const showAlert = (severity: string, message: string, actionUrl?: string, actionLabel?: string) => {
    // Map severity to Alert types (React Native Alert is simpler)
    const title = severity === 'error' ? 'Error' : 
                  severity === 'warning' ? 'Warning' : 
                  severity === 'success' ? 'Success' : 'Info';
    
    // If action URL provided, add button to open it
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