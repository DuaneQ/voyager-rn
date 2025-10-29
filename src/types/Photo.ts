/**
 * Photo Domain Types
 * Matches PWA photo structure for database compatibility
 */

/**
 * Photo slot identifiers matching PWA structure
 * Updated to support 9 gallery photos (slot1-slot9)
 */
export type PhotoSlot = 'profile' | 'slot1' | 'slot2' | 'slot3' | 'slot4' | 'slot5' | 'slot6' | 'slot7' | 'slot8' | 'slot9';

/**
 * Photo metadata stored in Firestore user document
 */
export interface PhotoMetadata {
  /** URL of the uploaded photo in Firebase Storage */
  url: string;
  /** Optional caption for gallery photos */
  caption?: string;
  /** Upload timestamp (ISO string) */
  uploadedAt: string;
  /** Photo slot identifier */
  slot: PhotoSlot;
}

/**
 * Photos object structure in user profile (matches PWA)
 * Updated to support 9 gallery photos
 */
export interface UserPhotos {
  profile?: string;
  slot1?: string;
  slot2?: string;
  slot3?: string;
  slot4?: string;
  slot5?: string;
  slot6?: string;
  slot7?: string;
  slot8?: string;
  slot9?: string;
}

/**
 * Photo upload progress callback
 */
export interface UploadProgress {
  /** Upload progress percentage (0-100) */
  percent: number;
  /** Bytes transferred */
  bytesTransferred: number;
  /** Total bytes to transfer */
  totalBytes: number;
}

/**
 * Photo upload result
 */
export interface UploadResult {
  /** Download URL from Firebase Storage */
  url: string;
  /** Full storage path */
  storagePath: string;
  /** Slot where photo was uploaded */
  slot: PhotoSlot;
}

/**
 * Photo upload error types
 */
export enum PhotoUploadErrorType {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Photo upload error
 */
export class PhotoUploadError extends Error {
  constructor(
    public type: PhotoUploadErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PhotoUploadError';
  }
}

/**
 * Photo selection options for ImagePicker
 */
export interface PhotoSelectionOptions {
  /** Allow editing after selection */
  allowsEditing?: boolean;
  /** Aspect ratio for editing (width/height) */
  aspect?: [number, number];
  /** Image quality (0-1) */
  quality?: number;
  /** Base64 encoding */
  base64?: boolean;
}

/**
 * Service interfaces (Interface Segregation Principle)
 */

/**
 * Photo upload service interface
 */
export interface IPhotoUploadService {
  /**
   * Upload a photo to Firebase Storage
   * @param uri Local file URI
   * @param slot Photo slot identifier
   * @param userId User ID
   * @param onProgress Progress callback
   * @returns Upload result with download URL
   */
  uploadPhoto(
    uri: string,
    slot: PhotoSlot,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult>;
}

/**
 * Photo deletion service interface
 */
export interface IPhotoDeleteService {
  /**
   * Delete a photo from Firebase Storage
   * @param slot Photo slot identifier
   * @param userId User ID
   */
  deletePhoto(slot: PhotoSlot, userId: string): Promise<void>;
}

/**
 * Photo retrieval service interface
 */
export interface IPhotoRetrievalService {
  /**
   * Get user's photos from Firestore
   * @param userId User ID
   * @returns User photos object
   */
  getUserPhotos(userId: string): Promise<UserPhotos>;
}

/**
 * Combined photo service interface
 */
export interface IPhotoService
  extends IPhotoUploadService,
    IPhotoDeleteService,
    IPhotoRetrievalService {}
