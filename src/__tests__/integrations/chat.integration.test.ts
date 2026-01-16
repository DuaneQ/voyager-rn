/**
 * Chat Integration Tests - DISABLED
 * 
 * NOTE: These tests are disabled because:
 * 1. Chat operations use Firestore directly (no Cloud Functions to test)
 * 2. Chat functionality is thoroughly covered by unit tests in ChatService.test.ts
 * 3. Integration tests in this project are specifically for testing Cloud Functions
 * 4. Running these tests would require Firestore emulator, which isn't part of CI/CD
 * 
 * Chat operations (sendMessage, markAsRead, etc.) bypass Cloud Functions and write
 * directly to Firestore. The integration test suite in this project is designed to
 * validate Cloud Functions that interact with CloudSQL via Prisma (searchItineraries,
 * createItinerary, etc.).
 * 
 * For chat testing, see:
 * - src/__tests__/services/ChatService.test.ts (unit tests)
 * - src/__tests__/hooks/useChat.test.ts (React hook tests)
 */

import { describe, expect, test } from '@jest/globals';

describe('ChatService integration (emulator) - DISABLED', () => {
  test('Chat integration tests are disabled - see file header for details', () => {
    // informational messages removed
    expect(true).toBe(true);
  });
});
