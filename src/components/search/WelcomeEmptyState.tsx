/**
 * WelcomeEmptyState
 * Shown on the Search/TravalMatch page when a logged-in user has no itineraries.
 * Combines: welcome greeting, blurred preview cards (3.6), prominent "Add My Trip"
 * CTA (4.1), and trending destinations carousel.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PopularDestinationsCarousel } from './PopularDestinationsCarousel';
import { PopularDestination } from '../../hooks/usePopularDestinations';

const { width: screenWidth } = Dimensions.get('window');
const FS = screenWidth >= 768 ? 1.5 : 1;
const r = (n: number) => Math.round(n * FS);

/** Hardcoded blurred preview cards to show potential matches. */
const PREVIEW_CARDS = [
  { destination: 'Paris, France', traveler: 'Sarah M.', age: 27, dates: 'Jul 15 – Jul 22' },
  { destination: 'Tokyo, Japan', traveler: 'James T.', age: 31, dates: 'Aug 3 – Aug 12' },
  { destination: 'Bali, Indonesia', traveler: 'Mia K.', age: 24, dates: 'Sep 1 – Sep 10' },
];

interface WelcomeEmptyStateProps {
  username?: string;
  onAddItinerary: () => void;
  destinations: PopularDestination[];
  destinationsLoading: boolean;
}

export const WelcomeEmptyState: React.FC<WelcomeEmptyStateProps> = ({
  username,
  onAddItinerary,
  destinations,
  destinationsLoading,
}) => {
  const greeting = username ? `Welcome, ${username}!` : 'Welcome!';

  return (
    <View style={styles.container}>
      {/* Welcome header */}
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.subtitle}>
        Find Traval companions heading to the same destination
      </Text>

      {/* Profile completion nudge */}

      {/* Prominent Add Itinerary CTA */}
      <TouchableOpacity
        testID="welcome-add-itinerary-button"
        style={styles.ctaButton}
        onPress={onAddItinerary}
        activeOpacity={0.85}
      >
        <Ionicons name="add-circle-outline" size={r(22)} color="#FFFFFF" />
        <Text style={styles.ctaText}>Add My Trip</Text>
      </TouchableOpacity>
      <Text style={styles.ctaHint}>
        Create your itinerary and we'll match you with fellow travelers
      </Text>

      {/* Blurred preview cards — hardcoded teaser */}
      <View style={styles.previewSection}>
        <Text style={styles.previewHeading}>Potential Matches</Text>
        {PREVIEW_CARDS.map((card, i) => (
          <View key={i} style={styles.previewCard}>
            <View style={styles.previewAvatar}>
              <Ionicons name="person-circle-outline" size={r(36)} color="rgba(255,255,255,0.5)" />
            </View>
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{card.traveler}, {card.age}</Text>
              <Text style={styles.previewDest}>{card.destination}</Text>
              <Text style={styles.previewDates}>{card.dates}</Text>
            </View>
            {/* Blur overlay */}
            <View style={styles.blurOverlay} />
          </View>
        ))}
        <Text style={styles.previewLockText}>
          <Ionicons name="lock-closed" size={r(12)} color="rgba(255,255,255,0.7)" />
          {' '}Add your trip to see real matches
        </Text>
      </View>

      {/* Trending destinations carousel */}
      <PopularDestinationsCarousel
        destinations={destinations}
        loading={destinationsLoading}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: r(20),
    paddingHorizontal: r(16),
  },
  greeting: {
    fontSize: r(24),
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: r(14),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: r(6),
    marginBottom: r(16),
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  // Profile completion nudge
  // CTA button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976d2',
    paddingVertical: r(14),
    paddingHorizontal: r(28),
    borderRadius: r(30),
    gap: r(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  ctaText: {
    fontSize: r(17),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaHint: {
    fontSize: r(12),
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: r(8),
    marginBottom: r(20),
  },
  // Blurred preview section
  previewSection: {
    width: '100%',
    maxWidth: r(350),
    marginBottom: r(16),
  },
  previewHeading: {
    fontSize: r(15),
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: r(10),
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: r(12),
    padding: r(12),
    marginBottom: r(8),
    overflow: 'hidden',
    position: 'relative',
  },
  previewAvatar: {
    marginRight: r(12),
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: r(14),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  previewDest: {
    fontSize: r(13),
    color: 'rgba(255,255,255,0.5)',
    marginTop: r(2),
  },
  previewDates: {
    fontSize: r(11),
    color: 'rgba(255,255,255,0.4)',
    marginTop: r(2),
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: r(12),
  },
  previewLockText: {
    fontSize: r(12),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: r(6),
  },
});
