/**
 * PlacesAutocomplete Session Token Tests
 * 
 * Tests the session token functionality that reduces Google Places API costs
 * by grouping autocomplete requests into billing sessions.
 * 
 * Tests the pure utility functions directly to avoid async timing issues.
 */

import {
  generateSessionToken,
  getSessionToken,
  clearSessionToken,
} from '../../components/common/PlacesAutocomplete';

describe('PlacesAutocomplete Session Tokens', () => {
  beforeEach(() => {
    // Clear any existing session token before each test
    clearSessionToken();
  });

  it('should generate valid UUID v4 format for session tokens', () => {
    const token = generateSessionToken();
    
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is 8, 9, a, or b
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(token).toMatch(uuidV4Regex);
  });

  it('should generate unique tokens each time', () => {
    const token1 = generateSessionToken();
    clearSessionToken();
    const token2 = generateSessionToken();
    clearSessionToken();
    const token3 = generateSessionToken();
    
    // All tokens should be different
    expect(token1).not.toBe(token2);
    expect(token2).not.toBe(token3);
    expect(token1).not.toBe(token3);
  });

  it('should return the same token on subsequent getSessionToken calls (session reuse)', () => {
    const token1 = getSessionToken();
    const token2 = getSessionToken();
    const token3 = getSessionToken();
    
    // All calls should return the same token (session reuse)
    expect(token1).toBe(token2);
    expect(token2).toBe(token3);
  });

  it('should generate a new token after clearSessionToken is called', () => {
    const token1 = getSessionToken();
    clearSessionToken();
    const token2 = getSessionToken();
    
    // Token should be different after clearing
    expect(token1).not.toBe(token2);
    
    // Both should be valid UUIDs
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(token1).toMatch(uuidV4Regex);
    expect(token2).toMatch(uuidV4Regex);
  });

  it('should handle rapid successive calls without generating new tokens', () => {
    // Simulate rapid calls during autocomplete typing
    const tokens: string[] = [];
    for (let i = 0; i < 10; i++) {
      tokens.push(getSessionToken());
    }
    
    // All tokens should be identical (same session)
    const firstToken = tokens[0];
    expect(tokens.every(t => t === firstToken)).toBe(true);
  });

  it('should support the full session lifecycle', () => {
    // Session 1: User starts typing
    const session1Token1 = getSessionToken();
    const session1Token2 = getSessionToken();
    const session1Token3 = getSessionToken();
    
    // All should be same (session active)
    expect(session1Token1).toBe(session1Token2);
    expect(session1Token2).toBe(session1Token3);
    
    // User selects a place - clear session
    clearSessionToken();
    
    // Session 2: User starts new search
    const session2Token1 = getSessionToken();
    const session2Token2 = getSessionToken();
    
    // New session should have different token
    expect(session2Token1).not.toBe(session1Token1);
    // But within session 2, tokens should match
    expect(session2Token1).toBe(session2Token2);
  });
});
