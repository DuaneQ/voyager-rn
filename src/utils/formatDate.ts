/**
 * formatDate.ts
 * 
 * Pure utility functions for consistent timestamp formatting across chat UI.
 * Handles relative time formatting (Today, Yesterday) and absolute formatting.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Convert various timestamp types to Date object.
 */
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  // Check for Firestore Timestamp (has toDate method)
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  // Check for timestamp with seconds property
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }
  // Handle numeric timestamps
  if (typeof timestamp === 'number') return new Date(timestamp);
  // Fallback
  return new Date();
}

/**
 * Format a timestamp for display in the connections list or message thread.
 * Shows relative time for recent messages, absolute time for older ones.
 * 
 * @param timestamp - Firestore Timestamp or Date object
 * @returns Formatted string like "2:34 PM", "Yesterday", or "Jan 15"
 */
export function formatMessageTime(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';

  const date = toDate(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Less than 1 minute ago
  if (diffMinutes < 1) {
    return 'Just now';
  }

  // Less than 1 hour ago
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  // Today - show time
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() && 
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()) {
    return 'Yesterday';
  }

  // This week - show day name
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  // This year - show month and day
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  // Older - show month, day, and year
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a full date for display (e.g., in message headers).
 * 
 * @param timestamp - Firestore Timestamp or Date object
 * @returns Formatted string like "January 15, 2025 at 2:34 PM"
 */
export function formatFullDate(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';

  const date = toDate(timestamp);
  
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date for grouping messages by day in the chat thread.
 * 
 * @param timestamp - Firestore Timestamp or Date object
 * @returns Formatted string like "Today", "Yesterday", or "January 15, 2025"
 */
export function formatDateHeader(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';

  const date = toDate(timestamp);
  const now = new Date();

  // Today
  if (date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()) {
    return 'Today';
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear()) {
    return 'Yesterday';
  }

  // Older - show full date
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get a relative time description (e.g., "2 hours ago", "3 days ago").
 * 
 * @param timestamp - Firestore Timestamp or Date object
 * @returns Formatted string like "2 hours ago" or "Just now"
 */
export function formatRelativeTime(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '';

  const date = toDate(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
}

/**
 * Parse a YYYY-MM-DD date string as local date (not UTC).
 * Prevents timezone shift issues where dates display as previous day.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone, or Invalid Date if format is wrong
 */
export function parseLocalDate(dateString: string): Date {
  // Validate input
  if (!dateString || typeof dateString !== 'string') {
    console.warn('[parseLocalDate] Invalid input:', dateString);
    return new Date(NaN); // Return Invalid Date
  }
  
  // Validate YYYY-MM-DD format
  const parts = dateString.split('-');
  if (parts.length !== 3) {
    console.warn('[parseLocalDate] Invalid date format (expected YYYY-MM-DD):', dateString);
    return new Date(NaN);
  }
  
  const [year, month, day] = parts.map(Number);
  
  // Validate parsed numbers
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.warn('[parseLocalDate] Non-numeric date components:', dateString);
    return new Date(NaN);
  }
  
  // Basic range checks for month and day
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    console.warn('[parseLocalDate] Out-of-range date components:', dateString);
    return new Date(NaN);
  }
  
  // Create date and validate it's real (catches invalid dates like Feb 31)
  const date = new Date(year, month - 1, day);
  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    console.warn('[parseLocalDate] Invalid date (non-existent calendar day):', dateString);
    return new Date(NaN);
  }
  
  return date;
}

/**
 * Parse and format itinerary dates for display.
 * Handles multiple input formats and always parses as local date to avoid timezone shifts.
 * 
 * Supported formats:
 * - ISO strings: "2026-02-05T00:00:00.000Z" → "Feb 5, 2026"
 * - YYYY-MM-DD: "2026-02-05" → "Feb 5, 2026"
 * - Firestore Timestamp objects: {seconds: 1234567890} → formatted date
 * 
 * @param dateStr - Date string or Firestore Timestamp object
 * @returns Formatted string like "Feb 5, 2026" or "Invalid Date" on error
 */
export function parseAndFormatItineraryDate(dateStr: any): string {
  if (!dateStr) return 'No Date';
  
  try {
    // Handle Firestore Timestamp objects
    if (typeof dateStr === 'object' && dateStr !== null) {
      if (dateStr.seconds !== undefined) {
        const d = new Date(dateStr.seconds * 1000);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      if (dateStr.toDate && typeof dateStr.toDate === 'function') {
        const d = dateStr.toDate();
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return 'Invalid Date';
    }
    
    if (typeof dateStr !== 'string') return 'Invalid Date';
    
    // For ISO strings like '2026-02-05T00:00:00.000Z', extract the date part
    // BEFORE 'T' to avoid UTC→local timezone shift
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    
    // Parse YYYY-MM-DD as local date using the shared utility
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return dateStr;
    
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
    
    const date = parseLocalDate(dateOnly);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (err) {
    console.warn('[parseAndFormatItineraryDate] Date parse error:', dateStr, err);
    return typeof dateStr === 'string' ? dateStr : 'Invalid Date';
  }
}

/**
 * Format a date in local timezone (YYYY-MM-DD).
 * Used for itinerary dates and other date inputs that need consistent formatting.
 * 
 * @param date - Date object to format
 * @returns Formatted string like "2025-01-15"
 */
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
