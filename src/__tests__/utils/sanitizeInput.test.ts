import { sanitizeString, sanitizeStringArray, sanitizeLocationString, sanitizeAirportCode, sanitizeAIGenerationRequest } from '../../utils/sanitizeInput';

describe('sanitizeInput', () => {
  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<div>content</div>')).toBe('content');
      expect(sanitizeString('<p>test</p>')).toBe('test');
    });

    it('should normalize whitespace', () => {
      expect(sanitizeString('test   multiple   spaces')).toBe('test multiple spaces');
      expect(sanitizeString('  leading and trailing  ')).toBe('leading and trailing');
    });

    it('should respect maxLength parameter', () => {
      const result = sanitizeString('this is a long string', 10);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('sanitizeStringArray', () => {
    it('should sanitize each string in array', () => {
      const input = ['<div>tag1</div>', 'tag2  ', '  tag3'];
      const result = sanitizeStringArray(input, 10, 50);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should respect maxItems limit', () => {
      const input = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
      const result = sanitizeStringArray(input, 3, 50);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should remove duplicates', () => {
      const input = ['Tag1', 'tag1', 'TAG1'];
      const result = sanitizeStringArray(input, 10, 50);
      expect(result.length).toBe(1);
    });

    it('should handle non-array input', () => {
      expect(sanitizeStringArray(null as any, 10, 50)).toEqual([]);
    });
  });

  describe('sanitizeLocationString', () => {
    it('should preserve valid location names', () => {
      expect(sanitizeLocationString('New York')).toBe('New York');
    });
  });

  describe('sanitizeAirportCode', () => {
    it('should uppercase airport codes', () => {
      expect(sanitizeAirportCode('jfk')).toBe('JFK');
    });

    it('should handle undefined', () => {
      expect(sanitizeAirportCode(undefined)).toBe('');
    });
  });

  describe('sanitizeAIGenerationRequest', () => {
    const validRequest: any = {
      destination: 'Paris',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-07'),
      preferenceProfileId: 'profile-123',
      tripType: 'leisure',
    };

    it('should sanitize destination', () => {
      const request = { ...validRequest, destination: '<div>Paris</div>' };
      const result = sanitizeAIGenerationRequest(request);
      expect(result.destination).toBe('Paris');
    });

    it('should preserve dates', () => {
      const result = sanitizeAIGenerationRequest(validRequest);
      expect(result.startDate).toEqual(validRequest.startDate);
    });
  });
});
