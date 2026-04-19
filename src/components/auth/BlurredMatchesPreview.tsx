/**
 * BlurredMatchesPreview Component
 * 
 * Post-signup teaser showing blurred sample traveler profiles.
 * Encourages new users to add their first itinerary to unlock matches.
 * 
 * Uses hardcoded sample data — no API calls, no cost implications.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface BlurredMatchesPreviewProps {
  onAddTrip: () => void;
  isLoading?: boolean;
}

const SAMPLE_TRAVELERS = [
  { initials: 'JM', destination: 'Barcelona, Spain', dates: 'May 15 – May 22', matchPct: 92 },
  { initials: 'SK', destination: 'Tokyo, Japan', dates: 'Jun 3 – Jun 12', matchPct: 87 },
  { initials: 'AR', destination: 'Lisbon, Portugal', dates: 'May 20 – May 27', matchPct: 85 },
];

const BlurredMatchesPreview: React.FC<BlurredMatchesPreviewProps> = ({
  onAddTrip,
  isLoading = false,
}) => {
  return (
    <View style={previewStyles.container}>
      <Text style={previewStyles.heading}>Travelers are waiting to match!</Text>
      <Text style={previewStyles.subheading}>
        Add your trip to see who's going where you are.
      </Text>

      {/* Blurred sample cards */}
      <View style={previewStyles.cardsContainer}>
        {SAMPLE_TRAVELERS.map((traveler, index) => (
          <View key={index} style={previewStyles.card}>
            <View style={previewStyles.cardBlur}>
              <View style={previewStyles.avatar}>
                <Text style={previewStyles.avatarText}>{traveler.initials}</Text>
              </View>
              <View style={previewStyles.cardInfo}>
                <Text style={previewStyles.cardDestination}>{traveler.destination}</Text>
                <Text style={previewStyles.cardDates}>{traveler.dates}</Text>
              </View>
              <View style={previewStyles.matchBadge}>
                <Text style={previewStyles.matchText}>{traveler.matchPct}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        testID="add-trip-button"
        style={[previewStyles.ctaButton, isLoading && previewStyles.ctaDisabled]}
        onPress={onAddTrip}
        disabled={isLoading}
      >
        <Text style={previewStyles.ctaText}>Add My Trip</Text>
      </TouchableOpacity>
    </View>
  );
};

const previewStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  cardsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  card: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    padding: 14,
    borderRadius: 10,
    opacity: 0.6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardDestination: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  cardDates: {
    fontSize: 12,
    color: '#888',
  },
  matchBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    color: '#2e7d32',
    fontWeight: '600',
    fontSize: 13,
  },
  ctaButton: {
    backgroundColor: '#1976d2',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  ctaDisabled: {
    backgroundColor: '#ccc',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BlurredMatchesPreview;
