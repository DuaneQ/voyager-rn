/**
 * AI Itinerary List Tab Component
 * Displays user's generated AI itineraries with dropdown selector
 * Matches PWA functionality - only shconst styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  displayContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },rips
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAIGeneratedItineraries } from '../../hooks/useAIGeneratedItineraries';
import { AIItineraryDisplay } from '../ai/AIItineraryDisplay';

export const AIItineraryListTab: React.FC = () => {
  const { itineraries, loading, error } = useAIGeneratedItineraries();
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);

  // Auto-select first itinerary when loaded
  React.useEffect(() => {
    if (itineraries.length > 0 && !selectedItineraryId) {
      setSelectedItineraryId(itineraries[0].id);
    }
  }, [itineraries, selectedItineraryId]);

  const selectedItinerary = itineraries.find(itin => itin.id === selectedItineraryId);

  const showPicker = () => {
    if (Platform.OS === 'ios') {
      const options = [
        'Cancel',
        ...itineraries.map(itin => `${itin.destination} - ${new Date(itin.startDate).toLocaleDateString()}`)
      ];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            setSelectedItineraryId(itineraries[buttonIndex - 1].id);
          }
        }
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your itineraries...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Error Loading Itineraries</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (itineraries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✈️</Text>
        <Text style={styles.emptyTitle}>No AI Itineraries Yet</Text>
        <Text style={styles.emptyText}>
          After completing your user profile by clicking the Edit Profile button and setting up your Travel Preference profile on the Travel Preference tab, you can create your first AI-generated itinerary by tapping "Generate AI Itinerary"
        </Text>
        <Text style={styles.emptyHint}>
          💡 Tip: Complete your travel preferences for better AI recommendations
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dropdown Selector */}
      <View style={styles.dropdownContainer}>
        <Text style={styles.dropdownLabel}>Select Itinerary:</Text>
        
        {Platform.OS === 'ios' ? (
          // iOS: Use TouchableOpacity with ActionSheet
          <TouchableOpacity 
            style={styles.iosPickerButton}
            onPress={showPicker}
          >
            <Text style={styles.iosPickerText}>
              {selectedItinerary 
                ? `${selectedItinerary.destination} - ${new Date(selectedItinerary.startDate).toLocaleDateString()}`
                : 'Select an itinerary...'
              }
            </Text>
            <Text style={styles.iosPickerArrow}>▼</Text>
          </TouchableOpacity>
        ) : (
          // Android: Use standard Picker
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedItineraryId}
              onValueChange={(value) => setSelectedItineraryId(value)}
              style={styles.picker}
            >
              {itineraries.map((itinerary) => (
                <Picker.Item
                  key={itinerary.id}
                  label={`${itinerary.destination} - ${new Date(itinerary.startDate).toLocaleDateString()}`}
                  value={itinerary.id}
                  color="#000000"
                />
              ))}
            </Picker>
          </View>
        )}
      </View>

      {/* Display Selected Itinerary */}
      <View style={styles.displayContainer}>
        {selectedItinerary ? (
          <AIItineraryDisplay itinerary={selectedItinerary} />
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.noSelectionText}>Select an itinerary to view details</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  displayContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dropdownContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  // iOS-specific button style
  iosPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    height: 50,
  },
  iosPickerText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    flex: 1,
  },
  iosPickerArrow: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 8,
  },
  // Android Picker styles
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#000000',
  },
  noSelectionText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
