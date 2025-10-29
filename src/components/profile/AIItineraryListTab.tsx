/**
 * AI Itinerary List Tab Component
 * Displays user's generated AI itineraries
 * 
 * This is a placeholder component that will be enhanced with full functionality
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

export const AIItineraryListTab: React.FC = () => {
  // TODO: Integrate with useAIGeneratedItineraries hook from PWA
  const loading = false;
  const itineraries: any[] = []; // Placeholder

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your itineraries...</Text>
      </View>
    );
  }

  if (itineraries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>✈️</Text>
        <Text style={styles.emptyTitle}>No AI Itineraries Yet</Text>
        <Text style={styles.emptyText}>
          Create your first AI-generated itinerary by setting up your travel preferences and tapping "Generate AI Itinerary"
        </Text>
        <Text style={styles.emptyHint}>
          💡 Tip: Complete your travel preferences for better AI recommendations
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My AI Itineraries</Text>
        <Text style={styles.subtitle}>{itineraries.length} itineraries</Text>
      </View>

      {/* TODO: Map through itineraries and display cards */}
      {itineraries.map((itinerary) => (
        <TouchableOpacity
          key={itinerary.id}
          style={styles.itineraryCard}
          onPress={() => {
            // TODO: Navigate to itinerary detail view
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{itinerary.destination}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI Generated</Text>
            </View>
          </View>
          
          <Text style={styles.cardDates}>
            {itinerary.startDate} - {itinerary.endDate}
          </Text>
          
          <View style={styles.cardFooter}>
            <Text style={styles.cardActivities}>
              {itinerary.activities?.length || 0} activities
            </Text>
            <Text style={styles.cardBudget}>
              ${itinerary.budget || 0}/day
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  itineraryCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  cardDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  cardActivities: {
    fontSize: 14,
    color: '#666',
  },
  cardBudget: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
});
