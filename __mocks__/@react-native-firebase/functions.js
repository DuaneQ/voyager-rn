/**
 * Mock for @react-native-firebase/functions
 */

const mockHttpsCallable = jest.fn((functionName) => {
  return jest.fn().mockResolvedValue({
    data: { success: true, result: `Mock result from ${functionName}` },
  });
});

const mockFunctions = jest.fn(() => ({
  httpsCallable: mockHttpsCallable,
}));

export default mockFunctions;
