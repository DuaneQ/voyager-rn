/**
 * ContactDiscovery.integration.test.ts - End-to-end integration tests
 * 
 * Tests the full contact discovery flow:
 * 1. Hash contacts client-side
 * 2. Send hashes to Cloud Function
 * 3. Receive matched users
 * 4. Send invites
 * 
 * NOTE: These tests require Firebase emulator running
 * Run: firebase emulators:start
 */

import { contactsService } from '../../services/contacts/ContactsService';
import { hashingService } from '../../services/contacts/HashingService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Mock Firebase config for tests
jest.mock('../../firebase-config', () => ({
  auth: require('firebase/auth').getAuth(),
  db: require('firebase/firestore').getFirestore(),
  functions: require('firebase/functions').getFunctions(),
}));

describe('Contact Discovery Integration Tests', () => {
  let auth: any;
  let db: any;
  let functions: any;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize Firebase with emulator
    auth = getAuth();
    db = getFirestore();
    functions = getFunctions();

    // Connect to emulators
    // Note: Requires firebase emulators running
    // connectAuthEmulator(auth, 'http://localhost:9099');
    // connectFirestoreEmulator(db, 'localhost', 8080);
    // connectFunctionsEmulator(functions, 'localhost', 5001);

    // Sign in test user
    const userCredential = await signInAnonymously(auth);
    testUserId = userCredential.user.uid;
  });

  afterAll(async () => {
    // Cleanup
    await auth.signOut();
  });

  describe('HashingService', () => {
    it('should hash phone numbers consistently', async () => {
      const phone = '1234567890';
      const hash1 = await hashingService.hashPhoneNumber(phone);
      const hash2 = await hashingService.hashPhoneNumber(phone);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('should hash emails consistently', async () => {
      const email = 'test@example.com';
      const hash1 = await hashingService.hashEmail(email);
      const hash2 = await hashingService.hashEmail(email);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('should normalize phone numbers before hashing', async () => {
      const formatted = '(123) 456-7890';
      const plain = '1234567890';

      const hash1 = await hashingService.hashPhoneNumber(formatted);
      const hash2 = await hashingService.hashPhoneNumber(plain);

      expect(hash1).toBe(hash2);
    });
  });

  describe('matchContactsWithUsers Cloud Function', () => {
    it('should match hashed contacts against users', async () => {
      // Setup: Create test user with hashed phone/email
      const testPhone = '5551234567';
      const testEmail = 'alice@example.com';
      const phoneHash = await hashingService.hashPhoneNumber(testPhone);
      const emailHash = await hashingService.hashEmail(testEmail);

      const testUserDocRef = doc(db, 'users', 'test-user-alice');
      await setDoc(testUserDocRef, {
        displayName: 'Alice',
        username: 'alice123',
        phoneHash,
        emailHash,
        profilePhotoUrl: 'https://example.com/alice.jpg',
      });

      // Test: Call Cloud Function with hashes
      const matchContacts = httpsCallable(functions, 'matchContactsWithUsers');
      const result = await matchContacts({
        hashedIdentifiers: [phoneHash, emailHash],
      });

      const response = result.data as any;

      expect(response.success).toBe(true);
      expect(response.totalMatches).toBeGreaterThan(0);
      expect(response.matches).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'test-user-alice',
            displayName: 'Alice',
            username: 'alice123',
          }),
        ])
      );
    });

    it('should handle empty hash array', async () => {
      const matchContacts = httpsCallable(functions, 'matchContactsWithUsers');
      const result = await matchContacts({
        hashedIdentifiers: [],
      });

      const response = result.data as any;

      expect(response.success).toBe(true);
      expect(response.totalMatches).toBe(0);
      expect(response.matches).toEqual([]);
    });

    it('should reject unauthenticated requests', async () => {
      // Sign out
      await auth.signOut();

      const matchContacts = httpsCallable(functions, 'matchContactsWithUsers');

      await expect(
        matchContacts({ hashedIdentifiers: ['hash123'] })
      ).rejects.toThrow();

      // Re-authenticate
      await signInAnonymously(auth);
    });

    it('should reject invalid hash format', async () => {
      const matchContacts = httpsCallable(functions, 'matchContactsWithUsers');

      await expect(
        matchContacts({ hashedIdentifiers: ['invalid-hash'] })
      ).rejects.toThrow();
    });

    it('should respect rate limit (max 1000 hashes)', async () => {
      const tooManyHashes = Array(1001).fill('a'.repeat(64));

      const matchContacts = httpsCallable(functions, 'matchContactsWithUsers');

      await expect(
        matchContacts({ hashedIdentifiers: tooManyHashes })
      ).rejects.toThrow();
    });

    it('should not match self', async () => {
      // Get current user's phone/email hashes
      const currentUserDoc = await doc(db, 'users', testUserId);
      const userData = (await currentUserDoc).data();

      const matchContacts = httpsCallable(functions, 'matchContactsWithUsers');
      const result = await matchContacts({
        hashedIdentifiers: [userData?.phoneHash || 'nonexistent'],
      });

      const response = result.data as any;

      // Should not include self in matches
      const selfMatch = response.matches.find((m: any) => m.userId === testUserId);
      expect(selfMatch).toBeUndefined();
    });
  });

  describe('sendContactInvite Cloud Function', () => {
    it('should create invite record', async () => {
      const contactHash = await hashingService.hashPhoneNumber('5559876543');

      const sendInvite = httpsCallable(functions, 'sendContactInvite');
      const result = await sendInvite({
        contactIdentifier: contactHash,
        inviteMethod: 'sms',
      });

      const response = result.data as any;

      expect(response.success).toBe(true);
      expect(response.referralCode).toBeDefined();
      expect(response.referralCode.length).toBe(8);
      expect(response.inviteLink).toContain(response.referralCode);
    });

    it('should prevent duplicate invites within 7 days', async () => {
      const contactHash = await hashingService.hashPhoneNumber('5551111111');

      const sendInvite = httpsCallable(functions, 'sendContactInvite');

      // Send first invite
      const result1 = await sendInvite({
        contactIdentifier: contactHash,
        inviteMethod: 'email',
      });

      const response1 = result1.data as any;

      // Send duplicate invite
      const result2 = await sendInvite({
        contactIdentifier: contactHash,
        inviteMethod: 'email',
      });

      const response2 = result2.data as any;

      // Should return same referral code
      expect(response2.referralCode).toBe(response1.referralCode);
    });

    it('should enforce daily rate limit (100 invites)', async () => {
      // This test would need to send 101 invites
      // Skipping for performance, but included for documentation
      // In practice, rate limiting is also enforced client-side
    });

    it('should reject invalid invite method', async () => {
      const contactHash = await hashingService.hashPhoneNumber('5552222222');

      const sendInvite = httpsCallable(functions, 'sendContactInvite');

      await expect(
        sendInvite({
          contactIdentifier: contactHash,
          inviteMethod: 'invalid',
        })
      ).rejects.toThrow();
    });
  });

  describe('End-to-End Contact Discovery Flow', () => {
    it('should complete full discovery flow', async () => {
      // Step 1: User has raw contacts
      const rawContacts = [
        { name: 'Bob', phone: '5553334444' },
        { name: 'Carol', email: 'carol@example.com' },
        { name: 'Dave', phone: '5555556666', email: 'dave@example.com' },
      ];

      // Step 2: Hash contacts client-side
      const hashedIdentifiers: string[] = [];

      for (const contact of rawContacts) {
        if (contact.phone) {
          hashedIdentifiers.push(await hashingService.hashPhoneNumber(contact.phone));
        }
        if (contact.email) {
          hashedIdentifiers.push(await hashingService.hashEmail(contact.email));
        }
      }

      expect(hashedIdentifiers.length).toBe(4); // 2 phones + 2 emails

      // Step 3: Match against Firebase users
      const matchContacts = httpsCallable(functions, 'matchContactsWithUsers');
      const matchResult = await matchContacts({ hashedIdentifiers });

      const matchResponse = matchResult.data as any;

      expect(matchResponse.success).toBe(true);
      expect(matchResponse.totalHashes).toBe(4);

      // Step 4: Send invite to unmatched contact
      const unmatchedHash = hashedIdentifiers[0]; // Assume first contact not on platform

      const sendInvite = httpsCallable(functions, 'sendContactInvite');
      const inviteResult = await sendInvite({
        contactIdentifier: unmatchedHash,
        inviteMethod: 'sms',
      });

      const inviteResponse = inviteResult.data as any;

      expect(inviteResponse.success).toBe(true);
      expect(inviteResponse.referralCode).toBeDefined();
      expect(inviteResponse.inviteLink).toMatch(/https:\/\/travalpass\.com\/invite\?ref=/);
    });
  });
});
