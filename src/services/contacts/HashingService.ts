/**
 * HashingService.ts - Privacy-preserving contact hashing
 * 
 * Uses SHA-256 to hash phone numbers and emails before sending to server.
 * This ensures raw contact data never leaves the device (GDPR compliant).
 */

import * as Crypto from 'expo-crypto';

export interface IHashingService {
  hashPhoneNumber(phoneNumber: string): Promise<string>;
  hashEmail(email: string): Promise<string>;
  hashContact(identifier: string): Promise<string>;
}

export class HashingService implements IHashingService {
  /**
   * Normalize and hash a phone number
   * Removes all non-digit characters before hashing
   */
  async hashPhoneNumber(phoneNumber: string): Promise<string> {
    // Normalize: Remove all non-digit characters
    const normalized = phoneNumber.replace(/\D/g, '');
    
    if (normalized.length === 0) {
      throw new Error('Invalid phone number: no digits found');
    }
    
    return this.hashString(normalized);
  }

  /**
   * Normalize and hash an email address
   * Converts to lowercase before hashing
   */
  async hashEmail(email: string): Promise<string> {
    // Normalize: Trim whitespace and convert to lowercase
    const normalized = email.trim().toLowerCase();
    
    if (!this.isValidEmail(normalized)) {
      throw new Error('Invalid email format');
    }
    
    return this.hashString(normalized);
  }

  /**
   * Hash any contact identifier (auto-detects type)
   */
  async hashContact(identifier: string): Promise<string> {
    const trimmed = identifier.trim();
    
    // Check if it looks like an email
    if (trimmed.includes('@')) {
      return this.hashEmail(trimmed);
    }
    
    // Otherwise treat as phone number
    return this.hashPhoneNumber(trimmed);
  }

  /**
   * Core SHA-256 hashing function
   */
  private async hashString(input: string): Promise<string> {
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        input,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      return hash;
    } catch (error) {
      throw new Error(`Hashing failed: ${error}`);
    }
  }

  /**
   * Basic email validation (RFC 5322 simplified)
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Singleton instance
export const hashingService = new HashingService();
