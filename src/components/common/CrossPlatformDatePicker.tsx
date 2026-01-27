/**
 * Cross-Platform Date Picker Component
 * 
 * Works on iOS, Android, and Web platforms.
 * - iOS/Android: Uses @react-native-community/datetimepicker
 * - Web: Uses native HTML date input
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';

// Only import DateTimePicker for native platforms
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface CrossPlatformDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
  error?: boolean;
  errorMessage?: string;
  testID?: string;
}

export const CrossPlatformDatePicker: React.FC<CrossPlatformDatePickerProps> = ({
  value,
  onChange,
  minimumDate,
  maximumDate,
  label,
  error = false,
  errorMessage,
  testID,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(value);

  // Format date for display
  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format date for HTML input (YYYY-MM-DD)
  const formatInputDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse date from HTML input
  const parseInputDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handlePress = useCallback(() => {
    setTempDate(value);
    setShowPicker(true);
  }, [value]);

  const handleNativeChange = useCallback((event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type !== 'dismissed' && selectedDate) {
        onChange(selectedDate);
      }
    } else if (Platform.OS === 'ios') {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  }, [onChange]);

  const handleIOSConfirm = useCallback(() => {
    onChange(tempDate);
    setShowPicker(false);
  }, [onChange, tempDate]);

  const handleIOSCancel = useCallback(() => {
    setShowPicker(false);
  }, []);

  // Web platform - use native HTML date input
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <View style={[styles.webInputContainer, error && styles.inputError]}>
          <input
            data-testid={testID}
            type="date"
            value={formatInputDate(value)}
            onChange={(e) => {
              const dateString = e.target.value;
              if (dateString) {
                const newDate = parseInputDate(dateString);
                if (!isNaN(newDate.getTime())) {
                  onChange(newDate);
                }
              }
            }}
            min={minimumDate ? formatInputDate(minimumDate) : undefined}
            max={maximumDate ? formatInputDate(maximumDate) : undefined}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: 15,
              color: '#333',
              paddingLeft: 12,
              paddingRight: 40,
              outline: 'none',
              cursor: 'pointer',
              // Hide the browser's default calendar icon
              WebkitAppearance: 'none',
            } as any}
          />
          {/* Add a wrapper with CSS to hide browser calendar icon */}
          <style>{`
            input[type="date"]::-webkit-calendar-picker-indicator {
              opacity: 0;
              position: absolute;
              right: 0;
              width: 100%;
              height: 100%;
              cursor: pointer;
            }
          `}</style>
          <Text style={styles.webCalendarIcon}>📅</Text>
        </View>
        {error && errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}
      </View>
    );
  }

  // iOS platform - show in modal with Done/Cancel
  if (Platform.OS === 'ios') {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TouchableOpacity
          testID={testID}
          style={[styles.button, error && styles.inputError]}
          onPress={handlePress}
        >
          <Text style={styles.buttonText}>{formatDisplayDate(value)}</Text>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>
        {error && errorMessage && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleIOSCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleIOSCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleIOSConfirm}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              {DateTimePicker && (
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleNativeChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                />
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Android platform - inline picker that dismisses on selection
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        testID={testID}
        style={[styles.button, error && styles.inputError]}
        onPress={handlePress}
      >
        <Text style={styles.buttonText}>{formatDisplayDate(value)}</Text>
        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>
      {error && errorMessage && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      {showPicker && DateTimePicker && (
        <DateTimePicker
          value={value}
          mode="date"
          display="default"
          onChange={handleNativeChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  button: {
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonText: {
    fontSize: 15,
    color: '#333',
  },
  calendarIcon: {
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4444',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
  },
  webInputContainer: {
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  webCalendarIcon: {
    position: 'absolute',
    right: 12,
    fontSize: 16,
    pointerEvents: 'none',
  } as any,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  doneText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
});

export default CrossPlatformDatePicker;
