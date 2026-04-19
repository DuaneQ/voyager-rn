/**
 * NoMatchesSuggestion
 * Shown when search returns no matches. Queries the `destinationStats`
 * collection to display how many travelers are planning trips to the
 * same destination — encouraging the user to adjust dates/preferences.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';

const { width: screenWidth } = Dimensions.get('window');
const FS = screenWidth >= 768 ? 1.5 : 1;
const r = (n: number) => Math.round(n * FS);

interface NoMatchesSuggestionProps {
  destination: string;
  searchError?: string | null;
}

export const NoMatchesSuggestion: React.FC<NoMatchesSuggestionProps> = ({
  destination,
  searchError,
}) => {
  const [travelerCount, setTravelerCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destination || searchError) return;

    let cancelled = false;
    setLoading(true);

    const fetchStats = async () => {
      try {
        const docRef = doc(db, 'destinationStats', encodeURIComponent(destination));
        const snap = await getDoc(docRef);
        if (!cancelled && snap.exists()) {
          setTravelerCount(snap.data().count ?? 0);
        } else if (!cancelled) {
          setTravelerCount(0);
        }
      } catch {
        // Silently degrade — the banner is supplementary
        if (!cancelled) setTravelerCount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [destination, searchError]);

  if (searchError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {searchError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>No exact matches yet</Text>
      <Text style={styles.body}>
        Your dates or preferences didn't match anyone this time.
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={styles.loader} />
      ) : travelerCount !== null && travelerCount > 0 ? (
        <View style={styles.statBadge}>
          <Text style={styles.statText}>
            {travelerCount} traveler{travelerCount !== 1 ? 's' : ''} in {destination}
          </Text>
        </View>
      ) : null}

      <Text style={styles.hint}>
        Try adjusting your preferences or dates to find a match.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: r(24),
  },
  emoji: {
    fontSize: r(40),
    marginBottom: r(12),
  },
  title: {
    fontSize: r(18),
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: r(8),
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  body: {
    fontSize: r(14),
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: r(12),
  },
  loader: {
    marginVertical: r(8),
  },
  statBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: r(20),
    paddingHorizontal: r(16),
    paddingVertical: r(8),
    marginBottom: r(12),
  },
  statText: {
    fontSize: r(14),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  hint: {
    fontSize: r(13),
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: r(14),
    textAlign: 'center',
  },
});
