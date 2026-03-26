/**
 * PopularDestinationsCarousel
 * Auto-advancing carousel showing one trending destination at a time.
 * Mirrors the voyager-ads Hero carousel: fade + scale transition, dot indicators.
 *
 * When the collection is empty it renders nothing so SearchPage falls through
 * to its normal empty state.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PopularDestination } from '../../hooks/usePopularDestinations';

const INTERVAL_MS = 3500;

const { width: screenWidth } = Dimensions.get('window');
/** Scale factor — 1.5× on tablet/desktop, 1× on mobile */
const FS = screenWidth >= 768 ? 1.5 : 1;
/** Card width — fills 85% of narrow screens, max 450 on wide */
const CARD_WIDTH = screenWidth >= 768
  ? Math.min(Math.round(screenWidth * 0.45), 450)
  : Math.min(Math.round(screenWidth * 0.85), 300);

// Generic travel emojis — cycled by slide index so every destination
// gets a consistent, accurate-looking icon without brittle string-matching.
const TRAVEL_EMOJIS = ['✈️', '🌍', '🗺️', '🧳', '🌐', '🏖️', '🌄', '🏔️'];

const getEmoji = (_destination: string, slideIndex: number): string =>
  TRAVEL_EMOJIS[slideIndex % TRAVEL_EMOJIS.length];

interface PopularDestinationsCarouselProps {
  destinations: PopularDestination[];
  loading: boolean;
  /** Optional: tapping the card pre-fills the destination search */
  onDestinationPress?: (destination: string) => void;
}

export const PopularDestinationsCarousel: React.FC<PopularDestinationsCarouselProps> = ({
  destinations,
  loading,
  onDestinationPress,
}) => {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (destinations.length <= 1) return;

    const timer = setInterval(() => {
      // Fade + scale out
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.94, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setIndex((prev) => (prev + 1) % destinations.length);
        // Fade + scale back in
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
        ]).start();
      });
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [destinations.length, fadeAnim, scaleAnim]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  if (destinations.length === 0) return null;

  const current = destinations[index];

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🔥 Trending Destinations</Text>

      <TouchableOpacity
        testID="destination-card"
        activeOpacity={onDestinationPress ? 0.8 : 1}
        onPress={() => onDestinationPress?.(current.destination)}
        accessibilityRole={onDestinationPress ? 'button' : 'none'}
        accessibilityLabel={`${current.destination}, ${current.count} traveler${current.count !== 1 ? 's' : ''} planning to visit. Slide ${index + 1} of ${destinations.length}.`}
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.emoji}>{getEmoji(current.destination, index)}</Text>
          <Text style={styles.destination}>{current.destination}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {current.count} traveler{current.count !== 1 ? 's' : ''} planning this trip
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Dot indicators */}
      {destinations.length > 1 && (
        <View testID="carousel-dots" style={styles.dotsRow} accessibilityElementsHidden>
          {destinations.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}

      <Text style={styles.cta}>Create your itinerary to connect with them ✈️</Text>
    </View>
  );
};

const r = (n: number) => Math.round(n * FS);

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: r(24),
    alignItems: 'center',
  },
  container: {
    paddingTop: r(24),
    paddingBottom: r(16),
    alignItems: 'center',
    width: '100%',
  },
  heading: {
    fontSize: r(18),
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: r(16),
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: r(20),
    paddingVertical: r(36),
    paddingHorizontal: r(32),
    alignItems: 'center',
    width: CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: r(6) },
    shadowOpacity: 0.18,
    shadowRadius: r(12),
    elevation: 8,
  },
  emoji: {
    fontSize: r(56),
    marginBottom: r(14),
  },
  destination: {
    fontSize: r(22),
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: r(12),
    letterSpacing: -0.3,
  },
  badge: {
    backgroundColor: '#E8F0FE',
    borderRadius: r(20),
    paddingHorizontal: r(14),
    paddingVertical: r(6),
  },
  badgeText: {
    fontSize: r(13),
    color: '#1976d2',
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: r(7),
    marginTop: r(16),
    alignItems: 'center',
  },
  dot: {
    width: r(7),
    height: r(7),
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: r(20),
    borderRadius: 4,
  },
  cta: {
    fontSize: r(13),
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: r(16),
    opacity: 0.9,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
