// Firebase configuration for voyager-RN (React Native Expo)
// Replicating EXACT same config as voyager-pwa to share the database

import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Initialize Auth with AsyncStorage persistence for React Native
// Web will use the default browser persistence
export const auth = Platform.OS === 'web' 
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: AsyncStorage as any, // Firebase 10.x uses AsyncStorage directly as persistence
    });

export const db = getFirestore(app);
export const storage = getStorage(app);

console.log('🔥 Firebase initialized for voyager-RN');
console.log('📱 Using project:', firebaseConfig.projectId);
console.log('💾 Auth persistence:', Platform.OS === 'web' ? 'Browser' : 'AsyncStorage');
