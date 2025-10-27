/**
 * ProfileStats Component
 * Displays Connections, Trips, and Rating metrics in a row
 * Uses placeholders until ratings and connections are implemented
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ProfileStatsProps {
  connections?: number;
  trips?: number;
  rating?: number;
  ratingCount?: number;
  onConnectionsPress?: () => void;
  onTripsPress?: () => void;
  onRatingPress?: () => void;
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  connections = 0,
  trips = 0,
  rating = 0.0,
  ratingCount = 0,
  onConnectionsPress,
  onTripsPress,
  onRatingPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Connections */}
      <TouchableOpacity
        style={styles.statItem}
        onPress={onConnectionsPress}
        accessibilityRole="button"
        accessibilityLabel={`${connections} Connections`}
        testID="stat-connections"
      >
        <Text style={styles.statNumber}>{connections}</Text>
        <Text style={styles.statLabel}>Connections</Text>
      </TouchableOpacity>

      {/* Trips */}
      <TouchableOpacity
        style={styles.statItem}
        onPress={onTripsPress}
        accessibilityRole="button"
        accessibilityLabel={`${trips} Trips`}
        testID="stat-trips"
      >
        <Text style={styles.statNumber}>{trips}</Text>
        <Text style={styles.statLabel}>Trips</Text>
      </TouchableOpacity>

      {/* Rating */}
      <TouchableOpacity
        style={styles.statItem}
        onPress={onRatingPress}
        accessibilityRole="button"
        accessibilityLabel={`Rating ${rating.toFixed(1)} stars with ${ratingCount} reviews`}
        testID="stat-rating"
      >
        <Text style={styles.statNumber}>⭐{rating.toFixed(1)}</Text>
        <Text style={styles.statLabel}>({ratingCount} reviews)</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
    minHeight: 44, // Accessibility: minimum touch target
    justifyContent: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});
