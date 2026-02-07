/**
 * Tests for ErrorDisplay component
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorDisplay from '../../components/common/ErrorDisplay';
import { AppError, ErrorDomain, ErrorSeverity } from '../../errors/AppError';

describe('ErrorDisplay', () => {
  it('should render nothing when error is null', () => {
    const { toJSON } = render(<ErrorDisplay error={null} />);
    expect(toJSON()).toBeNull();
  });

  it('should render nothing when error is undefined', () => {
    const { toJSON } = render(<ErrorDisplay error={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('should show safe user message for AppError', () => {
    const error = new AppError({
      code: 'FIRESTORE_DOC_NOT_FOUND',
      message: 'No document to update: projects/mundo1-1/databases/(default)/documents/users/abc123',
      userMessage: 'Your data was not found. Please try signing out and back in.',
      domain: ErrorDomain.FIRESTORE,
    });

    const { getByText } = render(<ErrorDisplay error={error} />);

    // Should show safe user message (never raw Firestore internals)
    expect(getByText('Your data was not found. Please try signing out and back in.')).toBeTruthy();
    // The title should be generic
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('should show generic safe message for raw Error (not AppError)', () => {
    const error = new Error('No document to update: projects/mundo1-1/databases/(default)/...');

    const { getByText } = render(<ErrorDisplay error={error} />);

    // Main user-visible area should show safe generic message
    expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('should show generic safe message for string errors', () => {
    const { getByText } = render(<ErrorDisplay error="raw string error" />);
    expect(getByText('Something went wrong. Please try again.')).toBeTruthy();
  });

  it('should show retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    const error = new AppError({
      code: 'TEST',
      message: 'msg',
      userMessage: 'User message',
      domain: ErrorDomain.UNKNOWN,
      retryAction: 'Try Again',
    });

    const { getByText } = render(<ErrorDisplay error={error} onRetry={onRetry} />);

    const retryButton = getByText('Try Again');
    expect(retryButton).toBeTruthy();

    fireEvent.press(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should use custom retry label over AppError retryAction', () => {
    const error = new AppError({
      code: 'TEST',
      message: 'msg',
      userMessage: 'User message',
      domain: ErrorDomain.UNKNOWN,
      retryAction: 'Default Label',
    });

    const { getByText } = render(
      <ErrorDisplay error={error} onRetry={() => {}} retryLabel="Custom Label" />
    );

    expect(getByText('Custom Label')).toBeTruthy();
  });

  it('should not show retry button when onRetry is not provided', () => {
    const error = new AppError({
      code: 'TEST',
      message: 'msg',
      userMessage: 'User message',
      domain: ErrorDomain.UNKNOWN,
    });

    const { queryByText } = render(<ErrorDisplay error={error} />);
    expect(queryByText('Retry')).toBeNull();
  });

  it('should show secondary action button', () => {
    const onSecondary = jest.fn();
    const error = new AppError({
      code: 'TEST',
      message: 'msg',
      userMessage: 'Error occurred',
      domain: ErrorDomain.UNKNOWN,
    });

    const { getByText } = render(
      <ErrorDisplay
        error={error}
        onSecondaryAction={onSecondary}
        secondaryActionLabel="Sign Out"
      />
    );

    const button = getByText('Sign Out');
    fireEvent.press(button);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('should render compact mode with smaller layout', () => {
    const error = new AppError({
      code: 'TEST',
      message: 'msg',
      userMessage: 'Compact error',
      domain: ErrorDomain.UNKNOWN,
    });

    const { getByText, queryByText } = render(
      <ErrorDisplay error={error} compact onRetry={() => {}} />
    );

    expect(getByText('Compact error')).toBeTruthy();
    // Compact mode should not show the title "Something went wrong"
    expect(queryByText('Something went wrong')).toBeNull();
  });
});
