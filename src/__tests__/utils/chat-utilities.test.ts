/**
 * Comprehensive unit tests for chat connection utilities
 * Tests: sanitizeMessage and formatDate (core utilities completed)
 */

import { sanitizeMessage } from '../../utils/sanitizeMessage';
import { formatMessageTime, formatFullDate, formatDateHeader, formatRelativeTime } from '../../utils/formatDate';

describe('sanitizeMessage', () => {
  it('should trim whitespace', () => {
    const input = '   Hello World   ';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe('Hello World');
  });

  it('should remove control characters', () => {
    const input = 'Hello\x00\x01\x02World';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe('HelloWorld');
  });

  it('should enforce max length (1000 chars)', () => {
    const input = 'a'.repeat(1500);
    const sanitized = sanitizeMessage(input);
    expect(sanitized.length).toBeLessThanOrEqual(1000);
  });

  it('should handle empty strings', () => {
    expect(sanitizeMessage('')).toBe('');
    expect(sanitizeMessage('   ')).toBe('');
  });

  it('should preserve safe text', () => {
    const input = 'Hello! How are you? 😊';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toBe(input);
  });

  it('should remove HTML tags to prevent XSS', () => {
    const input = '<script>alert("xss")</script>Hello<b>World</b>';
    const sanitized = sanitizeMessage(input);
    // Should strip tags but keep text content
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('<b>');
    expect(sanitized).toContain('Hello');
    expect(sanitized).toContain('World');
  });

  it('should handle newlines and tabs safely', () => {
    const input = 'Line 1\nLine 2\tTabbed';
    const sanitized = sanitizeMessage(input);
    expect(sanitized).toContain('Line 1');
    expect(sanitized).toContain('Line 2');
  });
});

describe('formatDate', () => {
  const now = new Date('2025-11-16T15:30:00.000Z');
  const mockTimestamp = (date: Date) => ({
    seconds: date.getTime() / 1000,
    nanoseconds: 0,
    toDate: () => date,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('formatMessageTime', () => {
    it('should return "Just now" for very recent messages', () => {
      const recent = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      expect(formatMessageTime(recent)).toBe('Just now');
    });

    it('should return minutes ago for recent messages', () => {
      const recent = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago
      expect(formatMessageTime(recent)).toBe('15m ago');
    });

    it('should return time for messages from earlier today', () => {
      // Create a date 5 hours ago (definitely earlier today)
      const earlyToday = new Date(now);
      earlyToday.setHours(now.getHours() - 5);
      const result = formatMessageTime(earlyToday);
      // Should show time like "10:30 AM" not "Just now"
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatMessageTime(yesterday)).toBe('Yesterday');
    });

    it('should return day name for this week', () => {
      const thisWeek = new Date(now);
      thisWeek.setDate(thisWeek.getDate() - 3);
      const result = formatMessageTime(thisWeek);
      expect(result).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
    });

    it('should return month and day for this year', () => {
      const thisYear = new Date(now);
      thisYear.setMonth(thisYear.getMonth() - 2);
      const result = formatMessageTime(thisYear);
      expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it('should handle Firestore Timestamps with toDate method', () => {
      const timestamp = mockTimestamp(new Date(now.getTime() - 5 * 60 * 1000));
      const result = formatMessageTime(timestamp as any);
      expect(result).toBe('5m ago');
    });

    it('should handle null/undefined gracefully', () => {
      expect(formatMessageTime(null)).toBe('');
      expect(formatMessageTime(undefined)).toBe('');
    });
  });

  describe('formatFullDate', () => {
    it('should format full date with time', () => {
      const date = new Date('2025-01-15T14:30:00.000Z');
      const result = formatFullDate(date);
      expect(result).toContain('January 15, 2025');
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should handle null/undefined gracefully', () => {
      expect(formatFullDate(null)).toBe('');
      expect(formatFullDate(undefined)).toBe('');
    });
  });

  describe('formatDateHeader', () => {
    it('should return "Today" for today', () => {
      expect(formatDateHeader(now)).toBe('Today');
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatDateHeader(yesterday)).toBe('Yesterday');
    });

    it('should return full date for older dates', () => {
      const older = new Date('2025-10-01T10:00:00.000Z');
      const result = formatDateHeader(older);
      expect(result).toBe('October 1, 2025');
    });

    it('should handle null/undefined gracefully', () => {
      expect(formatDateHeader(null)).toBe('');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "Just now" for very recent', () => {
      const recent = new Date(now.getTime() - 30 * 1000);
      expect(formatRelativeTime(recent)).toBe('Just now');
    });

    it('should return relative time descriptions', () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
    });

    it('should handle singular units', () => {
      const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
      expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago');

      const oneMinuteAgo = new Date(now.getTime() - 1 * 60 * 1000);
      expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago');
    });

    it('should handle months and years', () => {
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoMonthsAgo)).toContain('month');

      const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoYearsAgo)).toContain('year');
    });
  });
});
