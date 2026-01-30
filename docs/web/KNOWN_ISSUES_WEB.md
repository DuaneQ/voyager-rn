# Known Issues - Web Platform

**Last Updated:** January 30, 2026

This document tracks known issues specifically affecting the web platform (React Native Web / Expo Web builds).

---

## 🚨 Critical Issues

### 1. RangeError: Maximum Call Stack Size Exceeded

**Status:** 🔴 **ACTIVE - UNRESOLVED**  
**Severity:** Critical  
**Platforms Affected:** iOS Safari web, possibly other browsers  
**First Observed:** January 29, 2026  
**Last Confirmed:** January 30, 2026 8:52 AM

#### Symptoms:
```
RangeError: Maximum call stack size exceeded
   at reportError
```

#### When It Occurs:
- After successful app initialization
- After user authentication
- While app is running (not just at startup)

#### What We've Tried:
1. ❌ Stubbing expo-av completely (5+ different approaches)
2. ❌ Lazy loading video components
3. ❌ Metro resolver customization
4. ❌ Platform-specific imports

#### Current Analysis:
- **Not expo-av related** (stubbing didn't fix it)
- Likely causes:
  - Infinite render loop in a component
  - Recursive state update pattern
  - Circular dependency in imports
  - Event listener recursion (e.g., navigation, auth listeners)
  - Context provider causing infinite re-renders

#### Impact:
- App remains functional despite error
- Auth works ✅
- Navigation works ✅
- Profile loading works ✅
- **BUT**: Indicates underlying instability that could cause crashes

#### Next Steps:
- [ ] Enable source maps for production builds
- [ ] Add error boundary with detailed logging
- [ ] Binary search: disable features one by one
- [ ] Check all useEffect dependencies
- [ ] Review all navigation/auth listeners
- [ ] Audit Context providers for re-render loops

#### Workaround:
None currently. App continues to function.

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
| RangeError (Max Call Stack) | Critical | Active | Low (app works) | ⚠️ Maybe |
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
