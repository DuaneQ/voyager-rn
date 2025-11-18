/**
 * Message Sanitization Utility
 * Validates and sanitizes chat messages for security and data integrity
 * Cross-platform implementation (web uses DOMPurify, native uses safe normalization)
 */

import { Platform } from 'react-native';

const MAX_MESSAGE_LENGTH = 1000;

// Control characters to strip (except newlines and tabs)
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Sanitizes message text for safe storage and display
 * @param text - Raw message text
 * @returns Sanitized message text
 */
export function sanitizeMessage(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = text.trim();

  // Remove control characters (except newlines and tabs)
  sanitized = sanitized.replace(CONTROL_CHARS_REGEX, '');

  // Enforce max length
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
  }

  // Strip HTML tags regardless of platform for security
  // This prevents any HTML/script injection in stored messages
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Normalize multiple spaces to single space (but preserve newlines)
  sanitized = sanitized.replace(/[^\S\n]+/g, ' ');

  return sanitized;
}

/**
 * Validates message length
 * @param text - Message text
 * @returns True if valid length
 */
export function isValidMessageLength(text: string): boolean {
  return text && text.length > 0 && text.length <= MAX_MESSAGE_LENGTH;
}

/**
 * Gets remaining character count
 * @param text - Current message text
 * @returns Characters remaining
 */
export function getRemainingChars(text: string): number {
  return Math.max(0, MAX_MESSAGE_LENGTH - (text?.length || 0));
}

/**
 * Validates message has content after sanitization
 * @param text - Message text
 * @returns True if message has valid content
 */
export function hasValidContent(text: string): boolean {
  const sanitized = sanitizeMessage(text);
  return sanitized.length > 0;
}
