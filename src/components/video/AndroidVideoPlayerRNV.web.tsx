// Web-specific AndroidVideoPlayerRNV
// Returns null on web - video playback handled by VideoCard's HTML5 <video> element

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Web stub for AndroidVideoPlayerRNV
 * 
 * On web, we don't need this component at all since VideoCard uses HTML5 <video> elements.
 * This stub prevents expo-av from being imported on web builds.
 */

interface AndroidVideoPlayerProps {
  video: any;
  isActive: boolean;
  isMuted: boolean;
  isPaused?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onPlaybackStatusUpdate?: (status: any) => void;
}

export const AndroidVideoPlayerRNV: React.FC<AndroidVideoPlayerProps> = () => {
  // On web, this should never render (VideoCard uses HTML5 video instead)
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Video player not supported on web (use HTML5 video instead)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
  },
});
