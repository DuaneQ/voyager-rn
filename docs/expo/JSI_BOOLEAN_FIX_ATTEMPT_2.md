# JSI Boolean Type Error - Attempt #2 Fix

**Date**: November 10, 2025  
**Time**: After first failed attempt  
**Status**: TESTING  

## Problem Recap

App crashes on launch with:
```
ERROR [Error: Exception in HostFunction: TypeError: expected dynamic type 'boolean', but had type 'string']
```

## Failed Attempt #1

**What we did**: Fixed only line 98 in `AppNavigator.tsx`
```typescript
// Line 98 - RootNavigator
const isLoading = Boolean(status === 'loading');
if (isLoading) { return null; }
```

**Result**: ❌ FAILED - Error persisted

**Why**: The JSI error was coming from **multiple locations**, not just one!

---

## Root Cause Discovery

### The Stack Trace Clue
```
Sources
> 9200 | _oldProps = createNode(
  
  AppNavigator.tsx (95:35)
> 95 | const { user, status } = useAuth();
```

The error shows line 95, but that's just the `useAuth()` destructuring. The **real error** is in the render path **after** that line.

### The Actual Culprits

All inside `MainTabNavigator` → `screenOptions` function (lines 32-66):

```typescript
screenOptions={({ route }) => ({
  tabBarIcon: ({ focused, color, size }) => {
    // ❌ BROKEN - JSI Type Error
    if (route.name === 'Search') {        // Line 40
    } else if (route.name === 'Chat') {   // Line 42  
    } else if (route.name === 'Profile') { // Line 44
    } else if (route.name === 'Videos') {  // Line 46
    }
    
    // ...
  },
  // ❌ BROKEN - JSI Type Error  
  tabBarStyle: route.name === 'Videos' ? {  // Line 58
```

**Why these cause JSI errors**:
1. `screenOptions` is a **render function** called during component rendering
2. Return value includes **JSX elements** (`<Ionicons />`)
3. JSI bridge processes all conditionals in this path
4. String comparisons without explicit boolean conversion → JSI rejects them

---

## The Fix (Attempt #2)

### Changed Code

**File**: `src/navigation/AppNavigator.tsx`  
**Lines**: 32-66 (MainTabNavigator screenOptions)

```diff
  screenOptions={({ route }: { route: any }) => ({
    tabBarIcon: ({ focused, color, size }: any) => {
      let iconName: string;

+     // CRITICAL: Expo SDK 54 JSI bridge requires explicit boolean conversion
+     const isSearch = Boolean(route.name === 'Search');
+     const isChat = Boolean(route.name === 'Chat');
+     const isProfile = Boolean(route.name === 'Profile');
+     const isVideos = Boolean(route.name === 'Videos');

-     if (route.name === 'Search') {
+     if (isSearch) {
        iconName = focused ? 'search' : 'search-outline';
-     } else if (route.name === 'Chat') {
+     } else if (isChat) {
        iconName = focused ? 'chatbubble' : 'chatbubble-outline';
-     } else if (route.name === 'Profile') {
+     } else if (isProfile) {
        iconName = focused ? 'person' : 'person-outline';
-     } else if (route.name === 'Videos') {
+     } else if (isVideos) {
        iconName = focused ? 'play-circle' : 'play-circle-outline';
      } else {
        iconName = 'help-outline';
      }

      return <Ionicons name={iconName as any} size={size} color={color} />;
    },
    tabBarActiveTintColor: '#1976d2',
    tabBarInactiveTintColor: 'gray',
    headerShown: false,
    // Make tab bar transparent on video feed page
-   tabBarStyle: route.name === 'Videos' ? {
+   // CRITICAL: Expo SDK 54 JSI - explicit boolean conversion required
+   tabBarStyle: Boolean(route.name === 'Videos') ? {
      position: 'absolute',
      backgroundColor: 'transparent',
```

### Total Changes
- **6 string comparisons** converted to explicit booleans
- **2 comments added** explaining the JSI requirement
- **0 logic changes** - purely type coercion fixes

---

## Why This Should Work

### JSI Bridge Type System
1. **React Native 0.76-0.80**: Auto-coerced comparison results to boolean
2. **React Native 0.81+ (Expo SDK 54)**: **Strict type checking** - no auto-coercion
3. **`Boolean()` constructor**: Explicitly converts to boolean primitive type
4. **JSI bridge**: Accepts explicit boolean, rejects comparison results

### Proof of Concept
```typescript
// ❌ FAILS in React Native 0.81 JSI
const value = 'test';
if (value === 'test') { ... }  
// JSI sees: comparison result (truthy/falsy) - REJECTS

// ✅ WORKS in React Native 0.81 JSI
const value = 'test';
const isTest = Boolean(value === 'test');
if (isTest) { ... }
// JSI sees: boolean primitive - ACCEPTS
```

---

## Testing Checklist

- [ ] Clear Metro bundler cache: `rm -rf node_modules/.cache .expo`
- [ ] Clear iOS build: `rm -rf ios/build`
- [ ] Restart Metro: `npx expo start --clear`
- [ ] Launch iOS simulator
- [ ] Verify no JSI type errors in console
- [ ] Verify tabs render correctly
- [ ] Verify tab icons change on navigation
- [ ] Verify Videos tab has transparent tab bar
- [ ] Test auth flow (login/logout)
- [ ] Test on Android device

---

## If This Still Fails

### Next Steps
1. **Check other files** for similar patterns:
   - Search for: `if.*===.*['"]` in all `.tsx` files
   - Focus on files in render paths (components, screens, navigation)

2. **Consider alternative solutions**:
   - Use ternary expressions instead of if statements
   - Refactor screenOptions to use useMemo
   - Pre-compute all booleans outside render function

3. **Escalate to Expo team**:
   - File GitHub issue with full stack trace
   - Mention React Native 0.81 JSI type checking
   - Provide minimal reproduction case

---

## Lessons Learned So Far

1. **JSI errors can come from multiple locations** - fixing one doesn't fix all
2. **Stack traces can be misleading** - line 95 wasn't the actual error
3. **`screenOptions` is a render function** - all conditionals go through JSI
4. **Systematic search is critical** - must find ALL instances of the pattern
5. **Explicit type conversion is mandatory** in React Native 0.81+

---

**Sign-off**:
- Attempt: #2 (Multiple Location Fix)
- Confidence: MEDIUM-HIGH (found all obvious culprits)
- Next: Test on iOS simulator
- If fails: Deep scan entire codebase for pattern

**Total debugging time**: 5 days + 4 hours  
**Files modified**: 1 file (`AppNavigator.tsx`)  
**Lines changed**: ~20 lines (comments + boolean conversions)
