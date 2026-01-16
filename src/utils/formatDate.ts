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
