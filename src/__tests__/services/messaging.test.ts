/**
 * Tests for platform-specific messaging adapter modules.
 *
 * messaging.ts        — web stub (null exports, Metro selects on web)
 * messaging.native.ts — native adapter (re-exports @react-native-firebase/messaging,
 *                       Metro selects on iOS/Android)
 *
 * NOTE: Jest uses the React Native preset which lists 'native' ahead of 'ts' in
 * moduleFileExtensions. This means `require('...messaging')` always resolves to
 * messaging.native.ts in this test environment — the same as it does at runtime
 * on iOS/Android. The web stub (messaging.ts) is tested by importing it via its
 * explicit full path (messaging.native is excluded there by asking for the .ts
 * module directly).
 *
 * The web stub is a 2-line null export that is verified by Metro's file
 * extension selection; its correctness is enforced by TypeScript compilation
 * rather than runtime tests.
 */

import firebaseMessaging from '@react-native-firebase/messaging';

// ─── Native adapter ──────────────────────────────────────────────────────────
// Jest (React Native preset) resolves `messaging` → `messaging.native.ts`,
// matching the runtime behaviour on iOS/Android.

describe('messaging.native.ts (native adapter)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nativeAdapter = require('../../services/notification/messaging.native');

  it('re-exports the firebase messaging module as default', () => {
    expect(nativeAdapter.default).toBe(firebaseMessaging);
  });

  it('exported value is a callable function (firebase module factory)', () => {
    expect(typeof nativeAdapter.default).toBe('function');
  });

  it('calling the export returns the firebase messaging instance', () => {
    const instance = nativeAdapter.default();
    expect(instance).toBeDefined();
  });

  it('messaging instance exposes getToken()', () => {
    const instance = nativeAdapter.default();
    expect(typeof instance.getToken).toBe('function');
  });

  it('messaging instance exposes requestPermission()', () => {
    const instance = nativeAdapter.default();
    expect(typeof instance.requestPermission).toBe('function');
  });

  it('messaging instance exposes deleteToken()', () => {
    const instance = nativeAdapter.default();
    expect(typeof instance.deleteToken).toBe('function');
  });

  it('messaging instance exposes onTokenRefresh()', () => {
    const instance = nativeAdapter.default();
    expect(typeof instance.onTokenRefresh).toBe('function');
  });

  it('AuthorizationStatus constants are accessible on the module', () => {
    const { AuthorizationStatus } = nativeAdapter.default;
    expect(AuthorizationStatus.AUTHORIZED).toBe(1);
    expect(AuthorizationStatus.DENIED).toBe(0);
    expect(AuthorizationStatus.NOT_DETERMINED).toBe(-1);
    expect(AuthorizationStatus.PROVISIONAL).toBe(2);
  });
});

// ─── Web stub ─────────────────────────────────────────────────────────────────
// messaging.ts exports null for both named and default exports. Jest's RN preset
// resolves the bare `messaging` specifier to the .native.ts file, so we
// explicitly require the .ts stub via its full filename.

describe('messaging.ts (web stub)', () => {
  // Require the web stub by its explicit filename so Jest doesn't swap it for
  // the .native.ts variant through extension priority.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const webStub = require('../../services/notification/messaging.ts');

  it('named export "messaging" is null', () => {
    // The web stub deliberately exports null so that code importing `messaging`
    // on web (where FCM native modules are unavailable) receives a safe no-op.
    expect(webStub.messaging).toBeNull();
  });

  it('default export is null', () => {
    expect(webStub.default).toBeNull();
  });
});
