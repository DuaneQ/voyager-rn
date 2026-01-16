/**
 * Security tests for image URL validation
 * Tests XSS prevention for image URLs
 */

import { isValidHttpUrl } from '../../utils/imageValidation';

describe('isValidHttpUrl - XSS Prevention', () => {
  describe('Valid URLs', () => {
    it('should accept http:// URLs', () => {
      expect(isValidHttpUrl('http://example.com/image.jpg')).toBe(true);
      expect(isValidHttpUrl('http://cdn.example.com/path/to/image.png')).toBe(true);
    });

    it('should accept https:// URLs', () => {
      expect(isValidHttpUrl('https://example.com/image.jpg')).toBe(true);
      expect(isValidHttpUrl('https://cdn.example.com/path/to/image.png')).toBe(true);
    });

    it('should be case-insensitive for protocol', () => {
      expect(isValidHttpUrl('HTTP://example.com/image.jpg')).toBe(true);
      expect(isValidHttpUrl('HTTPS://example.com/image.jpg')).toBe(true);
      expect(isValidHttpUrl('HtTp://example.com/image.jpg')).toBe(true);
    });

    it('should handle URLs with query parameters', () => {
      expect(isValidHttpUrl('https://example.com/image.jpg?size=large&format=png')).toBe(true);
    });

    it('should handle URLs with fragments', () => {
      expect(isValidHttpUrl('https://example.com/image.jpg#main')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(isValidHttpUrl('  https://example.com/image.jpg  ')).toBe(true);
      expect(isValidHttpUrl('\nhttps://example.com/image.jpg\n')).toBe(true);
    });
  });

  describe('XSS Attack Prevention', () => {
    it('should reject javascript: URLs', () => {
      expect(isValidHttpUrl('javascript:alert("XSS")')).toBe(false);
      expect(isValidHttpUrl('JavaScript:alert("XSS")')).toBe(false);
      expect(isValidHttpUrl('JAVASCRIPT:alert("XSS")')).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(isValidHttpUrl('data:text/html,<script>alert("XSS")</script>')).toBe(false);
      expect(isValidHttpUrl('data:image/svg+xml,<svg><script>alert("XSS")</script></svg>')).toBe(false);
      expect(isValidHttpUrl('DATA:text/html,<script>alert("XSS")</script>')).toBe(false);
    });

    it('should reject vbscript: URLs', () => {
      expect(isValidHttpUrl('vbscript:msgbox("XSS")')).toBe(false);
      expect(isValidHttpUrl('VBScript:msgbox("XSS")')).toBe(false);
    });

    it('should reject file: URLs', () => {
      expect(isValidHttpUrl('file:///etc/passwd')).toBe(false);
      expect(isValidHttpUrl('file://localhost/etc/passwd')).toBe(false);
      expect(isValidHttpUrl('FILE:///etc/passwd')).toBe(false);
    });

    it('should reject about: URLs', () => {
      expect(isValidHttpUrl('about:blank')).toBe(false);
      expect(isValidHttpUrl('about:srcdoc')).toBe(false);
    });

    it('should reject URLs with embedded javascript:', () => {
      expect(isValidHttpUrl('http://example.com?url=javascript:alert("XSS")')).toBe(true); // Query param is OK
      expect(isValidHttpUrl('javascript:alert(String.fromCharCode(88,83,83))')).toBe(false);
    });

    it('should reject obfuscated javascript: URLs', () => {
      expect(isValidHttpUrl('jAvAsCrIpT:alert("XSS")')).toBe(false);
      expect(isValidHttpUrl(' javascript:alert("XSS")')).toBe(false);
    });
  });

  describe('Invalid/Edge Cases', () => {
    it('should reject null and undefined', () => {
      expect(isValidHttpUrl(null)).toBe(false);
      expect(isValidHttpUrl(undefined)).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidHttpUrl('')).toBe(false);
      expect(isValidHttpUrl('   ')).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(isValidHttpUrl(123 as any)).toBe(false);
      expect(isValidHttpUrl({} as any)).toBe(false);
      expect(isValidHttpUrl([] as any)).toBe(false);
    });

    it('should reject relative URLs', () => {
      expect(isValidHttpUrl('/path/to/image.jpg')).toBe(false);
      expect(isValidHttpUrl('./image.jpg')).toBe(false);
      expect(isValidHttpUrl('../image.jpg')).toBe(false);
    });

    it('should reject URLs without protocol', () => {
      expect(isValidHttpUrl('example.com/image.jpg')).toBe(false);
      expect(isValidHttpUrl('//example.com/image.jpg')).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(isValidHttpUrl('ht tp://example.com')).toBe(false);
      expect(isValidHttpUrl('http:/example.com')).toBe(false);
      expect(isValidHttpUrl('http:example.com')).toBe(false);
    });
  });

  describe('Firebase Storage URLs', () => {
    it('should accept Firebase Storage URLs', () => {
      expect(isValidHttpUrl('https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg')).toBe(true);
      expect(isValidHttpUrl('https://storage.googleapis.com/bucket/image.jpg')).toBe(true);
    });

    it('should accept signed Firebase URLs with tokens', () => {
      const signedUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/image.jpg?alt=media&token=abc123';
      expect(isValidHttpUrl(signedUrl)).toBe(true);
    });
  });

  describe('CDN URLs', () => {
    it('should accept common CDN URLs', () => {
      expect(isValidHttpUrl('https://cdn.example.com/images/photo.jpg')).toBe(true);
      expect(isValidHttpUrl('https://images.example.com/photo.jpg')).toBe(true);
      expect(isValidHttpUrl('https://static.example.com/photo.jpg')).toBe(true);
    });
  });
});
