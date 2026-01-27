// Firebase configuration for voyager-RN (React Native Expo)
// Replicating EXACT same config as voyager-pwa to share the database

import { initializeApp, getApps } from 'firebase/app';
import { 
  initializeAuth, 
  getAuth,
  signInWithCustomToken as firebaseSignInWithCustomToken 
} from 'firebase/auth';
// @ts-ignore - getReactNativePersistence is exported for React Native but TypeScript doesn't see it
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const devConfig = {
  apiKey: "AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0",
  authDomain: "mundo1-dev.firebaseapp.com",
  projectId: "mundo1-dev",
  storageBucket: "mundo1-dev.firebasestorage.app",
  messagingSenderId: "296095212837",
  appId: "1:296095212837:web:6fd8f831e3d7f642f726cc",
  measurementId: "G-ZNYVKS2SBF",
};

const prodConfig = {
  apiKey: "AIzaSyBzRHcKiuCj7vvqJxGDELs2zEXQ0QvQhbk",
  authDomain: "mundo1-1.firebaseapp.com",
  databaseURL: "https://mundo1-1.firebaseio.com",
  projectId: "mundo1-1",
  storageBucket: "mundo1-1.appspot.com",
  messagingSenderId: "533074391000",
  appId: "1:533074391000:web:2ef7404546e97f4aa2ccad",
  measurementId: "G-P99K8KRBYJ"
};

// Use dev config for development, prod for release builds
const firebaseConfig = __DEV__ ? devConfig : prodConfig;

// Initialize Firebase app (only if not already initialized)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence for React Native
// This ensures auth state persists across app restarts
let auth: ReturnType<typeof getAuth>;

if (Platform.OS === 'web') {
  // For web, use default persistence (IndexedDB)
  auth = getAuth(app);
} else {
  // For React Native (iOS/Android), use AsyncStorage persistence
  // This is CRITICAL for keeping users logged in across app restarts
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: any) {
    // If auth is already initialized, just get the existing instance
    if (error.code === 'auth/already-initialized') {
      auth = getAuth(app);
    } else {
      console.error('[FirebaseConfig] Error initializing auth:', error);
      auth = getAuth(app);
    }
  }
}

export { auth };

export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Helper function for compatibility with existing code that expects getAuthInstance()
export const getAuthInstance = () => auth;

// Re-export signInWithCustomToken for auth sync
export const signInWithCustomToken = firebaseSignInWithCustomToken;

// Helper to get Cloud Function URL (for direct HTTP calls)
export const getCloudFunctionUrl = (functionName: string): string => {
  const projectId = firebaseConfig.projectId;
  const region = 'us-central1';
  return `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
};

