/**
 * useVideoUpload Hook
 * Manages video upload state and permissions
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { videoService } from '../../services/video/VideoService';
import { Video, VideoUploadData, VideoUploadState } from '../../types/Video';
import { validateVideoFile, validateVideoMetadata, getFileSize } from '../../utils/videoValidation';
import * as firebaseCfg from '../../config/firebaseConfig';

interface UseVideoUploadOptions {
  onError?: (message: string, title?: string) => void;
}

export const useVideoUpload = (options?: UseVideoUploadOptions) => {
  const showError = options?.onError || ((message: string, title?: string) => {
    Alert.alert(title || 'Error', message);
  });
  const [uploadState, setUploadState] = useState<VideoUploadState>({
    loading: false,
    progress: 0,
    error: null,
    processingStatus: null,
  });

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  /**
   * Request media library permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (permissionGranted !== null) {
      return permissionGranted;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const granted = status === 'granted';
    setPermissionGranted(granted);

    if (!granted) {
      showError(
        'Please grant permission to access your photo library to upload videos.',
        'Permission Required'
      );
    }

    return granted;
  }, [permissionGranted]);

  /**
   * Select video from library
   * Returns both URI and fileSize from picker to avoid iOS transcoding issues
   */
  const selectVideo = useCallback(async (): Promise<{ uri: string; fileSize?: number } | null> => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      return null;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      // Return both URI and fileSize from picker (avoids iOS transcoding issue)
      return {
        uri: asset.uri,
        fileSize: asset.fileSize, // This is the ORIGINAL file size before any transcoding
      };
    } catch (error) {
      console.error('Error selecting video:', error);
      showError('Failed to select video', 'Error');
      return null;
    }
  }, [requestPermission]);

  /**
   * Upload video with validation
   */
  const uploadVideo = useCallback(
    async (videoData: VideoUploadData): Promise<Video | null> => {
  const tentative = typeof (firebaseCfg as any).getAuthInstance === 'function'
    ? (firebaseCfg as any).getAuthInstance()
    : (firebaseCfg as any).auth;
  const effectiveAuth = tentative && tentative.currentUser ? tentative : (firebaseCfg as any).auth;
  const userId = effectiveAuth?.currentUser?.uid;
      if (!userId) {
        showError('You must be logged in to upload videos', 'Error');
        return null;
      }

      setUploadState({
        loading: true,
        progress: 0,
        error: null,
        processingStatus: 'Validating...',
      });

      try {
        // Get file size - prefer pickerFileSize from expo-image-picker (avoids iOS transcoding)
        // Fall back to getFileSize() only if pickerFileSize not provided
        let fileSize: number;
        if (videoData.pickerFileSize && videoData.pickerFileSize > 0) {
          fileSize = videoData.pickerFileSize;
        } else {
          fileSize = await getFileSize(videoData.uri);
        }

        // Validate video file
        const fileValidation = await validateVideoFile(videoData.uri, fileSize);
        if (!fileValidation.isValid) {
          throw new Error(fileValidation.errors.join(', '));
        }

        // Validate metadata
        const metadataValidation = validateVideoMetadata(
          videoData.title,
          videoData.description
        );
        if (!metadataValidation.isValid) {
          throw new Error(metadataValidation.errors.join(', '));
        }        
        // Upload video
        const video = await videoService.uploadVideo(
          videoData,
          userId,
          (progress, status) => {
            setUploadState({
              loading: true,
              progress,
              error: null,
              processingStatus: status,
            });
          }
        );

        setUploadState({
          loading: false,
          progress: 100,
          error: null,
          processingStatus: null,
        });

        return video;
      } catch (error) {
        console.error('[useVideoUpload] Upload error caught:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed';
        console.error('[useVideoUpload] Error message:', errorMessage);
        
        setUploadState({
          loading: false,
          progress: 0,
          error: errorMessage,
          processingStatus: null,
        });

        showError(errorMessage, 'Upload Failed');
        return null;
      }
    },
    []
  );

  /**
   * Delete video
   */
  const deleteVideo = useCallback(async (videoId: string, video: Video): Promise<boolean> => {
    try {
      await videoService.deleteVideo(videoId, video);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Delete failed';
      showError(errorMessage, 'Delete Failed');
      return false;
    }
  }, []);

  /**
   * Load user videos
   */
  const loadUserVideos = useCallback(async (): Promise<Video[]> => {
  const tentative2 = typeof (firebaseCfg as any).getAuthInstance === 'function'
    ? (firebaseCfg as any).getAuthInstance()
    : (firebaseCfg as any).auth;
  const effectiveAuth2 = tentative2 && tentative2.currentUser ? tentative2 : (firebaseCfg as any).auth;
  const userId = effectiveAuth2?.currentUser?.uid;
    if (!userId) {
      return [];
    }

    try {
      const videos = await videoService.getUserVideos(userId);
      return videos;
    } catch (error) {
      console.error('[useVideoUpload] Error loading videos:', error);
      return [];
    }
  }, []);

  return {
    uploadState,
    selectVideo,
    uploadVideo,
    deleteVideo,
    loadUserVideos,
    requestPermission,
  };
};
