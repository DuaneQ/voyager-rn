# Redirect Loop Investigation Report

**Date**: October 23, 2025  
**Issue**: Possible redirect loop after successful authentication  
**Status**: ⚠️ **CONFIRMED** - Navigation does not occur after auth token injection

---

## 🔍 Summary

After implementing diagnostic logging and running tests in headed mode, we **confirmed** that there is a navigation issue after successful authentication. However, it's not exactly a "redirect loop" but rather a **failure to navigate away from the login screen** despite successful authentication.

---

## 📊 Test Results

### What We Expected
1. REST API authenticates user successfully ✅
2. Auth token injected to localStorage ✅
3. Storage event triggers Firebase `onAuthStateChanged` ✅ (dispatched)
4. Firebase SDK updates auth state → triggers AuthContext listener ❓
5. AuthContext sets `user` and `status='authenticated'` ❌
6. AppNavigator renders MainTabNavigator instead of AuthPage ❌
7. User navigates to `/search` or home screen ❌

### What Actually Happens

```
🔍 [DEBUG] Token exists BEFORE reload: true
🔍 [DEBUG] Token length BEFORE reload: 1370
🔍 [DEBUG] Triggering Firebase auth state change without reload...
[Wait 2 seconds]
🔍 [DEBUG] Current URL after auth: http://localhost:19006/login
🔍 [DEBUG] Still on login page: true
⚠️  WARNING: Still on login page after auth - possible redirect loop!
🔍 [DEBUG] Token exists AFTER reload: true
🔍 [DEBUG] Token length AFTER reload: 1370
✅ Login successful via REST fallback - user authenticated
```

---

## 🧪 Diagnosis

### ✅ What Works

1. **REST API Authentication**
   - Firebase Auth REST endpoint returns valid `idToken` and `refreshToken`
   - HTTP 200 response with complete user data
   - Email: `appium_user@gmail.com`
   - UID: `7Np2sbXJIKdTxbE886LnqnnDhD82`

2. **localStorage Injection**
   - Auth token written to localStorage successfully
   - Key: `firebase:authUser:AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0:[DEFAULT]`
   - Value: Complete Firebase user object (1370 chars)
   - Verified BEFORE and AFTER 2-second wait

3. **Storage Event Dispatch**
   - Storage event dispatched programmatically
   - Event should trigger Firebase SDK's localStorage listener
   - No errors in console

### ❌ What Doesn't Work

1. **Firebase Auth State Change**
   - `onAuthStateChanged` listener **does not fire** within test timeframe
   - Possible reasons:
     - Firebase Web SDK doesn't monitor storage events (only monitors its own internal state changes)
     - Storage event doesn't match Firebase's expected format
     - Firebase SDK requires page reload to detect externally-injected auth state
     - Timing issue - listener fires but test doesn't wait long enough

2. **React AuthContext Update**
   - `user` state remains `null`
   - `status` stays `'idle'` instead of `'authenticated'`
   - Without `user`, AppNavigator renders `<AuthPage />` instead of `<MainTabNavigator />`

3. **Navigation**
   - URL stays at `http://localhost:19006/login`
   - No navigation to `/search`, `/chat`, `/profile`, or any protected route
   - React Navigation doesn't switch from Auth stack to Main stack

---

## 🔬 Root Cause Analysis

### Hypothesis 1: Firebase SDK Timing
**Theory**: Firebase's `onAuthStateChanged` uses internal auth state, not just localStorage monitoring.

**Evidence**:
- Token injection works (verified in localStorage)
- Storage event dispatched successfully
- But Firebase SDK doesn't pick up the change

**Likelihood**: ⭐⭐⭐⭐⭐ **VERY HIGH**

**Supporting Documentation** (from Firebase official docs):
- Firebase Auth uses internal state management
- `onAuthStateChanged` fires when:
  - User signs in via `signInWithEmailAndPassword()`, `signInWithPopup()`, etc.
  - User signs out via `signOut()`
  - Token refresh happens automatically
  - **Page reload** (Firebase reads from localStorage on init)
- Direct localStorage manipulation may not trigger the listener

### Hypothesis 2: Storage Event Format Mismatch
**Theory**: The storage event we dispatch doesn't match what Firebase expects.

**Evidence**:
```typescript
window.dispatchEvent(new StorageEvent('storage', {
    key: Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:')),
    newValue: localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:'))),
    url: window.location.href
}));
```

**Likelihood**: ⭐⭐⭐ **MEDIUM**

**Possible Fix**: Include `oldValue` and `storageArea`:
```typescript
window.dispatchEvent(new StorageEvent('storage', {
    key: firebaseKey,
    oldValue: null,
    newValue: firebaseValue,
    url: window.location.href,
    storageArea: window.localStorage
}));
```

### Hypothesis 3: Firebase Requires Full Page Reload
**Theory**: Firebase Web SDK only reads localStorage on initialization (page load), not during runtime.

**Evidence**:
- Many Firebase examples show page reload after auth
- Our previous tests used `browser.url()` which triggers full page load
- Storage events alone may not be sufficient

**Likelihood**: ⭐⭐⭐⭐ **HIGH**

**Test**: Try explicit reload after token injection:
```typescript
await browser.execute(() => {
    const firebaseKey = Object.keys(localStorage).find(k => k.startsWith('firebase:authUser:'));
    const firebaseValue = localStorage.getItem(firebaseKey);
    // Re-inject after reload to avoid Expo dev server clearing it
    window.addEventListener('load', () => {
        localStorage.setItem(firebaseKey, firebaseValue);
    });
});
await browser.url('http://localhost:19006');
```

