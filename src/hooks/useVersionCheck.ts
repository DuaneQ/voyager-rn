/**
 * useVersionCheck.ts
 *
 * Fetches minimum_required_version and latest_version from Firebase Remote Config
 * and compares them against the currently running app version.
 *
 * Usage:
 *   const { isForceUpgradeRequired, isUpdateAvailable, latestVersion } = useVersionCheck();
 *
 * Firebase Console setup (one-time):
 *   1. Open your Firebase project → Remote Config
 *   2. Add parameter: minimum_required_version  (e.g. "1.0.0")
 *   3. Add parameter: latest_version            (e.g. "1.7.0")
 *   4. Publish changes
 *
 * Only runs on iOS/Android — web returns all-false immediately.
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import remoteConfig from '@react-native-firebase/remote-config';
import Constants from 'expo-constants';

// ─── Dev Testing Overrides ────────────────────────────────────────────────────
// Set one of these to true to preview the modal without changing Firebase or
// the app version. Remember to set them back to false before committing.
//
//   DEV_FORCE_UPGRADE  →  blocking modal (simulates running a version too old)
//   DEV_SOFT_UPDATE    →  dismissable "update available" banner
//
const DEV_FORCE_UPGRADE = false;
const DEV_SOFT_UPDATE   = false;
// ─────────────────────────────────────────────────────────────────────────────

export interface VersionCheckResult {
  isForceUpgradeRequired: boolean;
  isUpdateAvailable: boolean;
  latestVersion: string;
  isLoading: boolean;
}

/**
 * Compare two semver strings (x.y.z).
 * Returns  1 if a > b
 * Returns -1 if a < b
 * Returns  0 if equal
 */
const compareSemver = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

export const useVersionCheck = (): VersionCheckResult => {
  const [isForceUpgradeRequired, setIsForceUpgradeRequired] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dev overrides — skip Remote Config entirely and show the chosen modal state
    if (__DEV__ && (DEV_FORCE_UPGRADE || DEV_SOFT_UPDATE)) {
      setIsForceUpgradeRequired(DEV_FORCE_UPGRADE);
      setIsUpdateAvailable(!DEV_FORCE_UPGRADE && DEV_SOFT_UPDATE);
      setLatestVersion('99.0.0');
      setIsLoading(false);
      return;
    }

    // Remote Config is not needed on web
    if (Platform.OS === 'web') {
      setIsLoading(false);
      return;
    }

    const checkVersion = async () => {
      try {
        const rc = remoteConfig();

        // Defaults are used if the fetch fails (first launch offline, etc.)
        await rc.setDefaults({
          minimum_required_version: '1.0.0',
          latest_version: '1.0.0',
        });

        // Use 0ms interval in dev to get fresh values every time;
        // 1 hour in production to avoid excess fetches.
        await rc.setConfigSettings({
          minimumFetchIntervalMillis: __DEV__ ? 0 : 3_600_000,
        });

        // Fetch latest values from Firebase and activate them
        await rc.fetchAndActivate();

        const minVersion = rc.getValue('minimum_required_version').asString();
        const latestVer = rc.getValue('latest_version').asString();
        const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

        setLatestVersion(latestVer);
        setIsForceUpgradeRequired(compareSemver(currentVersion, minVersion) < 0);
        setIsUpdateAvailable(compareSemver(currentVersion, latestVer) < 0);
      } catch (error) {
        // Non-critical — fail silently so a Remote Config outage never blocks the app
        console.warn('[useVersionCheck] Remote Config fetch failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkVersion();
  }, []);

  return { isForceUpgradeRequired, isUpdateAvailable, latestVersion, isLoading };
};
