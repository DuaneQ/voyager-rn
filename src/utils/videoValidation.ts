/**
 * Video Validation Utilities
 * Adapted from PWA for React Native - simplified for mobile use
 */

import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { VideoValidationResult, VIDEO_CONSTRAINTS } from '../types/Video';

/**
 * Validates a video file before upload
 * Simplified from PWA - RN handles file type differently
 */
export const validateVideoFile = async (
  uri: string,
  fileSize: number
): Promise<VideoValidationResult> => {
  const errors: string[] = [];

  // Check file exists
  if (!uri) {
    return { isValid: false, errors: ['No file provided'] };
  }

  // Check file size
  if (fileSize === 0) {
    errors.push('File appears to be empty');
  } else if (fileSize > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
    const maxSizeMB = VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024);
    const fileSizeMB = fileSize / (1024 * 1024);
    errors.push(
      `File size too large (${fileSizeMB.toFixed(1)}MB). Maximum size: ${maxSizeMB}MB`
    );
  }

  // Check video duration if other validations pass
  // Skip on web - expo-av doesn't support video duration on web
  if (errors.length === 0 && Platform.OS !== 'web') {
    try {
      const duration = await getVideoDuration(uri);
      if (duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
        errors.push(
          `Video too long (${Math.round(duration)}s). Maximum duration: ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error reading video duration';
      errors.push(`Unable to read video duration: ${errorMessage}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Gets the duration of a video file
 * Uses expo-av for React Native
 */
export const getVideoDuration = async (uri: string): Promise<number> => {
  try {
    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false }
    );

    if (status.isLoaded && status.durationMillis) {
      await sound.unloadAsync();
      return status.durationMillis / 1000; // Convert to seconds
    }

    await sound.unloadAsync();
    throw new Error('Could not load video duration');
  } catch (error) {
    throw new Error('Failed to load video metadata');
  }
};

/**
 * Validates video metadata (title, description)
 */
export const validateVideoMetadata = (
  title?: string,
  description?: string
): VideoValidationResult => {
  const errors: string[] = [];

  // Title validation
  if (title !== undefined) {
    if (title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (title.length > VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH) {
      errors.push(
        `Title too long (${title.length} characters). Maximum length: ${VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH} characters`
      );
    }
  }

  // Description validation
  if (description !== undefined) {
    if (description.length > VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
      errors.push(
        `Description too long (${description.length} characters). Maximum length: ${VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generates a thumbnail from a video file
 * Uses expo-video-thumbnails for React Native (iOS/Android only)
 * On web, returns null as expo-video-thumbnails is not supported
 * Note: May fail with HEVC/H.265 encoded videos on Android emulator
 */
export const generateVideoThumbnail = async (
  uri: string,
  timeInSeconds: number = 1
): Promise<string> => {
  // Use different strategies for web vs native
  if (Platform.OS === 'web') {
    return generateWebThumbnail(uri, timeInSeconds);
  }
  
  try {
    
    const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: timeInSeconds * 1000, // Convert to milliseconds
      quality: 0.7,
    });
    
    return thumbnailUri;
  } catch (error) {
    console.error('[videoValidation] Thumbnail generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to generate thumbnail: ${errorMessage}. Video may use unsupported codec (HEVC/H.265). Use H.264 instead.`
    );
  }
};

/**
 * Generate thumbnail on web using HTML5 video element and canvas
 */
const generateWebThumbnail = (videoUri: string, timeInSeconds: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      // Seek to specified time (or 1 second if video is shorter)
      video.currentTime = Math.min(timeInSeconds, video.duration - 0.1);
    };
    
    video.onseeked = () => {
      try {
        // Create canvas and draw video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL (JPEG)
        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.7);        
        // Clean up
        video.pause();
        video.src = '';
        video.load();
        
        resolve(thumbnailDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video for thumbnail generation'));
    };
    
    // Set timeout in case video never loads
    const timeout = setTimeout(() => {
      video.pause();
      video.src = '';
      reject(new Error('Thumbnail generation timed out'));
    }, 10000);
    
    video.oncanplay = () => {
      clearTimeout(timeout);
    };
    
    video.src = videoUri;
    video.load();
  });
};

/**
 * Gets file size from URI
 * Uses multiple fallback strategies for maximum compatibility
 */
export const getFileSize = async (uri: string): Promise<number> => {
  try {
    // Strategy 1: Try expo-file-system (most reliable for local files)
    // Skip on web - FileSystem.getInfoAsync is not available
    if (Platform.OS !== 'web') {
      try {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (fileInfo && 'exists' in fileInfo && fileInfo.exists && 'size' in fileInfo && typeof fileInfo.size === 'number') {
          return fileInfo.size;
        }
      } catch (fsError) {
        // Swallow error, try next strategy
      }
    }

    // Strategy 2: Fetch as blob (works for web and as fallback for mobile)
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      if (blob && blob.size > 0) {
        return blob.size;
      }
    } catch (fetchError) {
      // Swallow error, try next strategy
    }

    throw new Error('Could not determine file size using any method');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[videoValidation] getFileSize failed:', errorMessage);
    throw new Error(`Failed to read file size: ${errorMessage}`);
  }
};
