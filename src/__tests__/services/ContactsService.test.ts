/**
 * ContactsService.test.ts
 *
 * Unit tests for the simplified ContactsService flow:
 *   1. Check permission
 *   2. Fetch raw contacts from device
 *   3. Hash phone numbers and emails
 *   4. Return unmatched contacts (server matching is a TODO placeholder)
 *
 * All external dependencies (platform provider, hashing service) are mocked
 * so tests run without any device or network access.
 */

import {
  ContactsService,
  IContactsService,
} from '../../services/contacts/ContactsService';
import { IContactsPlatformProvider } from '../../services/contacts/platform/IContactsPlatformProvider';
import { IHashingService } from '../../services/contacts/HashingService';
import {
  ContactPermissionStatus,
  RawContact,
} from '../../services/contacts/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Build a minimal mock hashing service that returns deterministic hashes */
function makeHasher(overrides: Partial<IHashingService> = {}): jest.Mocked<IHashingService> {
  return {
    hashPhoneNumber: jest.fn().mockImplementation((phone: string) =>
      Promise.resolve('phone-hash-' + phone.replace(/\D/g, ''))
    ),
    hashEmail: jest.fn().mockImplementation((email: string) =>
      Promise.resolve('email-hash-' + email.toLowerCase())
    ),
    hashContact: jest.fn().mockImplementation((identifier: string) =>
      Promise.resolve('hash-' + identifier)
    ),
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
  phoneNumbers: ['(555) 000-1111'],
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
  let service: IContactsService;

  beforeEach(() => {
    provider = makeProvider();
    hasher = makeHasher();
    service = new ContactsService(provider, hasher);
  });

  // -------------------------------------------------------------------------
  // Delegation: permission methods
  // -------------------------------------------------------------------------

  describe('requestPermission()', () => {
    it('delegates to the platform provider and returns its result', async () => {
      provider.requestPermission.mockResolvedValue(ContactPermissionStatus.GRANTED);
      const status = await service.requestPermission();
      expect(status).toBe(ContactPermissionStatus.GRANTED);
      expect(provider.requestPermission).toHaveBeenCalledTimes(1);
    });

    it('returns DENIED when the provider denies permission', async () => {
      provider.requestPermission.mockResolvedValue(ContactPermissionStatus.DENIED);
      const status = await service.requestPermission();
      expect(status).toBe(ContactPermissionStatus.DENIED);
    });
  });

  describe('getPermissionStatus()', () => {
    it('delegates to the platform provider', async () => {
      provider.getPermissionStatus.mockResolvedValue(ContactPermissionStatus.UNDETERMINED);
      const status = await service.getPermissionStatus();
      expect(status).toBe(ContactPermissionStatus.UNDETERMINED);
      expect(provider.getPermissionStatus).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Delegation: isSupported
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
  // clearCache() — compatibility shim, must not throw
  // -------------------------------------------------------------------------

  describe('clearCache()', () => {
    it('resolves without throwing (no-op compatibility shim)', async () => {
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
        provider.getPermissionStatus.mockResolvedValue(ContactPermissionStatus.GRANTED);
        provider.getAllContacts.mockResolvedValue([]);
        const result = await service.syncContacts();
        expect(result).toBeDefined();
      });
    });

    describe('empty contact list', () => {
      it('returns zeroed result with no matched/unmatched when device has no contacts', async () => {
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
      it('hashes all phone numbers and includes contact in unmatched with identifierType "phone"', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();

        expect(hasher.hashPhoneNumber).toHaveBeenCalledWith('(555) 000-1111');
        expect(result.totalContactsScanned).toBe(1);
        expect(result.totalHashesGenerated).toBe(1);
        expect(result.unmatched).toHaveLength(1);
        expect(result.unmatched[0]).toMatchObject({
          contactId: 'c3',
          name: 'Carol King',
          identifier: '(555) 000-1111',
          identifierType: 'phone',
        });
      });

      it('hashes all phone numbers for a contact with multiple phones', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_FULL]);
        const result = await service.syncContacts();

        expect(hasher.hashPhoneNumber).toHaveBeenCalledTimes(2);
        expect(hasher.hashPhoneNumber).toHaveBeenCalledWith('+11234567890');
        expect(hasher.hashPhoneNumber).toHaveBeenCalledWith('+10987654321');
        expect(result.totalHashesGenerated).toBe(1); // 1 HashedContact per device contact
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
        expect(ids).not.toContain('c4'); // no identifiers
      });
    });

    describe('server matching placeholder', () => {
      it('always returns empty matched array (server matching not yet implemented)', async () => {
        provider.getAllContacts.mockResolvedValue([CONTACT_FULL, CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();
        expect(result.matched).toEqual([]);
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
    // Backwards-compatibility: forceRefresh parameter
    // -------------------------------------------------------------------------

    describe('forceRefresh compatibility parameter', () => {
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
        const resultTrue = await service.syncContacts(true);
        const resultFalse = await service.syncContacts(false);
        expect(resultTrue.totalContactsScanned).toBe(resultFalse.totalContactsScanned);
        expect(resultTrue.unmatched.length).toBe(resultFalse.unmatched.length);
        expect(resultTrue.matched).toEqual(resultFalse.matched);
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
        expect(result.errors!.length).toBeGreaterThan(0);
        expect(result.errors![0]).toMatch(/Failed to hash phone/);
      });

      it('still returns an unmatched contact when hashing fails (contact has identifier)', async () => {
        // Hashing fails but unmatched extraction is separate from hashing
        hasher.hashPhoneNumber.mockRejectedValue(new Error('hash failure'));
        provider.getAllContacts.mockResolvedValue([CONTACT_PHONE_ONLY]);
        const result = await service.syncContacts();
        // The contact is still listed as unmatched even though hashing failed
        expect(result.unmatched).toHaveLength(1);
      });
    });
  });
});
