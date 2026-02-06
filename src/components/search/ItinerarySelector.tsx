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
} from 'react-native';
import { CrossPlatformPicker, PickerItem } from '../common/CrossPlatformPicker';
import { Itinerary } from '../../hooks/useAllItineraries';
import { parseAndFormatItineraryDate } from '../../utils/formatDate';

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
  const formatItineraryLabel = (itinerary: Itinerary) => {
    const isAI = itinerary.ai_status === 'completed';
    const prefix = isAI ? '🤖 ' : '✈️ ';
    const dateLabel = parseAndFormatItineraryDate(itinerary.startDate);
    return `${prefix}${itinerary.destination} - ${dateLabel}`;
  };

  const pickerItems: PickerItem[] = itineraries.map(itin => ({
    label: formatItineraryLabel(itin),
    value: itin.id,
  }));

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
            <CrossPlatformPicker
              items={pickerItems}
              selectedValue={selectedItineraryId}
              onValueChange={onSelect}
              placeholder="Select itinerary..."
              testID="itinerary-selector-picker"
            />
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
  webPickerWrapper: {
    width: '100%',
    minWidth: 250,
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
