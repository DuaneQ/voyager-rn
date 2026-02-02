/**
 * Image Validation Utility
 * Validates image uploads for chat messages
 * Matches pattern from videoValidation.ts
 * Updated for Expo SDK 54+ using new FileSystem API
 */

import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

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
    // Check MIME type first if provided (more reliable, especially on web)
    if (mimeType) {
      if (ALLOWED_MIME_TYPES.includes(mimeType)) {
        // Valid MIME type, proceed to size check
      } else if (mimeType === 'image/heic' || mimeType === 'image/heif') {
        // HEIC/HEIF needs conversion
        return {
          isValid: true,
          needsConversion: true,
        };
      } else {
        // Invalid MIME type
        return {
          isValid: false,
          error: `Invalid MIME type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        };
      }
    } else {
      // No MIME type provided, check file extension as fallback
      const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) =>
        uri.toLowerCase().endsWith(ext)
      );
      if (!hasValidExtension) {
        return {
          isValid: false,
          error: `Invalid image format. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        };
      }
    }

    // Check file size
    let fileSize: number;
    
    if (Platform.OS === 'web' && uri.startsWith('blob:')) {
      // On web with blob URLs, use fetch to get the size
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        fileSize = blob.size;
      } catch (error) {
        console.error('Error fetching blob size:', error);
        // On web, if we can't get the size, assume it's valid (picker already validated it)
        return { isValid: true };
      }
    } else {
      // On native, use File API
      try {
        const file = new File(uri);
        fileSize = await file.size;
      } catch (error) {
        console.error('Error getting file size:', error);
        // On native, if File API fails, it's an error (file doesn't exist or can't be read)
        return {
          isValid: false,
          error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }
    }
    
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
    if (Platform.OS === 'web' && uri.startsWith('blob:')) {
      // On web with blob URLs, use fetch
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob.size;
    } else {
      // On native, use File API
      const file = new File(uri);
      const size = await file.size;
      return size;
    }
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

/**
 * Validates that a URL is a safe HTTP/HTTPS URL (not javascript:, data:, etc.)
 * Prevents XSS attacks from malicious URLs
 * @param url - URL to validate
 * @returns true if URL is safe (http:// or https:// only)
 */
export function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  // Must start with http:// or https:// (case-insensitive)
  // This explicitly blocks javascript:, data:, file:, etc.
  const trimmedUrl = url.trim().toLowerCase();
  return trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://');
}
