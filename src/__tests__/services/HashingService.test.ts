/**
 * HashingService.test.ts - Unit tests for contact hashing
 */

import { HashingService } from '../../services/contacts/HashingService';

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn((algorithm: string, input: string) => {
    // Simulate SHA-256 by creating a deterministic "hash" for testing
    // Real SHA-256 would be more complex, but for tests we just need consistency
    const mockHash = Buffer.from(input).toString('hex').padEnd(64, '0');
    return Promise.resolve(mockHash);
  }),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA256',
  },
  CryptoEncoding: {
    HEX: 'hex',
  },
}));

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(() => {
    service = new HashingService();
  });

  describe('hashPhoneNumber', () => {
    it('should hash a normalized phone number', async () => {
      const phone = '1234567890';
      const hash = await service.hashPhoneNumber(phone);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]+$/); // Only hex characters
    });

    it('should normalize phone with formatting characters', async () => {
      const phone1 = '(123) 456-7890';
      const phone2 = '123-456-7890';
      const phone3 = '123.456.7890';
      
      const hash1 = await service.hashPhoneNumber(phone1);
      const hash2 = await service.hashPhoneNumber(phone2);
      const hash3 = await service.hashPhoneNumber(phone3);
      
      // All should produce same hash (normalized to 1234567890)
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should throw error for invalid phone number', async () => {
      await expect(service.hashPhoneNumber('')).rejects.toThrow('Invalid phone number');
      await expect(service.hashPhoneNumber('abc')).rejects.toThrow('Invalid phone number');
    });

    it('should handle international phone numbers', async () => {
      const phone = '+44 20 7946 0958'; // UK number
      const hash = await service.hashPhoneNumber(phone);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('hashEmail', () => {
    it('should hash a valid email', async () => {
      const email = 'test@example.com';
      const hash = await service.hashEmail(email);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it('should normalize email to lowercase', async () => {
      const email1 = 'Test@Example.com';
      const email2 = 'test@example.com';
      const email3 = 'TEST@EXAMPLE.COM';
      
      const hash1 = await service.hashEmail(email1);
      const hash2 = await service.hashEmail(email2);
      const hash3 = await service.hashEmail(email3);
      
      // All should produce same hash
      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should trim whitespace from email', async () => {
      const email1 = '  test@example.com  ';
      const email2 = 'test@example.com';
      
      const hash1 = await service.hashEmail(email1);
      const hash2 = await service.hashEmail(email2);
      
      expect(hash1).toBe(hash2);
    });

    it('should throw error for invalid email', async () => {
      await expect(service.hashEmail('notemail')).rejects.toThrow('Invalid email format');
      await expect(service.hashEmail('no@domain')).rejects.toThrow('Invalid email format');
      await expect(service.hashEmail('@example.com')).rejects.toThrow('Invalid email format');
      await expect(service.hashEmail('test@')).rejects.toThrow('Invalid email format');
    });

    it('should handle complex email formats', async () => {
      const complexEmails = [
        'user.name+tag@example.co.uk',
        'user_123@sub.example.com',
        'a@b.c', // Minimal valid email
      ];

      for (const email of complexEmails) {
        const hash = await service.hashEmail(email);
        expect(hash).toBeDefined();
        expect(hash.length).toBe(64);
      }
    });
  });

  describe('hashContact', () => {
    it('should auto-detect and hash email', async () => {
      const email = 'test@example.com';
      const hash = await service.hashContact(email);
      const directHash = await service.hashEmail(email);
      
      expect(hash).toBe(directHash);
    });

    it('should auto-detect and hash phone number', async () => {
      const phone = '1234567890';
      const hash = await service.hashContact(phone);
      const directHash = await service.hashPhoneNumber(phone);
      
      expect(hash).toBe(directHash);
    });

    it('should handle formatted phone numbers', async () => {
      const phone = '+1 (123) 456-7890';
      const hash = await service.hashContact(phone);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });
  });

  describe('deterministic hashing', () => {
    it('should produce same hash for same input', async () => {
      const phone = '1234567890';
      const hash1 = await service.hashPhoneNumber(phone);
      const hash2 = await service.hashPhoneNumber(phone);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', async () => {
      const phone1 = '1234567890';
      const phone2 = '0987654321';
      
      const hash1 = await service.hashPhoneNumber(phone1);
      const hash2 = await service.hashPhoneNumber(phone2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('security properties', () => {
    it('should produce irreversible hashes', async () => {
      const phone = '1234567890';
      const hash = await service.hashPhoneNumber(phone);
      
      // Hash should not contain original phone number
      expect(hash).not.toContain(phone);
    });

    it('should produce fixed-length output', async () => {
      const inputs = [
        '123',
        '1234567890',
        '12345678901234567890', // Very long phone
      ];

      for (const input of inputs) {
        const hash = await service.hashPhoneNumber(input);
        expect(hash.length).toBe(64); // SHA-256 always 64 hex chars
      }
    });
  });
});
