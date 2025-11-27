import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { NewConnectionProvider, useNewConnection } from '../../context/NewConnectionContext';

describe('NewConnectionContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NewConnectionProvider>{children}</NewConnectionProvider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useNewConnection(), { wrapper });

    expect(result.current.hasNewConnection).toBe(false);
    expect(result.current.connectionId).toBeNull();
    expect(result.current.matchedUserId).toBeNull();
  });

  it('should update hasNewConnection', () => {
    const { result } = renderHook(() => useNewConnection(), { wrapper });

    act(() => {
      result.current.setHasNewConnection(true);
    });

    expect(result.current.hasNewConnection).toBe(true);
  });

  it('should update connectionId', () => {
    const { result } = renderHook(() => useNewConnection(), { wrapper });

    act(() => {
      result.current.setConnectionId('connection-123');
    });

    expect(result.current.connectionId).toBe('connection-123');
  });

  it('should update matchedUserId', () => {
    const { result } = renderHook(() => useNewConnection(), { wrapper });

    act(() => {
      result.current.setMatchedUserId('user-456');
    });

    expect(result.current.matchedUserId).toBe('user-456');
  });

  it('should reset all state', () => {
    const { result } = renderHook(() => useNewConnection(), { wrapper });

    // Set some state
    act(() => {
      result.current.setHasNewConnection(true);
      result.current.setConnectionId('connection-123');
      result.current.setMatchedUserId('user-456');
    });

    expect(result.current.hasNewConnection).toBe(true);
    expect(result.current.connectionId).toBe('connection-123');
    expect(result.current.matchedUserId).toBe('user-456');

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.hasNewConnection).toBe(false);
    expect(result.current.connectionId).toBeNull();
    expect(result.current.matchedUserId).toBeNull();
  });

  it('should throw error when useNewConnection is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useNewConnection());
    }).toThrow('useNewConnection must be used within a NewConnectionProvider');

    console.error = originalError;
  });

  it('should render children', () => {
    const { render } = require('@testing-library/react-native');
    const { Text } = require('react-native');
    
    const TestComponent = () => {
      const { hasNewConnection } = useNewConnection();
      return <Text>{hasNewConnection ? 'Has Connection' : 'No Connection'}</Text>;
    };

    const { getByText } = render(
      <NewConnectionProvider>
        <TestComponent />
      </NewConnectionProvider>
    );

    expect(getByText('No Connection')).toBeTruthy();
  });
});
