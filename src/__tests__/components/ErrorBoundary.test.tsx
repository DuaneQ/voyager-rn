/**
 * Tests for ErrorBoundary component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// Component that throws on render
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render crash');
  }
  return <Text>Working content</Text>;
}

// Suppress console.error noise from React's error boundary logging
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0]);
    // Suppress React's internal error boundary warnings and our own logging
    if (
      msg.includes('ErrorBoundary') ||
      msg.includes('The above error occurred') ||
      msg.includes('Error: Uncaught')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary level="page">
        <Text>Hello World</Text>
      </ErrorBoundary>
    );

    expect(getByText('Hello World')).toBeTruthy();
  });

  it('should show default fallback when a child throws', () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary level="page">
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show fallback, not the child content
    expect(queryByText('Working content')).toBeNull();
    expect(getByText('This section encountered an error')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('should show global-level messaging for level="global"', () => {
    const { getByText } = render(
      <ErrorBoundary level="global">
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should call onError callback when error is caught', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary level="page" onError={onError}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should use custom fallback when provided', () => {
    const { getByText } = render(
      <ErrorBoundary
        level="page"
        fallback={(error, reset) => <Text>Custom: {error.message}</Text>}
      >
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom: Test render crash')).toBeTruthy();
  });

  it('should recover when Try Again is pressed', () => {
    // We need a component that can toggle between throwing and not
    let shouldThrow = true;

    function ToggleComponent() {
      if (shouldThrow) throw new Error('crash');
      return <Text>Recovered</Text>;
    }

    const { getByText, rerender } = render(
      <ErrorBoundary level="page">
        <ToggleComponent />
      </ErrorBoundary>
    );

    expect(getByText('Try Again')).toBeTruthy();

    // Stop throwing before pressing Try Again
    shouldThrow = false;
    fireEvent.press(getByText('Try Again'));

    expect(getByText('Recovered')).toBeTruthy();
  });
});
