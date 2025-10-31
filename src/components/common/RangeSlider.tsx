import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  lowValue: number;
  highValue: number;
  onValueChange: (low: number, high: number) => void;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step,
  lowValue,
  highValue,
  onValueChange,
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const lowPosition = useRef(new Animated.Value(0)).current;
  const highPosition = useRef(new Animated.Value(0)).current;
  
  // Track dragging state
  const lowDragging = useRef(false);
  const highDragging = useRef(false);

  // Calculate thumb positions based on values
  const getPositionFromValue = (value: number) => {
    if (sliderWidth === 0) return 0;
    const range = max - min;
    const percentage = (value - min) / range;
    return percentage * sliderWidth;
  };

  // Calculate value from position
  const getValueFromPosition = (position: number) => {
    if (sliderWidth === 0) return min;
    const percentage = position / sliderWidth;
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  };

  // Create pan responder for low thumb - useMemo to recreate when dependencies change
  const lowPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          lowDragging.current = true;
          const currentPos = getPositionFromValue(lowValue);
          lowPosition.setOffset(currentPos);
          lowPosition.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          if (sliderWidth === 0) return;
          const currentPos = getPositionFromValue(lowValue);
          const maxPosition = getPositionFromValue(highValue - step);
          const newPosition = Math.max(0, Math.min(maxPosition, currentPos + gestureState.dx));
          lowPosition.setValue(newPosition - currentPos);
        },
        onPanResponderRelease: (_, gestureState) => {
          lowDragging.current = false;
          lowPosition.flattenOffset();
          const currentOffset = getPositionFromValue(lowValue);
          const maxPosition = getPositionFromValue(highValue - step);
          const newPosition = Math.max(
            0,
            Math.min(maxPosition, currentOffset + gestureState.dx)
          );
          const newValue = getValueFromPosition(newPosition);
          lowPosition.setValue(getPositionFromValue(newValue));
          onValueChange(newValue, highValue);
        },
      }),
    [lowValue, highValue, step, sliderWidth, onValueChange, min, max]
  );

  // Create pan responder for high thumb - useMemo to recreate when dependencies change
  const highPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          highDragging.current = true;
          const currentPos = getPositionFromValue(highValue);
          highPosition.setOffset(currentPos);
          highPosition.setValue(0);
        },
        onPanResponderMove: (_, gestureState) => {
          if (sliderWidth === 0) return;
          const currentPos = getPositionFromValue(highValue);
          const minPosition = getPositionFromValue(lowValue + step);
          const newPosition = Math.max(
            minPosition,
            Math.min(sliderWidth, currentPos + gestureState.dx)
          );
          highPosition.setValue(newPosition - currentPos);
        },
        onPanResponderRelease: (_, gestureState) => {
          highDragging.current = false;
          highPosition.flattenOffset();
          const currentOffset = getPositionFromValue(highValue);
          const minPosition = getPositionFromValue(lowValue + step);
          const newPosition = Math.max(
            minPosition,
            Math.min(sliderWidth, currentOffset + gestureState.dx)
          );
          const newValue = getValueFromPosition(newPosition);
          highPosition.setValue(getPositionFromValue(newValue));
          onValueChange(lowValue, newValue);
        },
      }),
    [lowValue, highValue, step, sliderWidth, onValueChange, min, max]
  );

  // Update thumb positions when values change (but not during dragging)
  React.useEffect(() => {
    if (sliderWidth > 0 && !lowDragging.current && !highDragging.current) {
      lowPosition.setValue(getPositionFromValue(lowValue));
      highPosition.setValue(getPositionFromValue(highValue));
    }
  }, [lowValue, highValue, sliderWidth]);

  return (
    <View style={styles.container}>
      <View
        style={styles.sliderTrack}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          setSliderWidth(width);
        }}
      >
        {/* Background track */}
        <View style={styles.trackBackground} />

        {/* Active range track */}
        <Animated.View
          style={[
            styles.trackActive,
            {
              left: lowPosition,
              width: Animated.subtract(highPosition, lowPosition),
            },
          ]}
        />

        {/* Low thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              left: Animated.add(lowPosition, -10),
            },
          ]}
          {...lowPanResponder.panHandlers}
        />

        {/* High thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              left: Animated.add(highPosition, -10),
            },
          ]}
          {...highPanResponder.panHandlers}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  sliderTrack: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
  },
  trackActive: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default RangeSlider;
