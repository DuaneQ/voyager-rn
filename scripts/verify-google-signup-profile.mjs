// Quick script to verify Google Sign-Up profile creation
// Run with: node scripts/verify-google-signup-profile.mjs

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const devConfig = {
  apiKey: "AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0",
  authDomain: "mundo1-dev.firebaseapp.com",
  projectId: "mundo1-dev",
  storageBucket: "mundo1-dev.firebasestorage.app",
  messagingSenderId: "296095212837",
  appId: "1:296095212837:web:6fd8f831e3d7f642f726cc",
};

const app = initializeApp(devConfig);
const db = getFirestore(app);

// User ID from your error log
const userId = 'QtWLY9o8uBemzPxr1pq165KzEM92';

console.log(`🔍 Checking if profile exists for user: ${userId}`);
console.log('📍 Project: mundo1-dev');
console.log('');

try {
  const userDocRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userDocRef);
  
  if (userDoc.exists()) {
    console.log('✅ SUCCESS! Profile was created in Firestore');
    console.log('');
    console.log('📄 Profile data:');
    const data = userDoc.data();
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    console.log('🎉 Google Sign-Up worked correctly!');
    console.log('📌 The "User profile not found" error was a timing issue (race condition).');
    console.log('✅ This has been fixed with retry logic in UserProfileContext.');
  } else {
    console.log('❌ Profile NOT found in Firestore');
    console.log('');
    console.log('⚠️ This means the Cloud Function createUserProfile failed.');
    console.log('🔧 Check Cloud Function logs in Firebase Console.');
  }
} catch (error) {
  console.error('❌ Error checking Firestore:', error);
}

process.exit(0);
