/**
 * useVideoUpload Hook
 * Manages video upload state and permissions
 */

import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { onSnapshot, doc } from 'firebase/firestore';
import { videoService } from '../../services/video/VideoService';
import { Video, VideoUploadData, VideoUploadState } from '../../types/Video';
import { validateVideoFile, validateVideoMetadata, getFileSize } from '../../utils/videoValidation';
import * as firebaseCfg from '../../config/firebaseConfig';
import { db } from '../../config/firebaseConfig';

/**
 * Listens to a single Firestore document until Mux marks it ready or errored.
 * Resolves (never rejects) — worst case after 90 s so the user is never blocked.
 *
 * Cost note: this is one onSnapshot subscription per upload, on the document
 * the user just created. It cancels itself as soon as Mux responds, which
 * typically takes 15–60 s. It is NOT a feed-wide listener.
 */
function waitForMuxProcessing(videoId: string): Promise<void> {
  return new Promise((resolve) => {
    let unsub: () => void = () => {};

    const timeout = setTimeout(() => {
      unsub();
      resolve();
    }, 90_000);

    unsub = onSnapshot(doc(db, 'videos', videoId), (snap) => {
      if (!snap.exists()) {
        clearTimeout(timeout);
        unsub();
        resolve();
        return;
      }
      const data = snap.data();
      if (data?.muxPlaybackUrl || data?.muxStatus === 'ready' || data?.muxStatus === 'errored') {
        clearTimeout(timeout);
        unsub();
        resolve();
      }
    });
  });
}

interface UseVideoUploadOptions {
  onError?: (message: string, title?: string) => void;
}

export const useVideoUpload = (options?: UseVideoUploadOptions) => {
  const showError = useCallback((message: string, title?: string) => {
    if (options?.onError) {
      options.onError(message, title);
    } else {
      Alert.alert(title || 'Error', message);
    }
  }, [options]);
  const [uploadState, setUploadState] = useState<VideoUploadState>({
    loading: false,
    progress: 0,
    error: null,
    processingStatus: null,
  });

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isUploadActive, setIsUploadActive] = useState(false);

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
  }, [permissionGranted, showError]);

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
  }, [requestPermission, showError]);

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
      setIsUploadActive(true);

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

        // Storage + Firestore write is done. Now wait for the Mux Cloud Function
        // to transcode the video to HLS before we declare success.
        // This is a single-document listener only on the video just uploaded —
        // it self-cancels when Mux signals ready/errored, or after 90 s.
        setUploadState({
          loading: true,
          progress: 95,
          error: null,
          processingStatus: 'Optimizing for all platforms...',
        });
        await waitForMuxProcessing(video.id);

        setUploadState({
          loading: false,
          progress: 100,
          error: null,
          processingStatus: null,
        });
        setIsUploadActive(false);

        return video;
      } catch (error) {
        setIsUploadActive(false);
        
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        // Don't show error if user intentionally canceled the upload
        const isCancellation = errorMessage.includes('storage/canceled') || 
                              errorMessage.includes('User canceled') ||
                              errorMessage.includes('Upload canceled');
                                      
        if (isCancellation) {
          setUploadState({
            loading: false,
            progress: 0,
            error: null,
            processingStatus: null,
          });
          return null;
        }
        
        // Only log and show error for actual failures (not cancellations)
        console.error('[useVideoUpload] Upload error:', errorMessage);
        
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
    [showError]
  );

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (isUploadActive) {
      const cancelled = videoService.cancelUpload();
      if (cancelled) {
        setIsUploadActive(false);
        setUploadState({
          loading: false,
          progress: 0,
          error: null,
          processingStatus: null,
        });
      }
      return cancelled;
    }
    return false;
  }, [isUploadActive]);

  /**
   * Delete video
   */
  const deleteVideo = useCallback(async (videoId: string, video: Video): Promise<boolean> => {
    try {
      await videoService.deleteVideo(videoId, video);
      return true;
    } catch (error) {
      console.error('[useVideoUpload] Delete error:', error);
      // Show user-friendly message instead of raw Firebase errors
      showError(
        'Unable to delete video. Please check your connection and try again.',
        'Delete Failed'
      );
      return false;
    }
  }, [showError]);

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
    cancelUpload,
    deleteVideo,
    loadUserVideos,
    requestPermission,
    isUploadActive,
  };
};
