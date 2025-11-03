// Firebase configuration for voyager-RN (React Native Expo)
// Using the EXACT same configuration as voyager-pwa to share the database

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

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

// For React Native, we'll use dev config for now
// TODO: Add proper environment detection for RN
const firebaseConfig = devConfig;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

console.log('🔥 Firebase initialized for voyager-RN');
console.log('📱 Using project:', firebaseConfig.projectId);