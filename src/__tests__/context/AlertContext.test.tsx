import React from 'react';
import { render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AlertProvider, useAlert } from '../../context/AlertContext';
import { View, Text } from 'react-native';

// Mock React Native Alert
jest.spyOn(Alert, 'alert');

describe('AlertContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide showAlert function', () => {
    const TestComponent = () => {
      const { showAlert } = useAlert();
      return <View testID="test" />;
    };

    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('should show error alert', () => {
    const TestComponent = () => {
      const { showAlert } = useAlert();
      React.useEffect(() => {
        showAlert('error', 'Test error message');
      }, [showAlert]);
      return <View />;
    };

    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Test error message');
  });

  it('should show warning alert', () => {
    const TestComponent = () => {
      const { showAlert } = useAlert();
      React.useEffect(() => {
        showAlert('warning', 'Test warning');
      }, [showAlert]);
      return <View />;
    };

    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    expect(Alert.alert).toHaveBeenCalledWith('Warning', 'Test warning');
  });

  it('should show success alert', () => {
    const TestComponent = () => {
      const { showAlert } = useAlert();
      React.useEffect(() => {
        showAlert('success', 'Success!');
      }, [showAlert]);
      return <View />;
    };

    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    expect(Alert.alert).toHaveBeenCalledWith('Success', 'Success!');
  });

  it('should show info alert for unknown severity', () => {
    const TestComponent = () => {
      const { showAlert } = useAlert();
      React.useEffect(() => {
        showAlert('unknown', 'Info message');
      }, [showAlert]);
      return <View />;
    };

    render(
      <AlertProvider>
        <TestComponent />
      </AlertProvider>
    );

    expect(Alert.alert).toHaveBeenCalledWith('Info', 'Info message');
  });

  it('should throw error when useAlert is used outside provider', () => {
    const TestComponent = () => {
      useAlert();
      return <View />;
    };

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAlert must be used within an AlertProvider');
  });
});