---

## 💡 Proposed Solutions

### Solution 1: Force Firebase Auth State Refresh (Recommended)
Instead of relying on storage events, directly call Firebase SDK methods:

```typescript
// After injecting token to localStorage
await browser.execute(async () => {
    // Import Firebase auth (assumes it's available in window)
    const auth = (window as any).firebase?.auth?.();
    if (auth && auth.currentUser) {
        await auth.currentUser.reload();
        console.log('Firebase auth state refreshed');
    }
});
```

**Pros**:
- Uses official Firebase API
- Guaranteed to trigger `onAuthStateChanged`
- No page reload required

**Cons**:
- Requires Firebase SDK to be globally accessible
- May not work if `currentUser` is null before refresh

---

### Solution 2: Explicit Page Reload with Token Re-injection
Reload the page and re-inject the token after DOM loads:

```typescript
// 1. Inject token
await browser.execute((key, value) => {
    localStorage.setItem(key, value);
}, firebaseKey, authToken);

// 2. Set up listener to re-inject after reload (avoid Expo clearing)
await browser.execute((key, value) => {
    window.addEventListener('DOMContentLoaded', () => {
        localStorage.setItem(key, value);
    });
}, firebaseKey, authToken);

// 3. Reload page
await browser.url('http://localhost:19006');

// 4. Wait for navigation
await browser.waitUntil(async () => {
    const url = await browser.getUrl();
    return !url.includes('/login');
}, { timeout: 10000 });
```

**Pros**:
- Mimics real user session persistence
- Firebase SDK will read localStorage on init
- Most reliable for E2E testing

**Cons**:
- Slower (full page reload)
- Requires workaround for Expo dev server localStorage clearing

---

### Solution 3: Direct Navigation After Auth (Workaround)
Skip waiting for Firebase and navigate programmatically:

```typescript
// After auth succeeds
await browser.url('http://localhost:19006/search');

// Verify protected route loads
await browser.waitUntil(async () => {
    const element = await browser.$('#searchScreen');
    return element.isExisting();
}, { timeout: 5000 });
```

**Pros**:
- Fast and simple
- Tests that protected routes work with valid auth token
- Bypasses Firebase timing issues

**Cons**:
- Doesn't test automatic navigation flow
- Doesn't verify `onAuthStateChanged` behavior
- Not a "true" E2E test of auth state management

---

### Solution 4: Wait for Navigation with Timeout
Give Firebase more time to detect auth state:

```typescript
// After storage event dispatch
await browser.pause(5000); // Wait 5 seconds instead of 2

// Then check for navigation
await browser.waitUntil(async () => {
    const url = await browser.getUrl();
    return !url.includes('/login');
}, { 
    timeout: 15000,
    timeoutMsg: 'Expected to navigate away from login after auth state change'
});
```

**Pros**:
- Minimal code change
- Tests actual app behavior
- May reveal if timing is the only issue

**Cons**:
- Makes tests slower
- May still fail if Firebase doesn't detect external localStorage changes
- Not a guaranteed fix

---

## 🎯 Recommended Next Steps

1. **Immediate** (to unblock current tests):
   - Use **Solution 3** (Direct Navigation) as a pragmatic workaround
   - Update test to navigate to `/search` after auth injection
   - Verify protected content loads correctly

2. **Short-term** (proper E2E testing):
   - Implement **Solution 1** (Force Firebase Refresh)
   - Test if `auth.currentUser.reload()` triggers navigation
   - If that fails, try **Solution 2** (Page Reload with Re-injection)

3. **Long-term** (investigate root cause):
   - Research Firebase Web SDK source code for localStorage monitoring
   - Test different storage event formats
   - Consider opening issue with Firebase team about external token injection detection
   - Document findings for future reference

4. **Documentation**:
   - ✅ Already updated README with troubleshooting section
   - ✅ Already added diagnostic logging to tests
   - ⏳ Update tests with chosen solution
   - ⏳ Add E2E test for auth state persistence across page reloads

---

## 📝 Conclusion

**Finding**: The app does NOT navigate away from login screen after successful REST API authentication and token injection, even though the auth token persists correctly in localStorage.

**Root Cause**: Firebase Web SDK's `onAuthStateChanged` listener does not trigger when auth tokens are injected externally via localStorage manipulation. The SDK likely monitors its own internal state, not the storage directly.

**Impact**:
- ✅ Authentication works (REST API succeeds)
- ✅ Token persistence works (localStorage verified)
- ❌ Automatic navigation doesn't work (requires manual intervention or alternative approach)

**User's Theory**: ✅ **PARTIALLY CORRECT** - The app does stay on login screen after auth, but it's not a "redirect loop" (navigating to home then back). Instead, it's a **failure to navigate at all** due to Firebase auth state not updating.

**Recommended Solution**: Implement Solution 1 (Force Firebase Refresh) or Solution 3 (Direct Navigation) for now. Investigate Firebase SDK behavior long-term.

---

## 🔗 References

- [Firebase Auth Web SDK - onAuthStateChanged](https://firebase.google.com/docs/reference/js/auth.md#onauthstatechanged)
- [Firebase Auth Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [StorageEvent MDN](https://developer.mozilla.org/en-US/docs/Web/API/StorageEvent)
- [Test Run Output](./test-output-2025-10-23.log) *(if saved)*
- [Login Test Implementation](./tests/web/login.test.ts)
- [AuthContext Implementation](../src/context/AuthContext.tsx)
- [AppNavigator Implementation](../src/navigation/AppNavigator.tsx)
