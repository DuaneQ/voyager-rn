export const log = (...args: any[]) => {
  // Minimal wrapper that can be replaced by a structured logger later
  // Tag with a prefix so logs are easy to filter in CI
  console.log('[automation]', ...args);
};
