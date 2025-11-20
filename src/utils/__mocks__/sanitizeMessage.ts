/**
 * Mock for sanitizeMessage utility
 */
export const sanitizeMessage = jest.fn((text: string) => text?.trim() || '');
