/**
 * SelectItineraryTooltip
 * Coach-mark tooltip shown once after a user creates their first itinerary,
 * pointing up at the ItinerarySelector dropdown. Dismissed on tap or after 10s.
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

interface SelectItineraryTooltipProps {
  visible: boolean;
  onDismiss: () => void;
  /** Distance from the top of the SafeAreaView — set to the bottom of the ItinerarySelector bar. */
  top?: number;
}

export const SelectItineraryTooltip: React.FC<SelectItineraryTooltipProps> = ({
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
      {/* Arrow pointing up toward the ItinerarySelector dropdown */}
      <View style={styles.arrow} />
      <TouchableOpacity
        style={styles.bubble}
        onPress={onDismiss}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="Dismiss tip"
      >
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.title}>Now select your trip!</Text>
        <Text style={styles.body}>
          Tap the dropdown above to choose the itinerary you just created.
        </Text>
        <View style={styles.steps}>
          <Text style={styles.step}>👇 Potential matches appear below</Text>
          <Text style={styles.step}>❤️ Like or skip each traveler</Text>
          <Text style={styles.step}>🤝 Mutual like = it's a match!</Text>
          <Text style={styles.step}>💬 Matches unlock a private chat</Text>
        </View>
        <Text style={styles.dismiss}>Tap to dismiss</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    zIndex: 1000,
    alignItems: 'flex-start',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00695C',
    marginLeft: 20,
  },
  bubble: {
    backgroundColor: '#00695C',
    borderRadius: 12,
    padding: 16,
    maxWidth: 240,
  },
  emoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  body: {
    color: '#e0f2f1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  steps: {
    gap: 6,
    marginBottom: 10,
  },
  step: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 19,
  },
  dismiss: {
    color: '#b2dfdb',
    fontSize: 11,
    fontStyle: 'italic',
  },
});
