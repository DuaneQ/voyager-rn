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
  // require React early so tests that mock modules don't accidentally replace it
  global.React = require('react');
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
jest.mock('./src/config/firebaseConfig', () => ({
  auth: {
    currentUser: null,
  },
  db: {},
}));

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
    onAuthStateChanged: jest.fn((auth, callback) => {
      // call callback asynchronously to mimic SDK behavior
      setTimeout(() => callback(null), 0);
      // return unsubscribe function
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
  collection: jest.fn(() => ({})),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  getDocs: jest.fn(async () => ({ docs: [] })),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    reset: jest.fn(),
  }),
  NavigationContainer: ({ children }) => children,
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

// Focused virtual mock for native Google Signin package used in mobile tests
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ idToken: null })),
  },
}), { virtual: true });
