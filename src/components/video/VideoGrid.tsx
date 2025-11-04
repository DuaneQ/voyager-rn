/**
 * VideoGrid Component
 * Displays user videos in a grid with upload and delete functionality
 * Simplified from PWA for mobile use
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video as VideoType } from '../../types/Video';
import { useVideoUpload } from '../../hooks/video/useVideoUpload';
import { Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');
const GRID_COLUMNS = 3;
const ITEM_SIZE = (width - 40) / GRID_COLUMNS;

export const VideoGrid: React.FC = () => {
  const {
    uploadState,
    selectVideo,
    uploadVideo,
    deleteVideo,
    loadUserVideos,
  } = useVideoUpload();

  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load videos on mount
  const refreshVideos = useCallback(async () => {
    setLoading(true);
    const userVideos = await loadUserVideos();
    setVideos(userVideos);
    setLoading(false);
  }, [loadUserVideos]);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  const handleAddVideo = async () => {
    const uri = await selectVideo();
    if (!uri) return;

    setShowUploadModal(true);
    
    // Simple upload with default values
    const result = await uploadVideo({
      uri,
      title: `Video ${new Date().toLocaleDateString()}`,
      description: '',
      isPublic: true,
    });

    setShowUploadModal(false);

    if (result) {
      Alert.alert('Success', 'Video uploaded successfully!');
      await refreshVideos();
    }
  };

  const handleDeleteVideo = (video: VideoType) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteVideo(video.id, video);
            if (success) {
              Alert.alert('Success', 'Video deleted successfully');
              await refreshVideos();
            }
          },
        },
      ]
    );
  };

  const renderVideoItem = (video: VideoType) => {
    console.log('[VideoGrid] Rendering video item:', {
      id: video.id,
      hasThumbnail: !!video.thumbnailUrl,
      thumbnailUrl: video.thumbnailUrl ? video.thumbnailUrl.substring(0, 50) + '...' : '(empty)',
      videoUrl: video.videoUrl ? video.videoUrl.substring(0, 50) + '...' : '(empty)',
    });

    return (
      <View key={video.id} style={styles.videoItem}>
        <TouchableOpacity
          onPress={() => {
            console.log('[VideoGrid] Video clicked:', video.id);
            setSelectedVideo(video);
          }}
          onLongPress={() => handleDeleteVideo(video)}
          style={styles.videoTouchable}
        >
          {video.thumbnailUrl ? (
            <Image 
              source={{ uri: video.thumbnailUrl }} 
              style={{ width: '100%', height: '100%' }}
              onError={(error) => {
                console.error('[VideoGrid] Thumbnail load error:', video.id, error.nativeEvent);
              }}
              onLoad={() => {
                console.log('[VideoGrid] Thumbnail loaded successfully:', video.id);
              }}
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Ionicons name="videocam" size={32} color="#999" />
            </View>
          )}
          <View style={styles.playIconContainer}>
            <Ionicons name="play-circle" size={40} color="#fff" />
          </View>
        </TouchableOpacity>
        {/* Delete button - visible on all user's own videos */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteVideo(video)}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Upload Button */}
        <View style={styles.grid}>
          <View style={styles.videoItem}>
            <TouchableOpacity
              onPress={handleAddVideo}
              style={[styles.videoTouchable, styles.addButton]}
              disabled={uploadState.loading || loading}
            >
              {uploadState.loading ? (
                <ActivityIndicator size="large" color="#1976d2" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={48} color="#1976d2" />
                  <Text style={styles.addButtonText}>Add Video</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Video Grid */}
          {videos.map(renderVideoItem)}
        </View>

        {loading && videos.length === 0 && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        )}

        {!loading && videos.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No videos yet</Text>
            <Text style={styles.emptySubtext}>Tap the button above to add your first video</Text>
          </View>
        )}
      </ScrollView>

      {/* Upload Progress Modal */}
      <Modal visible={showUploadModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.uploadModal}>
            <ActivityIndicator size="large" color="#1976d2" />
            <Text style={styles.uploadModalTitle}>Uploading Video</Text>
            <Text style={styles.uploadModalStatus}>
              {uploadState.processingStatus || 'Please wait...'}
            </Text>
            <Text style={styles.uploadModalProgress}>
              {Math.round(uploadState.progress)}%
            </Text>
          </View>
        </View>
      </Modal>

      {/* Video Player Modal */}
      <Modal
        visible={!!selectedVideo}
        animationType="slide"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.playerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              console.log('[VideoGrid] Closing video player');
              setSelectedVideo(null);
            }}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {selectedVideo && (
            <>
              <Video
                source={{ uri: selectedVideo.videoUrl }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                onError={(error) => {
                  console.error('[VideoGrid] Video playback error:', selectedVideo.id, error);
                  setSelectedVideo(null);
                  
                  // Check for codec-related errors
                  const errorStr = typeof error === 'string' ? error : JSON.stringify(error);
                  if (errorStr.includes('Decoder failed') || errorStr.includes('hevc') || errorStr.includes('codec')) {
                    Alert.alert(
                      'Playback Error',
                      'This video format is not supported on your device. Please use H.264 (AVC) encoded videos.',
                      [{ text: 'OK' }]
                    );
                  } else {
                    Alert.alert('Error', 'Failed to play video. Please try again.');
                  }
                }}
                onLoad={() => {
                  console.log('[VideoGrid] Video loaded successfully:', selectedVideo.id);
                }}
              />
              {selectedVideo.title && (
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{selectedVideo.title}</Text>
                  {selectedVideo.description && (
                    <Text style={styles.videoDescription}>
                      {selectedVideo.description}
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 5,
    position: 'relative',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
  },
  addButtonText: {
    marginTop: 8,
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    minWidth: 250,
  },
  uploadModalTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  uploadModalStatus: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  uploadModalProgress: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  video: {
    width: '100%',
    height: 300,
  },
  videoInfo: {
    padding: 20,
    backgroundColor: '#000',
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  videoDescription: {
    fontSize: 14,
    color: '#ccc',
  },
});
