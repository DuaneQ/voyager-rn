/**
 * Image Validation Utility
 * Validates image uploads for chat messages
 * Matches pattern from videoValidation.ts
 * Updated for Expo SDK 54+ using new FileSystem API
 */

import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

// Validation constraints
const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_DIMENSION_PX = 2048;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif'];

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
  dimensions?: { width: number; height: number };
  needsConversion?: boolean; // HEIC/HEIF to JPEG
}

/**
 * Validates image file for chat upload
 * @param uri - Image file URI
 * @param mimeType - Image MIME type
 * @returns Validation result
 */
export async function validateImage(
  uri: string,
  mimeType?: string
): Promise<ImageValidationResult> {
  try {
    // Check file extension
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
      uri.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      return {
        isValid: false,
        error: `Invalid image format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }

    // Check MIME type if provided
    if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
      // HEIC/HEIF needs conversion
      if (mimeType === 'image/heic' || mimeType === 'image/heif') {
        return {
          isValid: true,
          needsConversion: true,
        };
      }
      return {
        isValid: false,
        error: `Invalid MIME type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      };
    }

    // Check file size using new File API
    const file = new File(uri);
    const fileSize = await file.size;
    
    if (fileSize > MAX_IMAGE_SIZE_BYTES) {
      return {
        isValid: false,
        error: `Image too large (${(fileSize / 1024 / 1024).toFixed(1)}MB). Max: ${MAX_IMAGE_SIZE_MB}MB`,
        fileSize,
      };
    }

    return {
      isValid: true,
      fileSize,
    };
  } catch (error) {
    console.error('Image validation error:', error);
    return {
      isValid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Compresses and resizes image if needed
 * @param uri - Original image URI
 * @param maxDimension - Maximum width/height
 * @returns Compressed image URI
 */
export async function compressImage(
  uri: string,
  maxDimension: number = MAX_DIMENSION_PX
): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxDimension } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error('Image compression error:', error);
    throw error;
  }
}

/**
 * Converts HEIC/HEIF to JPEG for cross-platform compatibility
 * @param uri - Original HEIC/HEIF URI
 * @returns JPEG URI
 */
export async function convertToJPEG(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // No manipulation, just format conversion
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error('Image conversion error:', error);
    throw error;
  }
}

/**
 * Gets image file size in bytes
 * @param uri - Image URI
 * @returns File size in bytes
 */
export async function getImageSize(uri: string): Promise<number> {
  try {
    const file = new File(uri);
    const size = await file.size;
    return size;
  } catch (error) {
    console.error('Error getting image size:', error);
    return 0;
  }
}

/**
 * Prepares image for upload (validation + compression + conversion)
 * @param uri - Original image URI
 * @param mimeType - Image MIME type
 * @returns Prepared image URI ready for upload
 */
export async function prepareImageForUpload(
  uri: string,
  mimeType?: string
): Promise<{ uri: string; error?: string }> {
  // Validate
  const validation = await validateImage(uri, mimeType);
  if (!validation.isValid) {
    return { uri, error: validation.error };
  }

  try {
    let processedUri = uri;

    // Convert HEIC/HEIF to JPEG
    if (validation.needsConversion) {
      processedUri = await convertToJPEG(processedUri);
    }

    // Compress if needed
    const fileSize = await getImageSize(processedUri);
    if (fileSize > MAX_IMAGE_SIZE_BYTES * 0.8) {
      // Compress if over 80% of max size
      processedUri = await compressImage(processedUri);
    }

    return { uri: processedUri };
  } catch (error) {
    return {
      uri,
      error: `Failed to prepare image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
