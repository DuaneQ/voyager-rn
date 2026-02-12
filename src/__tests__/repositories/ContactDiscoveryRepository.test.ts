import { ContactDiscoveryRepository, MatchedContactResult } from '../../repositories/contacts/ContactDiscoveryRepository';

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

jest.mock('../../../firebase-config', () => ({
  app: {},
}));

import { httpsCallable } from 'firebase/functions';

describe('ContactDiscoveryRepository', () => {
  let repository: ContactDiscoveryRepository;
  
  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ContactDiscoveryRepository();
  });
  
  describe('matchContacts', () => {
    it('returns matched contacts when cloud function succeeds', async () => {
      const validHash1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const validHash2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
      
      const mockMatches: MatchedContactResult[] = [
        {
          hash: validHash1,
          userId: 'user1',
          displayName: 'Jane Doe',
          username: 'janedoe',
          profilePhotoUrl: 'https://example.com/photo.jpg',
        },
      ];
      
      const mockFunction = jest.fn().mockResolvedValue({
        data: {
          success: true,
          matches: mockMatches,
          totalHashes: 10,
          totalMatches: 1,
        },
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      const result = await repository.matchContacts([validHash1, validHash2]);
      
      expect(result).toEqual(mockMatches);
      expect(mockFunction).toHaveBeenCalledWith({
        hashedIdentifiers: [validHash1, validHash2],
      });
    });
    
    it('returns empty array when no hashes provided', async () => {
      const result = await repository.matchContacts([]);
      
      expect(result).toEqual([]);
      expect(httpsCallable).not.toHaveBeenCalled();
    });
    
    it('throws error when cloud function returns success: false', async () => {
      const mockFunction = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Invalid hash format',
          matches: [],
          totalHashes: 0,
          totalMatches: 0,
        },
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      await expect(
        repository.matchContacts(['invalid'])
      ).rejects.toThrow('Invalid hash format');
    });
    
    it('throws user-friendly error for unauthenticated requests', async () => {
      const validHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const mockFunction = jest.fn().mockRejectedValue({
        code: 'functions/unauthenticated',
        message: 'Unauthenticated',
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      await expect(
        repository.matchContacts([validHash])
      ).rejects.toThrow('You must be signed in to match contacts');
    });
    
    it('throws user-friendly error for invalid argument', async () => {
      const validHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const mockFunction = jest.fn().mockRejectedValue({
        code: 'functions/invalid-argument',
        message: 'Invalid argument',
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      // Should throw the actual error.message from the function
      await expect(
        repository.matchContacts([validHash])
      ).rejects.toThrow('Invalid argument');
    });
    
    it('throws user-friendly error for rate limit exceeded', async () => {
      const validHash = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const mockFunction = jest.fn().mockRejectedValue({
        code: 'functions/resource-exhausted',
        message: 'Rate limit exceeded',
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      await expect(
        repository.matchContacts([validHash])
      ).rejects.toThrow('Rate limit exceeded. Please try again later.');
    });
  });
  
  describe('sendInvite', () => {
    it('returns referral code and link when invite succeeds', async () => {
      const mockResponse = {
        success: true,
        referralCode: 'ABC12345',
        inviteLink: 'https://travalpass.com/invite?ref=ABC12345',
      };
      
      const mockFunction = jest.fn().mockResolvedValue({
        data: mockResponse,
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      const result = await repository.sendInvite('abc123hash', 'sms', 'John Doe');
      
      expect(result).toEqual(mockResponse);
      expect(mockFunction).toHaveBeenCalledWith({
        contactIdentifier: 'abc123hash',
        inviteMethod: 'sms',
        contactName: 'John Doe',
      });
    });
    
    it('throws error when contact identifier is empty', async () => {
      await expect(
        repository.sendInvite('', 'sms')
      ).rejects.toThrow('Contact identifier is required');
    });
    
    it('throws error when cloud function returns success: false', async () => {
      const mockFunction = jest.fn().mockResolvedValue({
        data: {
          success: false,
          error: 'Rate limit exceeded',
          referralCode: '',
          inviteLink: '',
        },
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      await expect(
        repository.sendInvite('abc123', 'email')
      ).rejects.toThrow('Rate limit exceeded');
    });
    
    it('throws user-friendly error for daily limit reached', async () => {
      const mockFunction = jest.fn().mockRejectedValue({
        code: 'functions/resource-exhausted',
        message: 'Daily limit reached',
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      await expect(
        repository.sendInvite('abc123', 'email')
      ).rejects.toThrow('Daily invite limit reached (100/day). Try again tomorrow.');
    });
    
    it('handles all invite methods correctly', async () => {
      const mockFunction = jest.fn().mockResolvedValue({
        data: {
          success: true,
          referralCode: 'CODE123',
          inviteLink: 'https://travalpass.com/invite?ref=CODE123',
        },
      });
      
      (httpsCallable as jest.Mock).mockReturnValue(mockFunction);
      
      const methods: Array<'sms' | 'email' | 'link' | 'share'> = ['sms', 'email', 'link', 'share'];
      
      for (const method of methods) {
        await repository.sendInvite('hash123', method);
        
        expect(mockFunction).toHaveBeenCalledWith(
          expect.objectContaining({
            inviteMethod: method,
          })
        );
      }
    });
  });
});
