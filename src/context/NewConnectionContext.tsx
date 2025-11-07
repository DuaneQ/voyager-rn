/**
 * New Connection Context
 * Manages state for tracking new matches/connections
 * Used to show match notifications and update UI when connections are created
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface NewConnectionContextType {
  hasNewConnection: boolean;
  setHasNewConnection: (value: boolean) => void;
  connectionId: string | null;
  setConnectionId: (id: string | null) => void;
  matchedUserId: string | null;
  setMatchedUserId: (id: string | null) => void;
  reset: () => void;
}

const NewConnectionContext = createContext<NewConnectionContextType | undefined>(undefined);

/**
 * Hook to access New Connection context
 * Must be used within NewConnectionProvider
 */
export function useNewConnection(): NewConnectionContextType {
  const context = useContext(NewConnectionContext);
  if (context === undefined) {
    throw new Error('useNewConnection must be used within a NewConnectionProvider');
  }
  return context;
}

interface NewConnectionProviderProps {
  children: ReactNode;
}

/**
 * Provider component for New Connection state
 * Wrap your app or relevant screens with this provider
 * 
 * @example
 * ```tsx
 * <NewConnectionProvider>
 *   <SearchScreen />
 *   <ChatScreen />
 * </NewConnectionProvider>
 * ```
 */
export function NewConnectionProvider({ children }: NewConnectionProviderProps): JSX.Element {
  const [hasNewConnection, setHasNewConnectionState] = useState<boolean>(false);
  const [connectionId, setConnectionIdState] = useState<string | null>(null);
  const [matchedUserId, setMatchedUserIdState] = useState<string | null>(null);

  const setHasNewConnection = useCallback((value: boolean) => {
    setHasNewConnectionState(value);
  }, []);

  const setConnectionId = useCallback((id: string | null) => {
    setConnectionIdState(id);
  }, []);

  const setMatchedUserId = useCallback((id: string | null) => {
    setMatchedUserIdState(id);
  }, []);

  /**
   * Reset all connection state
   * Useful after showing match notification or navigating away
   */
  const reset = useCallback(() => {
    setHasNewConnectionState(false);
    setConnectionIdState(null);
    setMatchedUserIdState(null);
  }, []);

  const value: NewConnectionContextType = {
    hasNewConnection,
    setHasNewConnection,
    connectionId,
    setConnectionId,
    matchedUserId,
    setMatchedUserId,
    reset
  };

  return (
    <NewConnectionContext.Provider value={value}>
      {children}
    </NewConnectionContext.Provider>
  );
}

export { NewConnectionContext };
export default NewConnectionProvider;
