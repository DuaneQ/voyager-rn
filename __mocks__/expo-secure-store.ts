/**
 * Mock for expo-secure-store
 * 
 * This mock simulates secure storage behavior for testing.
 * In tests, it behaves like an in-memory key-value store.
 */

const store: Record<string, string> = {};

export const getItemAsync = jest.fn((key: string): Promise<string | null> => {
  return Promise.resolve(store[key] || null);
});

export const setItemAsync = jest.fn((key: string, value: string): Promise<void> => {
  store[key] = value;
  return Promise.resolve();
});

export const deleteItemAsync = jest.fn((key: string): Promise<void> => {
  delete store[key];
  return Promise.resolve();
});

// Helper for tests to clear the mock store
export const __clearStore = () => {
  Object.keys(store).forEach(key => delete store[key]);
};

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  __clearStore,
};
