// Firebase configuration for voyager-RN (React Native Expo)
// Replicating EXACT same config as voyager-pwa to share the database

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken as firebaseSignInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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

export const app = initializeApp(firebaseConfig);

// Use getAuth for both platforms
// React Native AsyncStorage persistence is automatically used
export const auth = getAuth(app);

// Ensure auth persistence is properly configured
// React Native automatically uses AsyncStorage, but we can be explicit about it
if (Platform.OS !== 'web') {
  // For React Native, persistence is automatic via AsyncStorage
  // No need to explicitly set persistence
  console.log('🔐 Firebase Auth configured with AsyncStorage persistence');
} else {
  // For web (if running on web), ensure local persistence
  console.log('🔐 Firebase Auth configured with browser persistence');
}

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

console.log('🔥 Firebase initialized for voyager-RN');
console.log('📱 Using project:', firebaseConfig.projectId);
console.log('💾 Auth persistence:', Platform.OS === 'web' ? 'Browser' : 'AsyncStorage');
