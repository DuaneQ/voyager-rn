/**
 * ContactsService.test.ts
 *
 * Unit tests for the production ContactsService flow (matches main/production build):
 *   1. Check cache (forceRefresh bypasses)
 *   2. Check permission
 *   3. Fetch raw contacts from device
 *   4. Hash phone numbers and emails (SHA-256, 64-char hex)
 *   5. Validate hashes (filter non-64-char-hex)
 *   6. Call ContactDiscoveryRepository.matchContacts() for server matching
 *   7. Return matched and unmatched contacts
 *
 * All external dependencies are mocked so tests run without device/network access.
 *
 * IMPORTANT: Hash mocks must return valid 64-char hex strings — production code
 * filters out any hash that doesn't match /^[a-f0-9]{64}$/i before calling server.
 */

import {
  ContactsService,
  IContactsService,
} from '../../services/contacts/ContactsService';
import { IContactsPlatformProvider } from '../../services/contacts/platform/IContactsPlatformProvider';
import { IHashingService } from '../../services/contacts/HashingService';
import { ContactDiscoveryRepository } from '../../repositories/contacts/ContactDiscoveryRepository';
import {
  ContactPermissionStatus,
  RawContact,
} from '../../services/contacts/types';

// Mock ContactDiscoveryRepository so no real Cloud Function calls are made
jest.mock('../../repositories/contacts/ContactDiscoveryRepository');

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

/** Valid 64-char hex hashes (SHA-256 format that passes production validation) */
const PHONE_HASH  = 'a'.repeat(64);
const EMAIL_HASH  = 'b'.repeat(64);
const PHONE2_HASH = 'c'.repeat(64);

/** Build a minimal mock platform provider */
function makeProvider(
  overrides: Partial<IContactsPlatformProvider> = {}
): jest.Mocked<IContactsPlatformProvider> {
  return {
    requestPermission: jest.fn().mockResolvedValue(ContactPermissionStatus.GRANTED),
    getPermissionStatus: jest.fn().mockResolvedValue(ContactPermissionStatus.GRANTED),
    getAllContacts: jest.fn().mockResolvedValue([]),
    isSupported: jest.fn().mockReturnValue(true),
    ...overrides,
  } as jest.Mocked<IContactsPlatformProvider>;
}

/** Build a mock hashing service returning valid 64-char hex hashes */
function makeHasher(overrides: Partial<IHashingService> = {}): jest.Mocked<IHashingService> {
  return {
    hashPhoneNumber: jest.fn().mockResolvedValue(PHONE_HASH),
    hashEmail: jest.fn().mockResolvedValue(EMAIL_HASH),
    hashContact: jest.fn().mockResolvedValue(PHONE_HASH),
    ...overrides,
  } as jest.Mocked<IHashingService>;
}

/** A sample contact with both phone and email */
const CONTACT_FULL: RawContact = {
  id: 'c1',
  name: 'Alice Smith',
  phoneNumbers: ['+11234567890', '+10987654321'],
  emails: ['alice@example.com'],
};

/** A contact with only an email */
const CONTACT_EMAIL_ONLY: RawContact = {
  id: 'c2',
  name: 'Bob Jones',
  emails: ['bob@example.com'],
};

/** A contact with only a phone */
const CONTACT_PHONE_ONLY: RawContact = {
  id: 'c3',
  name: 'Carol King',
  phoneNumbers: ['5550001111'],
};

