/**
 * Unit tests for src/hooks/useVersionCheck.ts
 *
 * Covers:
 *  - Web platform returns all-false immediately (no Remote Config)
 *  - Force upgrade: current version < minimum_required_version
 *  - Soft update: current version >= min but < latest_version
 *  - Up-to-date: current version >= both thresholds
 *  - Remote Config fetch failure → silently swallowed, isLoading resolves false
 *  - latestVersion is populated from Remote Config
 *  - Patch/minor/major semver comparisons
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import remoteConfig from '@react-native-firebase/remote-config';
import { useVersionCheck } from '../../hooks/useVersionCheck';

// The mock module is at __mocks__/@react-native-firebase/remote-config.ts.
// We grab the mocked instance so individual tests can override getValue.
const mockRCInstance = (remoteConfig as unknown as jest.Mock)();

// Helper: override what Remote Config returns for a given test
const setRemoteConfigVersions = (min: string, latest: string) => {
  mockRCInstance.getValue.mockImplementation((key: string) => ({
    asString: () => (key === 'minimum_required_version' ? min : latest),
  }));
};

beforeEach(() => {
  jest.clearAllMocks();
  setRemoteConfigVersions('1.0.0', '1.0.0');
  mockRCInstance.fetchAndActivate.mockResolvedValue(true);
  mockRCInstance.setDefaults.mockResolvedValue(undefined);
  mockRCInstance.setConfigSettings.mockResolvedValue(undefined);
});

describe('useVersionCheck — web platform', () => {
  it('returns all-false without calling Remote Config', async () => {
    const origOS = Platform.OS;
    (Platform as any).OS = 'web';

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(false);
    expect(result.current.isUpdateAvailable).toBe(false);
    expect(mockRCInstance.fetchAndActivate).not.toHaveBeenCalled();

    (Platform as any).OS = origOS;
  });
});

describe('useVersionCheck — iOS/Android', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
  });

  it('isForceUpgradeRequired=true when current version is below minimum', async () => {
    // App is on 1.0.0, minimum required is 1.2.0 → must upgrade
    setRemoteConfigVersions('1.2.0', '1.5.0');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(true);
    // isUpdateAvailable is also true (1.0.0 < 1.5.0); App.tsx hides the soft
    // update modal via: visible={!isForceUpgradeRequired && isUpdateAvailable}
  });

  it('isUpdateAvailable=true when current version is below latest but above minimum', async () => {
    // App is on 1.0.0, min is 1.0.0, latest is 1.3.0 → soft update
    setRemoteConfigVersions('1.0.0', '1.3.0');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(false);
    expect(result.current.isUpdateAvailable).toBe(true);
  });

  it('both false when current version equals both thresholds', async () => {
    setRemoteConfigVersions('1.0.0', '1.0.0');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(false);
    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it('both false when current version is newer than both thresholds', async () => {
    // App is on 1.0.0 (from constants mock), Remote Config has older values
    setRemoteConfigVersions('0.9.0', '0.9.5');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(false);
    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it('latestVersion is populated from Remote Config', async () => {
    setRemoteConfigVersions('1.0.0', '2.1.3');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.latestVersion).toBe('2.1.3');
  });

  it('isLoading starts true and becomes false after Remote Config resolves', async () => {
    setRemoteConfigVersions('1.0.0', '1.0.0');

    const { result } = renderHook(() => useVersionCheck());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('Remote Config fetch failure is swallowed — isLoading resolves false', async () => {
    mockRCInstance.fetchAndActivate.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Non-critical failure: all values stay at safe defaults
    expect(result.current.isForceUpgradeRequired).toBe(false);
    expect(result.current.isUpdateAvailable).toBe(false);
  });
});

describe('useVersionCheck — semver edge cases', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
  });

  it('detects force upgrade on minor version bump (1.0.0 < 1.1.0)', async () => {
    setRemoteConfigVersions('1.1.0', '1.1.0');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(true);
  });

  it('detects force upgrade on patch version bump (1.0.0 < 1.0.1)', async () => {
    setRemoteConfigVersions('1.0.1', '1.0.1');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(true);
  });

  it('detects soft update on major version difference (1.0.0 < 2.0.0)', async () => {
    setRemoteConfigVersions('1.0.0', '2.0.0');

    const { result } = renderHook(() => useVersionCheck());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isForceUpgradeRequired).toBe(false);
    expect(result.current.isUpdateAvailable).toBe(true);
  });
});
