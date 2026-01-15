/**
 * Itinerary Selector Dropdown Component
 * Displays dropdown for selecting from user's itineraries (AI + manual)
 * Shows "+ Add Itinerary" button for creating new itineraries
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Itinerary } from '../../hooks/useAllItineraries';

interface ItinerarySelectorProps {
  itineraries: Itinerary[];
  selectedItineraryId: string | null;
  onSelect: (id: string) => void;
  onAddItinerary: () => void;
  loading?: boolean;
}

export const ItinerarySelector: React.FC<ItinerarySelectorProps> = ({
  itineraries,
  selectedItineraryId,
  onSelect,
  onAddItinerary,
  loading = false,
}) => {
  const showPicker = () => {
    if (Platform.OS === 'ios') {
      const options = [
        'Cancel',
        ...itineraries.map(itin => {
          const isAI = itin.ai_status === 'completed';
          const prefix = isAI ? '🤖 ' : '✈️ ';
          return `${prefix}${itin.destination} - ${new Date(itin.startDate).toLocaleDateString()}`;
        })
      ];
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            onSelect(itineraries[buttonIndex - 1].id);
          }
        }
      );
    }
  };

  const selectedItinerary = itineraries.find(itin => itin.id === selectedItineraryId);

  const formatItineraryLabel = (itinerary: Itinerary) => {
    const isAI = itinerary.ai_status === 'completed';
    const prefix = isAI ? '🤖 ' : '✈️ ';
    return `${prefix}${itinerary.destination} - ${new Date(itinerary.startDate).toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading itineraries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dropdownSection}>
          {itineraries.length > 0 ? (
            <>
              {Platform.OS === 'ios' ? (
                // iOS: Use TouchableOpacity with ActionSheet
                <TouchableOpacity 
                  style={styles.iosPickerButton}
                  onPress={showPicker}
                  testID="itinerary-selector-button"
                >
                  <Text style={styles.iosPickerText} numberOfLines={1}>
                    {selectedItinerary 
                      ? formatItineraryLabel(selectedItinerary)
                      : 'Select itinerary...'
                    }
                  </Text>
                  <Text style={styles.iosPickerArrow}>▼</Text>
                </TouchableOpacity>
              ) : (
                // Android: Picker with explicit black text on white dropdown
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={selectedItineraryId || ''}
                    onValueChange={(value) => value && onSelect(value)}
                    style={styles.androidPicker}
                    dropdownIconColor="#000000"
                    mode="dropdown"
                    itemStyle={{ backgroundColor: '#FFFFFF', color: '#000000' }}
                    testID="itinerary-selector-picker"
                  >
                    <Picker.Item
                      label="Select itinerary..."
                      value=""
                      color="#666666"
                    />
                    {itineraries.map((itinerary) => (
                      <Picker.Item
                        key={itinerary.id}
                        label={formatItineraryLabel(itinerary)}
                        value={itinerary.id}
                        color="#FFFFFF"
                      />
                    ))}
                  </Picker>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noItinerariesText}>No itineraries found</Text>
          )}
        </View>

        <TouchableOpacity 
          style={styles.addButton}
          onPress={onAddItinerary}
          testID="add-itinerary-button"
        >
          <Text style={styles.addButtonText}>+ Add Itinerary</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownSection: {
    flex: 1,
    marginRight: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    padding: 16,
  },
  noItinerariesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  iosPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  iosPickerText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
    fontWeight: '500',
  },
  iosPickerArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  pickerWrapper: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  androidPicker: {
    height: 50,
    color: '#000000',
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    minWidth: 130,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
