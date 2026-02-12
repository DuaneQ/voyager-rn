/**
 * Contact Discovery Integration Tests
 * 
 * Tests the contact discovery Cloud Functions:
 * - matchContactsWithUsers: Match hashed contacts against Firebase users
 * - sendContactInvite: Send invite and generate referral code
 * 
 * Pattern follows existing integration tests (userProfile.real.test.ts, searchItineraries.real.test.ts)
 * Tests against live mundo1-dev Cloud Functions endpoint
 */

import * as crypto from 'crypto';

const FUNCTION_URL = 'https://us-central1-mundo1-dev.cloudfunctions.net';
const TEST_USER_EMAIL = 'usertravaltest@gmail.com';
const TEST_USER_PASSWORD = '1234567890';

// Helper: Hash phone number (client-side SHA-256)
const hashPhoneNumber = (phone: string): string => {
  const normalized = phone.replace(/\D/g, ''); // Remove non-digits
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

// Helper: Hash email (client-side SHA-256)
const hashEmail = (email: string): string => {
  const normalized = email.toLowerCase().trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

describe('Contact Discovery Integration Tests', () => {
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    // Authenticate to get ID token
    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER_EMAIL,
          password: TEST_USER_PASSWORD,
          returnSecureToken: true,
        }),
      }
    );

    const authData = await authResponse.json();
    if (!authData.idToken) {
      throw new Error('Authentication failed: ' + JSON.stringify(authData));
    }
    authToken = authData.idToken;
    testUserId = authData.localId;
  }, 30000);

  describe('matchContactsWithUsers Cloud Function', () => {
    it('should match hashed contacts against users in Firestore', async () => {
      // Test with known user hashes (these users exist in mundo1-dev)
      // We're hashing fake contact info that might match real users
      const testHashes = [
        hashPhoneNumber('5551234567'),
        hashEmail('test@example.com'),
        hashPhoneNumber('1234567890'),
      ];

      const response = await fetch(`${FUNCTION_URL}/matchContactsWithUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ data: { hashedIdentifiers: testHashes } }),
      });

      const body = await response.json();

      expect(body).toBeDefined();
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
      expect(body.result.totalHashes).toBe(testHashes.length);
      expect(body.result.totalMatches).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(body.result.matches)).toBe(true);

      // Each match should have required fields
      body.result.matches.forEach((match: any) => {
        expect(match.userId).toBeDefined();
        expect(match.displayName).toBeDefined();
        expect(match.hash).toBeDefined();
        expect(typeof match.userId).toBe('string');
        expect(typeof match.displayName).toBe('string');
      });
    }, 15000);

    it('should handle empty hash array', async () => {
      const response = await fetch(`${FUNCTION_URL}/matchContactsWithUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ data: { hashedIdentifiers: [] } }),
      });

      const body = await response.json();

      expect(body.result.success).toBe(true);
      expect(body.result.totalMatches).toBe(0);
      expect(body.result.matches).toEqual([]);
    }, 10000);

    it('should reject invalid hash format', async () => {
      const invalidHashes = ['not-a-hash', '123', 'abc'];

      const response = await fetch(`${FUNCTION_URL}/matchContactsWithUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ data: { hashedIdentifiers: invalidHashes } }),
      });

      const body = await response.json();

      // Should return error for invalid hash format
      expect(body.error).toBeDefined();
      expect(body.error.message).toMatch(/invalid hash format/i);
    }, 10000);

    it('should reject requests exceeding 1000 hash limit', async () => {
      // Generate 1001 fake hashes
      const tooManyHashes = Array.from({ length: 1001 }, (_, i) =>
        hashPhoneNumber(`555000${i.toString().padStart(4, '0')}`)
      );

      const response = await fetch(`${FUNCTION_URL}/matchContactsWithUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ data: { hashedIdentifiers: tooManyHashes } }),
      });

      const body = await response.json();

      // Should return error for exceeding limit
      expect(body.error).toBeDefined();
      expect(body.error.message).toMatch(/maximum 1000/i);
    }, 10000);

    it('should not match self (prevent showing own profile)', async () => {
      // Get authenticated user's email and hash it
      const selfEmailHash = hashEmail(TEST_USER_EMAIL);

      const response = await fetch(`${FUNCTION_URL}/matchContactsWithUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: { hashedIdentifiers: [selfEmailHash] },
        }),
      });

      const body = await response.json();

      expect(body.result.success).toBe(true);

      // Should not include self in matches
      const selfMatch = body.result.matches.find(
        (m: any) => m.userId === testUserId
      );
      expect(selfMatch).toBeUndefined();
    }, 10000);

    it('should require authentication', async () => {
      const testHashes = [hashPhoneNumber('5551234567')];

      // Call without Authorization header
      const response = await fetch(`${FUNCTION_URL}/matchContactsWithUsers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { hashedIdentifiers: testHashes } }),
      });

      const body = await response.json();

      // Should return unauthenticated error
      expect(body.error).toBeDefined();
      expect(body.error.message).toMatch(/must be authenticated/i);
    }, 10000);
  });

  describe('sendContactInvite Cloud Function', () => {
    it('should generate referral code and invite link', async () => {
      const contactHash = hashEmail('friend@example.com');

      const response = await fetch(`${FUNCTION_URL}/sendContactInvite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            contactIdentifier: contactHash,
            inviteMethod: 'email',
          },
        }),
      });

      const body = await response.json();

      // Debug: Log actual response structure
      console.log('[DEBUG] sendContactInvite response:', JSON.stringify(body, null, 2));

      expect(body).toBeDefined();
      expect(body.result).toBeDefined();
      expect(body.result.success).toBe(true);
      expect(body.result.referralCode).toBeDefined();
      expect(body.result.inviteLink).toBeDefined();

      // Referral code should be 8 uppercase alphanumeric characters
      expect(body.result.referralCode).toMatch(/^[A-Z0-9]{8}$/);

      // Invite link should contain referral code
      expect(body.result.inviteLink).toContain(body.result.referralCode);
      expect(body.result.inviteLink).toMatch(/travalpass\.com\/invite\?ref=/);
    }, 15000);

    it('should accept all invite methods (sms, email, link, share)', async () => {
      const methods = ['sms', 'email', 'link', 'share'];

      for (const method of methods) {
        const contactHash = hashEmail(`friend-${method}@example.com`);

        const response = await fetch(`${FUNCTION_URL}/sendContactInvite`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            data: {
              contactIdentifier: contactHash,
              inviteMethod: method,
            },
          }),
        });

        const body = await response.json();

        expect(body.result.success).toBe(true);
        expect(body.result.referralCode).toBeDefined();
      }
    }, 30000);

    it('should return existing referral code for duplicate invite within 7 days', async () => {
      const contactHash = hashEmail('duplicate-test@example.com');

      // Send first invite
      const firstResponse = await fetch(`${FUNCTION_URL}/sendContactInvite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            contactIdentifier: contactHash,
            inviteMethod: 'email',
          },
        }),
      });

      const firstBody = await firstResponse.json();
      const firstReferralCode = firstBody.result.referralCode;

      // Send duplicate invite immediately
      const secondResponse = await fetch(`${FUNCTION_URL}/sendContactInvite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            contactIdentifier: contactHash,
            inviteMethod: 'sms',
          },
        }),
      });

      const secondBody = await secondResponse.json();

      expect(secondBody.result.success).toBe(true);
      // Should return same referral code
      expect(secondBody.result.referralCode).toBe(firstReferralCode);
    }, 20000);

    it('should reject invalid hash format', async () => {
      const response = await fetch(`${FUNCTION_URL}/sendContactInvite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            contactIdentifier: 'invalid-hash',
            inviteMethod: 'email',
          },
        }),
      });

      const body = await response.json();

      // Should return error for invalid hash
      expect(body.error).toBeDefined();
      expect(body.error.message).toMatch(/invalid|hash/i);
    }, 10000);

    it('should reject invalid invite method', async () => {
      const contactHash = hashEmail('test@example.com');

      const response = await fetch(`${FUNCTION_URL}/sendContactInvite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          data: {
            contactIdentifier: contactHash,
            inviteMethod: 'invalid-method',
          },
        }),
      });

      const body = await response.json();

      // Should return error for invalid method
      expect(body.error).toBeDefined();
      expect(body.error.message).toMatch(/inviteMethod|invalid/i);
    }, 10000);

    it('should require authentication', async () => {
      const contactHash = hashEmail('test@example.com');

      // Call without Authorization header
      const response = await fetch(`${FUNCTION_URL}/sendContactInvite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            contactIdentifier: contactHash,
            inviteMethod: 'email',
          },
        }),
      });

      const body = await response.json();

      // Should return unauthenticated error
      expect(body.error).toBeDefined();
      expect(body.error.message).toMatch(/must be authenticated/i);
    }, 10000);
  });

  describe('Hash Consistency (Client-side)', () => {
    it('should hash phone numbers consistently', () => {
      const phone = '1234567890';
      const hash1 = hashPhoneNumber(phone);
      const hash2 = hashPhoneNumber(phone);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should normalize phone numbers before hashing', () => {
      const formatted = '(123) 456-7890';
      const plain = '1234567890';

      const hash1 = hashPhoneNumber(formatted);
      const hash2 = hashPhoneNumber(plain);

      expect(hash1).toBe(hash2);
    });

    it('should hash emails consistently', () => {
      const email = 'test@example.com';
      const hash1 = hashEmail(email);
      const hash2 = hashEmail(email);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should normalize emails before hashing (lowercase, trim)', () => {
      const upperCase = '  TEST@EXAMPLE.COM  ';
      const lowerCase = 'test@example.com';

      const hash1 = hashEmail(upperCase);
      const hash2 = hashEmail(lowerCase);

      expect(hash1).toBe(hash2);
    });
  });
});
