import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Itinerary } from '../../hooks/useAllItineraries';

interface ItineraryListItemProps {
  itinerary: Itinerary;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isEditing?: boolean;
}

const ItineraryListItem: React.FC<ItineraryListItemProps> = ({
  itinerary,
  onEdit,
  onDelete,
  isEditing = false,
}) => {
  const isAI = itinerary.ai_status === 'completed' || itinerary.response?.success;
  const emoji = isAI ? '🤖' : '✈️';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
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
            {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
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
          style={styles.deleteButton}
          onPress={() => onDelete(itinerary.id)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
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
  deleteButtonText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ItineraryListItem;