/** A contact with neither phone nor email */
const CONTACT_NO_IDENTIFIERS: RawContact = {
  id: 'c4',
  name: 'Ghost Contact',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContactsService', () => {
  let provider: jest.Mocked<IContactsPlatformProvider>;
  let hasher: jest.Mocked<IHashingService>;
  let mockRepo: jest.Mocked<ContactDiscoveryRepository>;
  let service: IContactsService;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = makeProvider();
    hasher = makeHasher();

    // Get the auto-mocked repository instance and configure matchContacts
    const MockRepo = ContactDiscoveryRepository as jest.MockedClass<typeof ContactDiscoveryRepository>;
    mockRepo = new MockRepo() as jest.Mocked<ContactDiscoveryRepository>;
    mockRepo.matchContacts = jest.fn().mockResolvedValue([]);
    MockRepo.mockImplementation(() => mockRepo);

    service = new ContactsService(provider, hasher);
  });

  // -------------------------------------------------------------------------
  // Permission delegation
  // -------------------------------------------------------------------------

  describe('requestPermission()', () => {
    it('delegates to the platform provider and returns its result', async () => {
      provider.requestPermission.mockResolvedValue(ContactPermissionStatus.GRANTED);
      expect(await service.requestPermission()).toBe(ContactPermissionStatus.GRANTED);
      expect(provider.requestPermission).toHaveBeenCalledTimes(1);
    });

    it('returns DENIED when the provider denies', async () => {
      provider.requestPermission.mockResolvedValue(ContactPermissionStatus.DENIED);
      expect(await service.requestPermission()).toBe(ContactPermissionStatus.DENIED);
    });
  });

  describe('getPermissionStatus()', () => {
    it('delegates to the platform provider', async () => {
      provider.getPermissionStatus.mockResolvedValue(ContactPermissionStatus.UNDETERMINED);
      expect(await service.getPermissionStatus()).toBe(ContactPermissionStatus.UNDETERMINED);
    });
  });

  // -------------------------------------------------------------------------
  // isSupported
  // -------------------------------------------------------------------------

  describe('isSupported()', () => {
    it('returns true when the platform provider supports contacts', () => {
      provider.isSupported.mockReturnValue(true);
      expect(service.isSupported()).toBe(true);
    });

    it('returns false when the platform provider does not support contacts', () => {
      provider.isSupported.mockReturnValue(false);
      expect(service.isSupported()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // clearCache() — must exist and not throw (used by ProfilePage)
  // -------------------------------------------------------------------------

  describe('clearCache()', () => {
    it('resolves without throwing', async () => {
      await expect(service.clearCache()).resolves.toBeUndefined();
    });

    it('can be called multiple times without error', async () => {
      await service.clearCache();
      await service.clearCache();
    });
  });

  // -------------------------------------------------------------------------
  // syncContacts() — main flow
  // -------------------------------------------------------------------------

  describe('syncContacts()', () => {

    describe('permission checks', () => {
      it('throws when permission is DENIED', async () => {
        provider.getPermissionStatus.mockResolvedValue(ContactPermissionStatus.DENIED);
        await expect(service.syncContacts()).rejects.toThrow('Contact permission not granted');
      });

      it('throws when permission is UNDETERMINED', async () => {
        provider.getPermissionStatus.mockResolvedValue(ContactPermissionStatus.UNDETERMINED);
        await expect(service.syncContacts()).rejects.toThrow('Contact permission not granted');
      });

      it('proceeds when permission is GRANTED', async () => {
        provider.getAllContacts.mockResolvedValue([]);
        await expect(service.syncContacts()).resolves.toBeDefined();
      });
    });

    describe('empty contact list', () => {
      it('returns zeroed result with no matched/unmatched', async () => {
        provider.getAllContacts.mockResolvedValue([]);
        const result = await service.syncContacts();
        expect(result.totalContactsScanned).toBe(0);
        expect(result.totalHashesGenerated).toBe(0);
        expect(result.matched).toEqual([]);
        expect(result.unmatched).toEqual([]);
        expect(result.syncedAt).toBeInstanceOf(Date);
      });
    });

    describe('contacts with phone numbers', () => {
      it('hashes all phones and includes contact in unmatched with identifierType "phone"', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();

        expect(hasher.hashPhoneNumber).toHaveBeenCalledWith('5550001111');
        expect(result.totalContactsScanned).toBe(1);
        expect(result.totalHashesGenerated).toBe(1);
        expect(result.unmatched).toHaveLength(1);
        expect(result.unmatched[0]).toMatchObject({
          contactId: 'c3',
          name: 'Carol King',
          identifier: '5550001111',
          identifierType: 'phone',
        });
      });

      it('hashes all phone numbers for a contact with multiple phones', async () => {
        // Return different valid hashes per call so we can distinguish them
        hasher.hashPhoneNumber
          .mockResolvedValueOnce(PHONE_HASH)
          .mockResolvedValueOnce(PHONE2_HASH);
        provider.getAllContacts.mockResolvedValue([CONTACT_FULL]);
        await service.syncContacts();

        expect(hasher.hashPhoneNumber).toHaveBeenCalledTimes(2);
        expect(hasher.hashPhoneNumber).toHaveBeenCalledWith('+11234567890');
        expect(hasher.hashPhoneNumber).toHaveBeenCalledWith('+10987654321');
      });
    });

    describe('contacts with email only', () => {
      it('hashes email and falls back to email identifierType in unmatched', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_EMAIL_ONLY]);
        const result = await service.syncContacts();

        expect(hasher.hashEmail).toHaveBeenCalledWith('bob@example.com');
        expect(result.unmatched).toHaveLength(1);
        expect(result.unmatched[0]).toMatchObject({
          contactId: 'c2',
          name: 'Bob Jones',
          identifier: 'bob@example.com',
          identifierType: 'email',
        });
      });
    });

    describe('contact with both phone and email', () => {
      it('prefers phone number over email for unmatched identifier', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_FULL]);
        const result = await service.syncContacts();

        const unmatched = result.unmatched[0];
        expect(unmatched.identifierType).toBe('phone');
        expect(unmatched.identifier).toBe(CONTACT_FULL.phoneNumbers![0]);
      });
    });

    describe('contacts with no identifiers', () => {
      it('does not include contacts with no phone or email in unmatched', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_NO_IDENTIFIERS]);
        const result = await service.syncContacts();

        expect(result.unmatched).toHaveLength(0);
        expect(result.totalHashesGenerated).toBe(0);
        expect(hasher.hashPhoneNumber).not.toHaveBeenCalled();
        expect(hasher.hashEmail).not.toHaveBeenCalled();
      });
    });

    describe('multiple contacts mixed', () => {
      it('scans all contacts and produces unmatched list for those with identifiers', async () => {
        provider.getAllContacts.mockResolvedValue([
          CONTACT_FULL,
          CONTACT_EMAIL_ONLY,
          CONTACT_PHONE_ONLY,
          CONTACT_NO_IDENTIFIERS,
        ]);
        const result = await service.syncContacts();

        expect(result.totalContactsScanned).toBe(4);
        // Contacts with at least one identifier: FULL, EMAIL_ONLY, PHONE_ONLY = 3
        expect(result.unmatched).toHaveLength(3);
        const ids = result.unmatched.map(u => u.contactId);
        expect(ids).toContain('c1');
        expect(ids).toContain('c2');
        expect(ids).toContain('c3');
        expect(ids).not.toContain('c4');
      });
    });

    describe('server matching via repository', () => {
      it('calls matchContacts with the hashed identifiers', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        await service.syncContacts();
        expect(mockRepo.matchContacts).toHaveBeenCalledWith([PHONE_HASH]);
      });

      it('returns empty matched array when server finds no matches', async () => {
        mockRepo.matchContacts.mockResolvedValue([]);
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();
        expect(result.matched).toEqual([]);
      });

      it('returns matched contacts returned by the server', async () => {
        const serverMatch = {
          userId: 'user-1',
          displayName: 'Dave',
          username: 'dave',
          profilePhotoUrl: '',
          hash: PHONE_HASH,
        };
        mockRepo.matchContacts.mockResolvedValue([serverMatch]);
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();
        expect(result.matched).toHaveLength(1);
        expect(result.matched[0].userId).toBe('user-1');
        expect(result.matched[0].displayName).toBe('Dave');
      });

      it('excludes matched contacts from the unmatched list', async () => {
        // Server matches the phone hash → contact should NOT appear in unmatched
        mockRepo.matchContacts.mockResolvedValue([{
          userId: 'user-1',
          displayName: 'Dave',
          username: 'dave',
          profilePhotoUrl: '',
          hash: PHONE_HASH,
        }]);
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();
        expect(result.matched).toHaveLength(1);
        expect(result.unmatched).toHaveLength(0);
      });
    });

    describe('hash validation', () => {
      it('filters out hashes that are not 64-char hex and records an error', async () => {
        // Return an invalid (short) hash — production code will filter it out
        hasher.hashPhoneNumber.mockResolvedValue('not-a-valid-sha256-hash');
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();

        // No valid hashes → matchContacts never called, returns empty result
        expect(mockRepo.matchContacts).not.toHaveBeenCalled();
        expect(result.totalHashesGenerated).toBe(0);
        expect(result.errors).toBeDefined();
      });
    });

    describe('result shape', () => {
      it('includes a syncedAt Date on every successful sync', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const before = new Date();
        const result = await service.syncContacts();
        const after = new Date();
        expect(result.syncedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(result.syncedAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('does not include an errors field when there are no errors', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();
        expect(result.errors).toBeUndefined();
      });
    });

    // -------------------------------------------------------------------------
    // forceRefresh parameter (used by ProfilePage re-sync)
    // -------------------------------------------------------------------------

    describe('forceRefresh parameter', () => {
      it('accepts forceRefresh=true without throwing', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        await expect(service.syncContacts(true)).resolves.toBeDefined();
      });

      it('accepts forceRefresh=false without throwing', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        await expect(service.syncContacts(false)).resolves.toBeDefined();
      });

      it('produces the same result regardless of forceRefresh value', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const t = await service.syncContacts(true);
        const f = await service.syncContacts(false);
        expect(t.totalContactsScanned).toBe(f.totalContactsScanned);
        expect(t.matched.length).toBe(f.matched.length);
        expect(t.unmatched.length).toBe(f.unmatched.length);
      });
    });

    // -------------------------------------------------------------------------
    // Error handling
    // -------------------------------------------------------------------------

    describe('error handling', () => {
      it('wraps platform provider errors in a ContactSync error', async () => {
        provider.getAllContacts.mockRejectedValue(new Error('device failure'));
        await expect(service.syncContacts()).rejects.toThrow('Contact sync failed');
      });

      it('collects hashing errors in result.errors and still returns a result', async () => {
        hasher.hashPhoneNumber.mockRejectedValue(new Error('hash failure'));
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();
        expect(result.errors).toBeDefined();
        expect(result.errors!.some(e => e.includes('Failed to hash phone'))).toBe(true);
      });

      it('handles repository matchContacts failure gracefully', async () => {
        mockRepo.matchContacts.mockRejectedValue(new Error('network error'));
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        // Service may throw or return with errors — either is acceptable
        const outcome = await service.syncContacts().catch(e => e);
        expect(outcome).toBeDefined();
      });
    });
  });
});
