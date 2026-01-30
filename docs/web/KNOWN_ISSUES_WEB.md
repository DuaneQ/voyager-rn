# Known Issues - Web Platform

**Last Updated:** January 30, 2026

This document tracks known issues specifically affecting the web platform (React Native Web / Expo Web builds).

---

## 🚨 Critical Issues

### 1. RangeError: Maximum Call Stack Size Exceeded

**Status:** ✅ **RESOLVED**  
**Severity:** Critical (was)  
**Platforms Affected:** iOS Safari web, all web browsers  
**First Observed:** January 29, 2026  
**Resolved:** January 30, 2026 9:00 AM

#### Symptoms:
```
RangeError: Maximum call stack size exceeded
   at reportError
```

#### Root Cause:
**Unmemoized context values causing infinite render loop**

Both `AuthContext` and `UserProfileContext` were creating new value objects on every render without `useMemo()`. Every time a provider rendered, it created a new object reference, causing all consumer components to re-render, which triggered provider re-renders, creating an infinite loop:

```typescript
// ❌ BAD - Creates new object every render
return (
  <AuthContext.Provider value={{
    user,
    status,
    signIn,
    signOut,
    // ... more properties
  }}>
    {children}
  </AuthContext.Provider>
);

// Each render creates a new object → consumers re-render → providers re-render → loop
```

This was compounded by unmemoized navigation components (`RootNavigator`, `GuardedMainTabNavigator`) that consume these contexts.

#### The Fix:
```typescript
// ✅ GOOD - Memoized context values
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('idle');
  
  // Memoize the context value - only recreate when dependencies change
  const value = useMemo(() => ({
    user,
    status,
    signIn,
    signOut,
    // ... more properties
  }), [user, status, isInitializing]); // Only these primitives, not functions
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Also memoize navigation components that consume contexts
const RootNavigator: React.FC = React.memo(() => {
  const { user, status } = useAuth();
  // ...
});
```

**Files Changed:**
- `src/context/AuthContext.tsx` - Added `useMemo` for context value
- `src/context/UserProfileContext.tsx` - Added `useMemo` for context value  
- `src/navigation/AppNavigator.tsx` - Added `React.memo()` to RootNavigator and GuardedMainTabNavigator

#### Evidence from Logs:
```
[RootNavigator] Rendering (count: 3)
[MainTabNavigator] Rendering (count: 1)
[RootNavigator] Rendering (count: 4)  
[MainTabNavigator] Rendering (count: 2)
[RootNavigator] Rendering (count: 5)
🔴 RangeError: Maximum call stack size exceeded
```

#### Prevention:
**Always memoize React Context values** that contain objects or arrays:

```typescript
// ❌ BAD - New object every render
<MyContext.Provider value={{ data, methods }}>

// ✅ GOOD - Memoized, stable reference
const value = useMemo(() => ({ data, methods }), [data]);
<MyContext.Provider value={value}>
```

**Also memoize navigation container components** that:
- Use context hooks (useAuth, useUserProfile, etc.)
- Conditionally render different navigation stacks
- Are rendered by parent navigation components

Without proper memoization, context consumers re-render on every provider render, even when values haven't actually changed.

#### Impact After Fix:
✅ App loads without errors  
✅ Navigation stable  
✅ No stack overflow  
✅ Performance improved (fewer unnecessary renders)

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
