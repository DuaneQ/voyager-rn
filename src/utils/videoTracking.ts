export const trackVideoView = (videoId: string) => {
  // lightweight stub used in tests; production implementation lives elsewhere
  // Intentionally no-op for unit tests
  return Promise.resolve();
};

export const trackVideoInteraction = (videoId: string, action: string) => {
  return Promise.resolve();
};
