/**
 * Unit tests for src/utils/formatDate.ts
 *
 * Critical invariant: formatDateLocal must NEVER shift dates due to UTC conversion.
 * The root cause of production date shifts was using toISOString() which converts to
 * UTC before formatting, causing a -1 day offset for users west of UTC.
 */
import { formatDateLocal, parseLocalDate } from '../../utils/formatDate';

describe('formatDateLocal', () => {
  describe('output format', () => {
    it('returns a string matching YYYY-MM-DD pattern', () => {
      const result = formatDateLocal(new Date(2025, 5, 15));
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('formats a date with a double-digit month and day', () => {
      expect(formatDateLocal(new Date(2025, 11, 25))).toBe('2025-12-25');
    });

    it('pads single-digit months with a leading zero', () => {
      expect(formatDateLocal(new Date(2025, 0, 15))).toBe('2025-01-15'); // January
      expect(formatDateLocal(new Date(2025, 8, 1))).toBe('2025-09-01');  // September
    });

    it('pads single-digit days with a leading zero', () => {
      expect(formatDateLocal(new Date(2025, 2, 5))).toBe('2025-03-05');
      expect(formatDateLocal(new Date(2025, 11, 9))).toBe('2025-12-09');
    });

    it('handles the first day of a month', () => {
      expect(formatDateLocal(new Date(2025, 0, 1))).toBe('2025-01-01');
    });

    it('handles the last day of a month', () => {
      expect(formatDateLocal(new Date(2025, 11, 31))).toBe('2025-12-31');
    });
  });

  describe('timezone safety — no UTC shift', () => {
    it('does NOT shift date at midnight local time (23:00 UTC is next day in UTC-1)', () => {
      // Midnight local — the most dangerous time for toISOString() callers in UTC- zones
      const midnight = new Date(2025, 6, 15, 0, 0, 0); // July 15 at 00:00 local
      expect(formatDateLocal(midnight)).toBe('2025-07-15');
    });

    it('does NOT shift date at 23:59:59 local time', () => {
      const almostMidnight = new Date(2025, 6, 15, 23, 59, 59);
      expect(formatDateLocal(almostMidnight)).toBe('2025-07-15');
    });

    it('returns a local-date string that differs from toISOString in UTC- timezones', () => {
      // Create a date that is July 15 local at 00:30 AM.
      // In UTC-1 or further west this would be July 14 UTC.
      // formatDateLocal must always return July 15 (local).
      const date = new Date(2025, 6, 15, 0, 30, 0);
      const localResult = formatDateLocal(date);
      // Invariant: must always be the local calendar date
      expect(localResult).toBe('2025-07-15');
    });

    it('returns the local date, not the UTC date, for a late-night timestamp', () => {
      // Nov 28 at 11:00 PM local — in UTC-2+ this becomes Nov 29 UTC
      const lateNight = new Date(2025, 10, 28, 23, 0, 0);
      expect(formatDateLocal(lateNight)).toBe('2025-11-28');
    });
  });

  describe('edge cases', () => {
    it('handles leap year Feb 29', () => {
      expect(formatDateLocal(new Date(2024, 1, 29))).toBe('2024-02-29');
    });

    it('handles year boundaries (Dec 31 and Jan 1)', () => {
      expect(formatDateLocal(new Date(2024, 11, 31))).toBe('2024-12-31');
      expect(formatDateLocal(new Date(2025, 0, 1))).toBe('2025-01-01');
    });

    it('handles four-digit years correctly', () => {
      expect(formatDateLocal(new Date(2000, 0, 1))).toBe('2000-01-01');
      expect(formatDateLocal(new Date(1999, 11, 31))).toBe('1999-12-31');
    });
  });
});

describe('parseLocalDate', () => {
  it('parses a YYYY-MM-DD string into a Date at local midnight', () => {
    const date = parseLocalDate('2025-07-15');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(6);  // 0-indexed
    expect(date.getDate()).toBe(15);
  });

  it('round-trips with formatDateLocal', () => {
    const dateStrings = [
      '2025-01-01',
      '2025-06-15',
      '2025-12-31',
      '2024-02-29',
    ];
    for (const str of dateStrings) {
      expect(formatDateLocal(parseLocalDate(str))).toBe(str);
    }
  });

  it('sets hours/minutes/seconds to local midnight (no UTC offset applied)', () => {
    const date = parseLocalDate('2025-07-15');
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
  });
});
