// Polyfill for fetch (required by Firebase Functions)
try {
  global.fetch = global.fetch || require('node-fetch');
} catch (error) {
  // Fallback if node-fetch is not available
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  }));
}

// Polyfill for React Native's setImmediate
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args));

// Ensure React is loaded once before tests run to avoid multiple copies/hoisting issues
// that can cause hooks to be undefined (useState === null).
/* eslint-disable global-require */
try {
} catch (e) {
  // ignore - some environments may not have react available here
}
/* eslint-enable global-require */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(() => Promise.resolve()),
    getItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve()),
    multiSet: jest.fn(() => Promise.resolve()),
    multiGet: jest.fn(() => Promise.resolve([])),
    multiRemove: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase
jest.mock('./src/config/firebaseConfig', () => {
  const mockAuth = {
    currentUser: { uid: 'test-user-123', email: 'test@example.com', emailVerified: true },
    onAuthStateChanged: jest.fn((callback) => {
      // Return unsubscribe function
      return () => {};
    }),
  };
  
  return {
    auth: mockAuth,
    db: {},
    getAuthInstance: () => mockAuth,
  };
});

// Mock firebase/auth functions used by AuthContext
jest.mock('firebase/auth', () => {
  const actual = jest.requireActual('firebase/auth');
  
  // Mock GoogleAuthProvider as a constructor
  class MockGoogleAuthProvider {
    static credential = jest.fn((idToken) => ({ providerId: 'google.com', idToken }));
  }
  
  return {
    // keep other exports if needed
    ...actual,
    signInWithEmailAndPassword: jest.fn(async () => {
      return { user: { uid: 'mock-uid', email: 'test@example.com', emailVerified: true, isAnonymous: false, providerData: [] } };
    }),
    createUserWithEmailAndPassword: jest.fn(async () => {
      return { user: { uid: 'new-uid', email: 'new@example.com', emailVerified: false, isAnonymous: false, providerData: [] } };
    }),
    sendEmailVerification: jest.fn(async () => Promise.resolve()),
    sendPasswordResetEmail: jest.fn(async () => Promise.resolve()),
    signOut: jest.fn(async () => Promise.resolve()),
    // Provide a no-op onAuthStateChanged by default. Individual tests should
    // override this mock (mockImplementation) when they need to simulate auth
    // events. Avoid auto-calling the callback here to prevent race conditions
    // that can flip auth state during tests that assert transient states.
    onAuthStateChanged: jest.fn((auth, callback) => {
      // default: do nothing and return an unsubscribe stub
      return () => {};
    }),
    GoogleAuthProvider: MockGoogleAuthProvider,
    signInWithPopup: jest.fn(async () => {
      return { user: { uid: 'google-uid', email: 'google@example.com', emailVerified: true } };
    }),
    signInWithCredential: jest.fn(async () => {
      return { user: { uid: 'google-uid-mobile', email: 'google-mobile@example.com', emailVerified: true } };
    }),
  };
});

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  setDoc: jest.fn(async () => Promise.resolve()),
  getDoc: jest.fn(async () => ({ exists: () => false, data: () => null })),
  updateDoc: jest.fn(async () => Promise.resolve()),
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDocs: jest.fn(async () => ({ docs: [] })),
  serverTimestamp: jest.fn(() => new Date()),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    reset: jest.fn(),
  }),
  NavigationContainer: ({ children }) => children,
  createNavigationContainerRef: () => ({
    isReady: jest.fn(() => false),
    navigate: jest.fn(),
    current: null,
  }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Focused mock: react-native-svg (prevent it from importing RN internals)
try {
  jest.mock('react-native-svg', () => {
    const React = require('react');
    const Svg = ({ children, ...props }) => React.createElement('svg', props, children);
    const Path = ({ children, ...props }) => React.createElement('path', props, children);
    const G = ({ children, ...props }) => React.createElement('g', props, children);
    const Circle = ({ children, ...props }) => React.createElement('circle', props, children);
    const Rect = ({ children, ...props }) => React.createElement('rect', props, children);
    return {
      __esModule: true,
      default: Svg,
      Svg,
      Path,
      G,
      Circle,
      Rect,
    };
  }, { virtual: true });
} catch (e) {
  // ignore: some test runners may already have it mocked
}

// Mock @expo/vector-icons used across the app (functional stub with testID)
try {
  jest.mock('@expo/vector-icons', () => {
    const React = require('react');
    const IconStub = ({ name, size, color, children, testID, ...rest }) => {
      // Use a RN-like host element so testID works with RNTL
      const props = { testID: testID || name, style: { fontSize: size, color }, ...rest };
      return React.createElement('View', props, children || null);
    };
    return {
      __esModule: true,
      Ionicons: IconStub,
      default: { Ionicons: IconStub },
    };
  }, { virtual: true });
} catch (e) {
  // ignore if already mocked
}

// Mock expo-av Video component
try {
  jest.mock('expo-av', () => {
    const React = require('react');
    const Video = React.forwardRef((props, ref) => React.createElement('Video', { ...props, ref }, props.children));
    const Audio = { Sound: { createAsync: jest.fn().mockResolvedValue({ sound: { unloadAsync: jest.fn() }, status: { isLoaded: true, durationMillis: 1000 } }) } };
    const ResizeMode = { CONTAIN: 'contain', COVER: 'cover', STRETCH: 'stretch' };
    return { __esModule: true, Video, Audio, ResizeMode, AVPlaybackStatus: {} };
  }, { virtual: true });
} catch (e) {
  // ignore
}

// Focused virtual mock for native Google Signin package used in mobile tests
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ idToken: null })),
  },
}), { virtual: true });

// Mock React Native Settings module
jest.mock('react-native/Libraries/Settings/Settings', () => ({
  get: jest.fn(),
  set: jest.fn(),
  watchKeys: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock Share API
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
}));

// Bridge Clipboard internal module to top-level RN mock's Clipboard implementation
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => {
  // Use the Clipboard mock surfaced by our react-native manual mock
  const RN = require('react-native');
  return RN.Clipboard;
}, { virtual: true });

// Ensure tests importing Share and Clipboard from 'react-native' see mocked implementations
// Re-mock 'react-native' to ensure Share and Clipboard are present when imported from 'react-native'
try {
  // We map 'react-native' to a project-level manual mock in jest.config.js
  // so avoid requiring the real package or dynamically re-mocking here.
  // This keeps the test environment consistent and prevents accidental
  // access to native TurboModules during jest startup.
} catch (e) {
  // ignore if react-native cannot be required in this environment
}

// Mock react-native-safe-area-context for Jest environment
try {
  jest.mock('react-native-safe-area-context', () => {
    const React = require('react');
    const { View } = require('react-native');

    const SafeAreaView = ({ children, style, ...props }) => React.createElement(View, { style, ...props }, children);

    return {
      SafeAreaView,
      useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
      initialWindowMetrics: {
        frame: { x: 0, y: 0, width: 375, height: 667 },
        insets: { top: 0, bottom: 0, left: 0, right: 0 },
      },
    };
  }, { virtual: true });
} catch (e) {
  // ignore if jest.mock is not available in this environment
}
