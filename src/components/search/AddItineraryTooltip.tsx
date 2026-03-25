/**
 * AddItineraryTooltip
 * Coach-mark tooltip shown once on first visit, pointing up at the
 * "+ Add Itinerary" button. Dismissed on tap or after 6 seconds.
 * Shown state is persisted in AsyncStorage so it only ever shows once.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

interface AddItineraryTooltipProps {
  visible: boolean;
  onDismiss: () => void;
  /** Distance from the top of the SafeAreaView — set to the bottom of the ItinerarySelector bar. */
  top?: number;
}

export const AddItineraryTooltip: React.FC<AddItineraryTooltipProps> = ({
  visible,
  onDismiss,
  top = 0,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(onDismiss, 10000);
      return () => clearTimeout(timer);
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrapper, { opacity, top }]}>
      {/* Arrow pointing up toward the Add Itinerary button */}
      <View style={styles.arrow} />
      <TouchableOpacity
        style={styles.bubble}
        onPress={onDismiss}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Dismiss tip"
      >
        <Text style={styles.emoji}>✈️</Text>
        <Text style={styles.title}>Start here!</Text>
        <Text style={styles.body}>
          Create your first trip plan to connect with other travelers going to
          the same destination.
        </Text>
        <Text style={styles.hint}>
          Complete your profile to unlock matching.
        </Text>
        <Text style={styles.dismiss}>Tap to dismiss</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 12,
    zIndex: 1000,
    alignItems: 'flex-end',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1565C0',
    marginRight: 20,
  },
  bubble: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 16,
    maxWidth: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  emoji: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: '#E3F2FD',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 6,
  },
  hint: {
    fontSize: 12,
    color: '#90CAF9',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  dismiss: {
    fontSize: 11,
    color: '#90CAF9',
    textAlign: 'center',
  },
});
