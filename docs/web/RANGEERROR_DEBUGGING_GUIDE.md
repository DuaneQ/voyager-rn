# Debugging "Maximum Call Stack Size Exceeded" on Web

**Status:** Active Investigation  
**Severity:** Critical  
**Last Updated:** January 30, 2026

---

## 🎯 Objective

Find and fix the source of the `RangeError: Maximum call stack size exceeded` error occurring on iOS Safari web builds.

---

## 📊 What We Know

### Confirmed Facts:
- ✅ Error occurs **after** successful authentication
- ✅ App remains functional (auth, navigation, profile all work)
- ✅ Specific to web builds (not native iOS/Android)
- ✅ Observed on iOS Safari
- ❌ **NOT caused by expo-av** (stubbing didn't fix it)

### Error Message:
```
RangeError: Maximum call stack size exceeded
   at reportError
```

---

## 🔍 Common Causes of This Error

### 1. Infinite Render Loop
```typescript
// ❌ BAD: Causes infinite loop
const Component = () => {
  const [count, setCount] = useState(0);
  
  // This runs on every render and triggers another render
  setCount(count + 1);
  
  return <Text>{count}</Text>;
};

// ✅ GOOD: Controlled updates
const Component = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    setCount(count + 1);
  }, []); // Only on mount
  
  return <Text>{count}</Text>;
};
```

### 2. useEffect Dependency Hell
```typescript
// ❌ BAD: Object dependency causes infinite loop
const Component = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(result => setData(result));
  }, [data]); // data changes → effect runs → data changes → ...
  
  return <Text>{data}</Text>;
};

// ✅ GOOD: Stable dependency
const Component = () => {
  const [data, setData] = useState(null);
  const [shouldFetch, setShouldFetch] = useState(true);
  
  useEffect(() => {
    if (shouldFetch) {
      fetchData().then(result => {
        setData(result);
        setShouldFetch(false);
      });
    }
  }, [shouldFetch]);
  
  return <Text>{data}</Text>;
};
```

### 3. Navigation Listener Recursion
```typescript
// ❌ BAD: Navigation listener triggers navigation
const Screen = () => {
  const navigation = useNavigation();
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      navigation.navigate('OtherScreen'); // Triggers focus again!
    });
    return unsubscribe;
  }, [navigation]);
};

// ✅ GOOD: Conditional navigation
const Screen = () => {
  const navigation = useNavigation();
  const [hasNavigated, setHasNavigated] = useState(false);
  
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (!hasNavigated) {
        setHasNavigated(true);
        navigation.navigate('OtherScreen');
      }
    });
    return unsubscribe;
  }, [navigation, hasNavigated]);
};
```

### 4. Context Provider Re-renders
```typescript
// ❌ BAD: New object on every render
const MyProvider = ({ children }) => {
  const value = {
    user: currentUser,
    settings: currentSettings
  }; // New object every time!
  
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};

// ✅ GOOD: Memoized value
const MyProvider = ({ children }) => {
  const value = useMemo(() => ({
    user: currentUser,
    settings: currentSettings
  }), [currentUser, currentSettings]);
  
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};
```

### 5. Circular Imports
```typescript
// File A.ts
import { functionB } from './B';
export const functionA = () => functionB();

// File B.ts
import { functionA } from './A';
export const functionB = () => functionA(); // Circular!
```

---

## 🛠️ Debugging Strategy

### Phase 1: Enable Better Error Messages

#### 1.1 Add Source Maps
```json
// app.json
{
  "expo": {
    "web": {
      "build": {
        "sourceMap": true
      }
    }
  }
}
```

#### 1.2 Add Error Boundary
```typescript
// src/components/ErrorBoundary.web.tsx
import React from 'react';
import { View, Text } from 'react-native';

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('🚨 ERROR BOUNDARY CAUGHT ERROR');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    this.setState({ errorInfo });
    
    // TODO: Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 20, color: 'red' }}>Something went wrong</Text>
          <Text style={{ marginTop: 10 }}>{this.state.error?.message}</Text>
          <Text style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
            {this.state.errorInfo?.componentStack}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

#### 1.3 Wrap App with Error Boundary
```typescript
// App.tsx or App.web.tsx
import ErrorBoundary from './src/components/ErrorBoundary.web';

export default function App() {
  return (
    <ErrorBoundary>
      {/* Rest of app */}
    </ErrorBoundary>
  );
}
```

### Phase 2: Add Render Tracking

#### 2.1 Create Render Monitor Hook
```typescript
// src/hooks/useRenderMonitor.ts
import { useEffect, useRef } from 'react';

export const useRenderMonitor = (componentName: string, maxRenders = 50) => {
  const renderCount = useRef(0);
  const lastWarnTime = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    
    const now = Date.now();
    const timeSinceLastWarn = now - lastWarnTime.current;
    
    // If we've rendered more than maxRenders times in less than 1 second
    if (renderCount.current > maxRenders && timeSinceLastWarn < 1000) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error(`🔥 INFINITE LOOP DETECTED: ${componentName}`);
      console.error(`Rendered ${renderCount.current} times`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      lastWarnTime.current = now;
    }
    
    // Reset counter every second
    if (timeSinceLastWarn > 1000) {
      renderCount.current = 1;
      lastWarnTime.current = now;
    }
  });
  
  return renderCount.current;
};
```

#### 2.2 Add to Suspicious Components
```typescript
// Add to components that might be looping
import { useRenderMonitor } from '../hooks/useRenderMonitor';

