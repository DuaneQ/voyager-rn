/**
 * Mock for @react-native-firebase/remote-config
 * Used in tests to avoid native module dependency
 */

const mockValues: Record<string, string> = {
  minimum_required_version: '1.0.0',
  latest_version: '1.0.0',
};

const mockGetValue = jest.fn((key: string) => ({
  asString: () => mockValues[key] ?? '',
  asNumber: () => Number(mockValues[key] ?? 0),
  asBoolean: () => mockValues[key] === 'true',
}));

const mockRemoteConfigInstance = {
  setDefaults: jest.fn().mockResolvedValue(undefined),
  setConfigSettings: jest.fn().mockResolvedValue(undefined),
  fetchAndActivate: jest.fn().mockResolvedValue(true),
  getValue: mockGetValue,
};

const remoteConfig: any = jest.fn(() => mockRemoteConfigInstance);

export default remoteConfig;
