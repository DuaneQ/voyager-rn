/**
 * VideoCardV2 Test Page
 * 
 * Minimal test page to verify expo-video implementation works
 * without breaking existing functionality.
 * 
 * TO TEST:
 * 1. Start metro: npm start
 * 2. iOS: npm run ios
 * 3. Android: npm run android
 * 4. Web: npm run web
 * 
 * Navigate to this page to test the new VideoCardV2 component.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { VideoCardV2 } from '../components/video/VideoCardV2';
import { Video } from '../types/Video';

// Test video data
const TEST_VIDEO: Video = {
  id: 'test-video-1',
  userId: 'test-user-123',
  title: 'Test Video - expo-video Migration',
  description: 'Testing new VideoCardV2 implementation',
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
  duration: 30,
  fileSize: 5000000,
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
  likes: [],
  comments: [],
  viewCount: 0,
  isPublic: true,
};

export const VideoCardV2TestPage: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const handleLike = () => {
    setLikeCount(prev => prev + 1);
    // debug log removed
  };

  const handleShare = () => {
    // debug log removed
  };

  const handleMuteToggle = (muted: boolean) => {
    setIsMuted(muted);
    // debug log removed
  };

  const handleViewTracked = () => {
    // debug log removed
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>VideoCardV2 Test</Text>
        <Text style={styles.subHeaderText}>expo-video implementation</Text>
      </View>
      
      <VideoCardV2
        video={{ ...TEST_VIDEO, likes: new Array(likeCount).fill('user') }}
        isActive={true}
        isMuted={isMuted}
        onMuteToggle={handleMuteToggle}
        onLike={handleLike}
        onShare={handleShare}
        onViewTracked={handleViewTracked}
      />
      
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>✅ Video should auto-play</Text>
        <Text style={styles.instructionText}>✅ Tap to pause/play</Text>
        <Text style={styles.instructionText}>✅ Mute button should work</Text>
        <Text style={styles.instructionText}>✅ Like button should increment</Text>
        <Text style={styles.instructionText}>✅ No deprecation warnings</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subHeaderText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  instructions: {
    position: 'absolute',
    bottom: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    borderRadius: 8,
    zIndex: 100,
  },
  instructionText: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 4,
  },
});
