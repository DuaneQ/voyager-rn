# Simple Authentication Guide

## Overview
Uses **Firebase Web SDK v12.5.0** directly - works on web, iOS, and Android. Matches PWA exactly.

## Flow

### Sign Up
1. `createUserWithEmailAndPassword(auth, email, password)`
2. `setDoc(doc(db, 'users', uid), profileData)` 
3. `sendEmailVerification(user)`
4. User verifies email

### Sign In
1. `signInWithEmailAndPassword(auth, email, password)`
2. Check `user.emailVerified`
3. Firebase manages session automatically

### Profile Load
1. `auth.onAuthStateChanged()` fires
2. `UserProfileContext` reads: `getDoc(doc(db, 'users', userId))`
3. Check `hasAcceptedTerms` → show modal if false

### Sign Out
1. `signOut(auth)`
2. Clear AsyncStorage
3. Redirect to login

## Why It Works
✅ Web SDK works in React Native
✅ No REST API needed  
✅ No custom tokens needed
✅ Automatic session management
✅ Built-in token refresh

## Files
- `src/context/AuthContext.tsx` - Main auth (Web SDK)
- `src/context/UserProfileContext.tsx` - Profile loading
- `src/pages/AuthPage.tsx` - Login/signup UI

## Troubleshooting
- **Email not verified**: Check spam folder for verification email
- **Profile not loading**: Check Firestore rules allow authenticated reads
- **Sign-in loops**: Clear AsyncStorage

See: [SIMPLE_AUTH_FLOW.md](./SIMPLE_AUTH_FLOW.md)
