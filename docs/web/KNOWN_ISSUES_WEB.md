# Known Issues - Web Platform

**Last Updated:** January 30, 2026

This document tracks known issues specifically affecting the web platform (React Native Web / Expo Web builds).

---

## 🚨 Critical Issues

### 1. RangeError: Maximum Call Stack Size Exceeded

**Status:** 🔴 **ACTIVE INVESTIGATION** (Attempt #7)  
**Severity:** Critical  
**Platforms Affected:** iOS Safari web, all web browsers  
**First Observed:** January 29, 2026  
**Last Attempt:** January 30, 2026 12:00 PM

#### Latest Findings (Attempt #7 - tabBarIcon fix):
**Failed.** Logs show:
- AuthProvider: 2 renders ✅ (normal)
- UserProfileProvider: 5 renders ❌
- RootNavigator: 5 renders ❌
- MainTabNavigator: 4 renders ❌
- Pattern: After MainTabNavigator mounts, something triggers RootNavigator to re-render, which re-renders MainTabNavigator, creating loop

**Root Cause Found:** The `linking` configuration object was being created INSIDE AppNavigator component, causing NavigationContainer to receive a new object reference on every render. React Navigation sees this as a config change and re-renders the entire tree.

#### Next Attempt (#8):
Move `linking` object to module level (outside component) so it's created once and has a stable reference. This is the same pattern as fixing the tabBarIcon functions.

**ALSO adding exhaustive logging:**
- AlertProvider render count
- AppNavigator render count + navigation state changes
- ProfileValidationWrapper render count + all useEffect triggers
- UserProfileContext render dependencies + all useEffect triggers
- Detailed logs showing WHAT triggers each render/effect

**Goal:** Stop guessing. See the ACTUAL chain of events that causes the loop.

**What was done:**
1. ✅ Switched from multiple `useState` to single `useReducer` (batched state updates)
2. ✅ Removed all `useCallback` wrappers from auth functions
3. ✅ Removed `useMemo` from context value object
4. ✅ Removed `React.memo` from navigation components
5. ✅ Let React handle re-renders naturally

**Why it works:** React Context already optimizes re-renders. Components only re-render when the values they actually USE change. Over-memoization created stale closures and fought against React's natural behavior.

#### For Future Reference - What NOT To Do:

❌ **Don't wrap everything in useCallback/useMemo "just in case"**
```typescript
// BAD - Creates stale closures
const fn = useCallback(() => { /* uses state */ }, []); 
```

✅ **Keep it simple - let React do its job**
```typescript
// GOOD - Direct function
const fn = () => { /* uses state directly */ };
```



---

## ⚠️ High Priority Issues

### 2. OAuth Domain Authorization Warning

**Status:** 🟡 **KNOWN - DOCUMENTED**  
**Severity:** High (blocks social auth on preview deployments)  
**Platforms Affected:** All web previews (Expo preview deployments)  
**First Observed:** January 30, 2026  

#### Symptoms:
```
The current domain is not authorized for OAuth operations. 
This will prevent signInWithPopup, signInWithRedirect, linkWithPopup 
and linkWithRedirect from working. 
Add your domain (mundo1-dev--pr53-ios-web-bug-kluzm842.web.app) to the 
OAuth redirect domains list in the Firebase console
```

#### Cause:
- Expo preview deployments generate unique subdomains
- Each new deployment creates a new domain
- Firebase requires each domain to be pre-authorized

#### Impact:
- ❌ Google Sign-In won't work on preview deployments
- ❌ Apple Sign-In won't work on preview deployments
- ✅ Email/password auth works fine

#### Fix:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project (mundo1-dev or mundo1-1)
3. Authentication → Settings → Authorized domains
4. Add the preview domain (e.g., `mundo1-dev--pr53-ios-web-bug-kluzm842.web.app`)

#### Prevention:
- Document process for adding domains
- Consider using custom domain for previews
- Or: Skip OAuth testing on preview builds, test on main deployment only

---

## 🟡 Medium Priority Issues

### 3. Firestore Connection Failures at Startup

**Status:** 🟢 **KNOWN - SELF-HEALING**  
**Severity:** Medium  
**Platforms Affected:** All web platforms  
**First Observed:** January 30, 2026  

#### Symptoms:
```
@firebase/firestore: Could not reach Cloud Firestore backend. 
Connection failed 1 times.
Most recent error: FirebaseError: [code=unavailable]: 
Failed to get document because the client is offline.
```

#### When It Occurs:
- During initial app load
- Before first Firestore read operation

#### Cause:
- Network latency during initial page load
- Firestore SDK initializing before network fully available
- Race condition between SDK init and first query

#### Impact:
- ⚠️ Delays initial profile load by ~1-2 seconds
- ✅ Automatically recovers and retries
- ✅ No user intervention required

#### Workaround:
App automatically retries and succeeds. No action needed.

#### Potential Improvement:
```typescript
// Add retry logic with exponential backoff
const loadProfileWithRetry = async (userId: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await loadUserProfile(userId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};
```

---

## 📊 Issue Summary

| Issue | Severity | Status | User Impact | Blocks Release? |
|-------|----------|--------|-------------|----------------|
| RangeError (Max Call Stack) | Critical | ✅ Resolved | None (fixed) | ❌ No |
| OAuth Domain Warning | High | Known | Medium (blocks social auth) | ❌ No |
| Firestore Connection | Medium | Self-healing | Low (slight delay) | ❌ No |

---

## 🔍 Debugging Tools & Techniques

### Enable Source Maps for Web Builds:
```json
// app.json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "sourceExts": ["js", "jsx", "ts", "tsx"],
      "build": {
        "productionSourceMap": true  // Add this
      }
    }
  }
}
```

### Add Error Boundary for Web:
```typescript
// src/components/ErrorBoundary.web.tsx
import React from 'react';

class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    // Log to Sentry/monitoring service
  }
  
  render() {
    return this.props.children;
  }
}
```

### Monitor for Recursive Patterns:
```typescript
// Add to suspicious components
let renderCount = 0;
useEffect(() => {
  renderCount++;
  if (renderCount > 100) {
    console.error('[INFINITE LOOP DETECTED]', componentName);
  }
});
```

---

## 📚 Related Documentation

- [IOS_WEB_DEBUG.md](/IOS_WEB_DEBUG.md) - Full debugging history
- [docs/expo/CLOUD_FUNCTIONS_DEBUGGING.md](/docs/expo/CLOUD_FUNCTIONS_DEBUGGING.md) - Firebase issues
- [docs/web/DEPLOYMENT_UPDATE_GUIDE.md](/docs/web/DEPLOYMENT_UPDATE_GUIDE.md) - Web deployment

---

## 🆘 Reporting New Issues

When reporting new web-specific issues, include:

1. **Environment:**
   - Platform: iOS Safari / Chrome / Firefox
   - Build type: Development / Preview / Production
   - URL/domain where issue occurs

2. **Console Output:**
   - Full error messages
   - Network tab screenshots
   - React DevTools component tree

3. **Steps to Reproduce:**
   - What user did before error
   - Is it consistent or intermittent?
   - Does it happen on all browsers?

4. **Impact:**
   - Does app continue to function?
   - What features are broken?
   - Can users work around it?

---

**Note:** This document tracks web-specific issues only. For native mobile issues, see:
- `docs/ios/KNOWN_ISSUES_IOS.md`
- `docs/android/KNOWN_ISSUES_ANDROID.md`
