/**
 * Video Validation Utilities
 * Adapted from PWA for React Native - simplified for mobile use
 */

import { Audio } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { VideoValidationResult, VIDEO_CONSTRAINTS } from '../types/Video';
import * as FileSystem from 'expo-file-system';

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
  if (errors.length === 0) {
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
 * Uses expo-video-thumbnails for React Native
 */
export const generateVideoThumbnail = async (
  uri: string,
  timeInSeconds: number = 1
): Promise<string> => {
  try {
    const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(uri, {
      time: timeInSeconds * 1000, // Convert to milliseconds
      quality: 0.7,
    });

    return thumbnailUri;
  } catch (error) {
    throw new Error(
      `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Gets file size from URI
 */
export const getFileSize = async (uri: string): Promise<number> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && 'size' in fileInfo) {
      return fileInfo.size;
    }
    throw new Error('Could not get file size');
  } catch (error) {
    throw new Error('Failed to read file size');
  }
};
