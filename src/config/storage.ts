/**
 * Storage Configuration Constants
 * Defines Firebase Storage paths, limits, and settings
 * Maintains compatibility with PWA storage structure
 */

import { PhotoSlot } from '../types/Photo';

/**
 * Firebase Storage paths (must match PWA structure)
 * PWA uses: photos/{userId}/{slot}/{filename}
 */
export const STORAGE_PATHS = {
  /**
   * Get storage path for profile photo
   * Path: photos/{userId}/profile/{filename}
   */
  profilePhoto: (userId: string, filename: string = 'profile.jpg') => `photos/${userId}/profile/${filename}`,

  /**
   * Get storage path for gallery photo
   * Path: photos/{userId}/{slot}/{filename}
   */
  galleryPhoto: (userId: string, slot: PhotoSlot, filename: string = `${slot}.jpg`) => {
    // slot1-slot4 for gallery photos
    if (slot !== 'profile') {
      return `photos/${userId}/${slot}/${filename}`;
    }
    throw new Error(`Invalid gallery slot: ${slot}`);
  },

  /**
   * Get storage path for any photo slot
   */
  getPath: (userId: string, slot: PhotoSlot, filename?: string) => {
    if (slot === 'profile') {
      return STORAGE_PATHS.profilePhoto(userId, filename);
    }
    return STORAGE_PATHS.galleryPhoto(userId, slot, filename);
  },
} as const;

/**
 * File size limits
 */
export const FILE_SIZE_LIMITS = {
  /** Maximum file size before upload: 2MB */
  MAX_SIZE_BYTES: 2 * 1024 * 1024, // 2MB

  /** Maximum file size display string */
  MAX_SIZE_DISPLAY: '2MB',

  /** Target compressed size: 1MB */
  TARGET_COMPRESSED_SIZE: 1 * 1024 * 1024, // 1MB
} as const;

/**
 * Accepted MIME types for photos
 */
export const ACCEPTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
] as const;

/**
 * File extensions mapping
 */
export const FILE_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/heic': '.jpg', // Convert HEIC to JPEG
  'image/heif': '.jpg', // Convert HEIF to JPEG
} as const;

/**
 * Image compression settings
 */
export const COMPRESSION_SETTINGS = {
  /** JPEG compression quality (0-1) */
  quality: 0.8,

  /** Maximum image width (maintains aspect ratio) */
  maxWidth: 1920,

  /** Maximum image height (maintains aspect ratio) */
  maxHeight: 1920,

  /** Compress format */
  format: 'jpeg' as const,
} as const;

/**
 * Image picker settings
 */
export const IMAGE_PICKER_SETTINGS = {
  /** Allow image editing after selection */
  allowsEditing: true,

  /** Aspect ratio for profile photo [width, height] */
  profileAspect: [1, 1] as [number, number],

  /** Aspect ratio for gallery photos [width, height] */
  galleryAspect: [4, 3] as [number, number],

  /** Image quality (0-1) */
  quality: 0.9,

  /** Enable base64 encoding */
  base64: false,

  /** Media types */
  mediaTypes: 'Images' as const,
} as const;

/**
 * Gallery photo limits
 */
export const GALLERY_LIMITS = {
  /** Maximum number of gallery photos (excluding profile) */
  MAX_PHOTOS: 9,

  /** Gallery photo slots */
  SLOTS: ['slot1', 'slot2', 'slot3', 'slot4', 'slot5', 'slot6', 'slot7', 'slot8', 'slot9'] as PhotoSlot[],
} as const;

/**
 * Upload retry settings
 */
export const UPLOAD_RETRY_SETTINGS = {
  /** Maximum retry attempts */
  maxAttempts: 3,

  /** Initial retry delay (ms) */
  initialDelay: 1000,

  /** Retry delay multiplier */
  delayMultiplier: 2,

  /** Maximum retry delay (ms) */
  maxDelay: 10000,
} as const;

/**
 * Firestore collection names (must match PWA)
 */
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
} as const;

/**
 * Validate file size
 */
export const validateFileSize = (sizeBytes: number): boolean => {
  return sizeBytes <= FILE_SIZE_LIMITS.MAX_SIZE_BYTES;
};

/**
 * Validate MIME type
 */
export const validateMimeType = (mimeType: string): boolean => {
  return ACCEPTED_MIME_TYPES.includes(mimeType as any);
};

/**
 * Get file extension for MIME type
 */
export const getFileExtension = (mimeType: string): string => {
  return FILE_EXTENSIONS[mimeType as keyof typeof FILE_EXTENSIONS] || '.jpg';
};

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