const MyComponent = () => {
  useRenderMonitor('MyComponent', 50);
  
  // Rest of component
};
```

### Phase 3: Binary Search (Disable Features)

Create a feature flag system to disable parts of the app:

```typescript
// src/config/debugFlags.ts
export const DEBUG_FLAGS = {
  ENABLE_AUTH_LISTENERS: true,
  ENABLE_NAVIGATION_LISTENERS: true,
  ENABLE_PROFILE_LOADING: true,
  ENABLE_CHAT: true,
  ENABLE_SEARCH: true,
  ENABLE_VIDEOS: true,
};

// Usage in components:
import { DEBUG_FLAGS } from '../config/debugFlags';

const MyComponent = () => {
  useEffect(() => {
    if (!DEBUG_FLAGS.ENABLE_PROFILE_LOADING) return;
    
    // Profile loading logic
  }, []);
};
```

Then disable features one by one to isolate the problem:

1. Disable all features except auth
2. If error stops → the problem is in disabled features
3. Re-enable features one by one until error returns
4. The last feature enabled is the culprit

### Phase 4: Check Specific Problem Areas

#### 4.1 Review All useEffect Hooks
```bash
# Search for all useEffect in the codebase
grep -r "useEffect" src/
```

Look for:
- Missing dependency arrays
- Dependencies that change on every render (objects, arrays)
- State updates inside useEffect that depend on that state

#### 4.2 Review All Context Providers
```bash
# Find all context providers
grep -r "Context.Provider" src/
```

Check for:
- Values that aren't memoized
- Providers nested too deeply
- Context updates triggering other context updates

#### 4.3 Review Navigation Listeners
```bash
# Find all navigation listeners
grep -r "addListener\|useFocusEffect" src/
```

Check for:
- Listeners that trigger navigation
- Listeners that update state that triggers re-renders
- Missing cleanup functions

#### 4.4 Check for Circular Imports
```bash
# Install dependency analyzer
npm install -g madge

# Check for circular dependencies
madge --circular --extensions ts,tsx src/
```

---

## 📝 Checklist for Investigation

- [ ] Enable source maps in app.json
- [ ] Add ErrorBoundary component
- [ ] Add useRenderMonitor hook to main screens
- [ ] Check console for infinite loop warnings
- [ ] Disable features one by one using debug flags
- [ ] Review all useEffect hooks for infinite loops
- [ ] Review all Context providers for unnecessary re-renders
- [ ] Check navigation listeners for recursion
- [ ] Run circular dependency check with madge
- [ ] Test with React DevTools Profiler to see what's re-rendering

---

## 🎯 Likely Suspects (Priority Order)

Based on the logs showing the error occurs after authentication:

1. **AuthContext** - May be causing infinite re-renders
   - Check: `src/context/AuthContext.tsx`
   - Look for: State updates in useEffect that depend on auth state

2. **UserProfileContext** - Profile loading after auth
   - Check: `src/context/UserProfileContext.tsx`
   - Look for: Infinite refetch loops

3. **Navigation Setup** - Tab navigation after login
   - Check: `src/navigation/AppNavigator.tsx`, `src/navigation/MainTabNavigator.tsx`
   - Look for: Listeners that trigger navigation

4. **SearchPage** - Currently open in editor
   - Check: `src/pages/SearchPage.tsx`
   - Look for: useFocusEffect or useEffect issues

---

## 📚 Additional Resources

- [React DevTools Profiler](https://reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html)
- [Why React Re-Renders](https://www.joshwcomeau.com/react/why-react-re-renders/)
- [React useEffect Hook Explained](https://dmitripavlutin.com/react-useeffect-explanation/)

---

## 🔄 Next Steps

Once the issue is found:

1. Document the exact cause
2. Fix the root cause
3. Add test to prevent regression
4. Update this guide with the solution
5. Add ESLint rule if applicable to catch similar issues

---

**Remember:** Maximum call stack errors are always caused by infinite recursion. The code is calling itself (directly or indirectly) without a proper base case to stop.
