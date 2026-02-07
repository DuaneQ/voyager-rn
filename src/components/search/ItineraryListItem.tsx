import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Itinerary } from '../../hooks/useAllItineraries';
import { parseAndFormatItineraryDate } from '../../utils/formatDate';

interface ItineraryListItemProps {
  itinerary: Itinerary;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
  isDeleting?: boolean;
}

const ItineraryListItem: React.FC<ItineraryListItemProps> = ({
  itinerary,
  onEdit,
  onDelete,
  isEditing = false,
  isDeleting = false,
}) => {
  const isAI = itinerary.ai_status === 'completed' || itinerary.response?.success;
  const emoji = isAI ? '🤖' : '✈️';

  /**
   * Parse date string and format for display.
   * Handles ISO strings (from Firestore) and YYYY-MM-DD strings.
   * Always extracts the YYYY-MM-DD portion and parses as LOCAL date
   * to avoid UTC timezone shift (e.g., Feb 5 UTC midnight → Feb 4 EST).
   */
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No Date';
    
    try {
      // Handle Firestore Timestamp objects
      if (typeof dateStr === 'object' && dateStr !== null) {
        const obj = dateStr as any;
        if (obj.seconds !== undefined) {
          const d = new Date(obj.seconds * 1000);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        if (obj.toDate && typeof obj.toDate === 'function') {
          const d = obj.toDate();
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return 'Invalid Date';
      }
      
      if (typeof dateStr !== 'string') return 'Invalid Date';
      
      // For ISO strings like '2026-02-05T00:00:00.000Z', extract the date part
      // BEFORE 'T' to avoid UTC→local timezone shift
      const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      
      // Parse YYYY-MM-DD as local date
      const parts = dateOnly.split('-');
      if (parts.length !== 3) return dateStr;
      
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
      
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) return dateStr;
      
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (err) {
      console.warn('[ItineraryListItem] Date parse error:', dateStr, err);
      return dateStr;
    }
  };

  return (
    <View style={[styles.container, isEditing && styles.containerEditing]}>
      <View style={styles.header}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.headerText}>
          <Text style={styles.destination} numberOfLines={1}>
            {itinerary.destination}
          </Text>
          <Text style={styles.dates}>
            {parseAndFormatItineraryDate(itinerary.startDate)} - {parseAndFormatItineraryDate(itinerary.endDate)}
          </Text>
        </View>
      </View>

      {itinerary.description && (
        <Text style={styles.description} numberOfLines={2}>
          {itinerary.description}
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(itinerary.id)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
          onPress={() => onDelete(itinerary.id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#ff3b30" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  containerEditing: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#e3f2fd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  destination: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  dates: {
    fontSize: 13,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ItineraryListItem;
