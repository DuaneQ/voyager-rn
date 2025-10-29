/**
 * Video Types
 * Matches PWA Firestore schema exactly for cross-platform compatibility
 */

import { Timestamp } from 'firebase/firestore';

export interface Video {
  id: string;
  userId: string;
  title?: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  isPublic: boolean;
  likes: string[]; // Array of user IDs who liked
  comments: VideoComment[]; // Array of comments
  viewCount: number;
  duration: number; // in seconds
  fileSize: number; // in bytes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VideoComment {
  id: string;
  userId: string;
  text: string;
  createdAt: Timestamp;
}

export interface VideoUploadData {
  title?: string;
  description?: string;
  isPublic: boolean;
  uri: string; // Local file URI for React Native
}

export interface VideoValidationResult {
  isValid: boolean;
  errors: string[];
}

// Constants for video validation - matches PWA exactly
export const VIDEO_CONSTRAINTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_DURATION: 60, // seconds
  SUPPORTED_FORMATS: [
    'video/mp4',
    'video/mov',
    'video/quicktime',
    'video/x-quicktime',
  ] as const,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 200,
} as const;

// Upload state for progress tracking
export interface VideoUploadState {
  loading: boolean;
  progress: number; // 0-100
  error: string | null;
  processingStatus: string | null;
}
