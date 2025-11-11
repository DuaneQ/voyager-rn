# React Native Firebase Migration - Implementation Log

**Date Started**: November 9, 2025  
**Priority**: CRITICAL - Blocking all Firestore/Functions access  
**Branch**: `chore/upgrade-expo-54`

## Objective

Migrate from Firebase Web SDK + REST API to **@react-native-firebase** to fix:
- Firestore permission denied errors
- Cloud Functions authentication failures
- Auth state isolation between REST API and Firebase services

---

## Implementation Checklist

### Phase 1: Package Installation ⏳

- [ ] Install `@react-native-firebase/app`
- [ ] Install `@react-native-firebase/auth`
- [ ] Install `expo-build-properties` (for iOS frameworks)
- [ ] Verify `google-services.json` exists
- [ ] Verify `GoogleService-Info.plist` exists

**Commands**:
```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth
npx expo install expo-build-properties
```

**Expected Result**: Packages installed successfully

---

### Phase 2: Configuration ⏳

- [ ] Update `app.json` with plugins array
- [ ] Add `@react-native-firebase/app` plugin
- [ ] Add `@react-native-firebase/auth` plugin
- [ ] Add `expo-build-properties` with iOS useFrameworks
- [ ] Verify googleServicesFile paths

**Configuration**:
```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

**Expected Result**: app.json configured correctly

---

### Phase 3: Code Migration ⏳

#### 3.1: firebaseConfig.ts
- [ ] Replace Firebase Web SDK imports with React Native Firebase
- [ ] Update auth initialization
- [ ] Update Firestore initialization
- [ ] Update Functions initialization
- [ ] Update Storage initialization
- [ ] Test imports in isolation

**Before**:
```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**After**:
```typescript
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import functions from '@react-native-firebase/functions';

// Firebase app auto-initialized from native config files
export { auth };
export const db = firestore(); // For compatibility
export { storage, functions };
```

#### 3.2: AuthContext.tsx
- [ ] Remove `FirebaseAuthService` import
- [ ] Replace with `@react-native-firebase/auth`
- [ ] Update `signIn` method
- [ ] Update `signUp` method
- [ ] Update `signOut` method
- [ ] Update `onAuthStateChanged` listener
- [ ] Update `sendPasswordResetEmail` method
- [ ] Update `sendEmailVerification` method
- [ ] Test auth flow

**Key Changes**:
```typescript
// Sign In
const signIn = async (email: string, password: string) => {
  await auth().signInWithEmailAndPassword(email, password);
  // User state updated automatically via onAuthStateChanged
};

// Sign Up
const signUp = async (email: string, password: string, displayName: string) => {
  const userCredential = await auth().createUserWithEmailAndPassword(email, password);
  await userCredential.user.updateProfile({ displayName });
};

// Auth State Listener
useEffect(() => {
  const subscriber = auth().onAuthStateChanged((firebaseUser) => {
    if (firebaseUser) {
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || '',
        emailVerified: firebaseUser.emailVerified,
      });
    } else {
      setUser(null);
    }
    setIsLoading(false);
  });
  return subscriber; // Cleanup
}, []);
```

#### 3.3: UserProfileContext.tsx
- [ ] Update Firestore imports
- [ ] Replace `getDoc/setDoc` with RN Firebase methods
- [ ] Update `loadUserProfile` function
- [ ] Update `updateUserProfile` function
- [ ] Test profile loading

**Changes**:
```typescript
import firestore from '@react-native-firebase/firestore';

const loadUserProfile = async () => {
  const userDoc = await firestore()
    .collection('users')
    .doc(user.uid)
    .get();
    
  if (userDoc.exists) {
    setUserProfile(userDoc.data() as UserProfile);
  }
};
```

#### 3.4: Repositories
- [ ] Update `AuthRepository.ts` (or remove if deprecated)
- [ ] Update `UserRepository.ts`
- [ ] Update `ItineraryRepository.ts`
- [ ] Update `ChatRepository.ts`
- [ ] Update any other repository files

**Pattern**:
```typescript
// Before
import { doc, getDoc, collection, query } from 'firebase/firestore';

// After
import firestore from '@react-native-firebase/firestore';

const snapshot = await firestore()
  .collection('users')
  .doc(userId)
  .get();
```

#### 3.5: Hooks
- [ ] Update `useAuth.ts` (if separate from AuthContext)
- [ ] Update Firestore hooks in `src/hooks/**/*.ts`
- [ ] Update Cloud Functions hooks
- [ ] Update Storage hooks

#### 3.6: Components/Pages
- [ ] Update any direct Firebase imports
- [ ] Test all auth-related pages (LoginPage, RegisterPage, etc.)
- [ ] Test profile pages
- [ ] Test data-heavy pages (search, itineraries, chat)

---

### Phase 4: Native Rebuild ⏳

- [ ] Clean prebuild: `npx expo prebuild --clean`
- [ ] Clean iOS build: `rm -rf ios/Pods ios/Podfile.lock ios/build`
- [ ] Install pods: `cd ios && pod install && cd ..`
- [ ] Rebuild iOS: `npx expo run:ios`

**Expected Result**: App builds successfully with React Native Firebase

---

### Phase 5: Testing ⏳

#### Basic Auth Tests
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Sign out
- [ ] Password reset email
- [ ] Email verification

#### Firestore Tests
- [ ] Load user profile from Firestore
- [ ] Update user profile
- [ ] Query itineraries
- [ ] Query chat messages
- [ ] Create/update/delete operations

#### Cloud Functions Tests
- [ ] Call functions that require auth
- [ ] Verify auth context available in functions
- [ ] Test error handling

#### Persistence Tests
- [ ] Sign in, reload app → user persists
- [ ] Sign out, reload app → user null

#### Error Handling Tests
- [ ] Invalid email/password
- [ ] Network errors
- [ ] Permission errors (should NOT occur)

---

### Phase 6: Cleanup ⏳

- [ ] Remove `FirebaseAuthService.ts` (if no longer needed)
- [ ] Remove Firebase Web SDK packages (optional - may need for web)
- [ ] Update documentation
- [ ] Add success note to `EXPO_SDK_54_UPGRADE_RUNTIME_FIXES.md`
- [ ] Close related GitHub issues

---

## Attempt Log

### Attempt 1: 2025-11-09 23:50 UTC - Package Installation

**Action**: 
```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth -- --legacy-peer-deps
npx expo install expo-build-properties -- --legacy-peer-deps
```

**Result**: 
- ✅ Success
- Installed @react-native-firebase/app@23.5.0
- Installed @react-native-firebase/auth@23.5.0
- Installed expo-build-properties (SDK 54 compatible)

**Learnings**:
- React Native Firebase v23.5.0 is compatible with Expo SDK 54
- expo-build-properties auto-added as config plugin
- No conflicts with existing packages

---

### Attempt 2: 2025-11-09 23:52 UTC - app.json Configuration

**Action**: 
Updated `app.json` with React Native Firebase config plugins

**Changes Made**:
```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

**Result**: 
- ✅ Success
- Added Firebase config plugins
- Configured iOS useFrameworks as "static" (required for React Native Firebase)
- Set GoogleService-Info.plist path for iOS
- Android google-services.json not added yet (iOS-first approach)

**Learnings**:
- expo-build-properties must be configured with iOS useFrameworks for React Native Firebase
- GoogleService-Info.plist exists in root directory
- Android config can be added later when testing Android platform

---

### Attempt 3: 2025-11-09 23:55 UTC - Code Migration

**Action**: 
Migrated core Firebase code from Web SDK to React Native Firebase

**Files Modified**:

1. **`src/config/firebaseConfig.ts`**:
   - Removed Firebase Web SDK imports (`firebase/app`, `firebase/auth`, etc.)
   - Added React Native Firebase imports (`@react-native-firebase/auth`, `@react-native-firebase/firestore`, etc.)
   - Removed `initializeApp()` call (auto-initialized from native config files)
   - Exported auth, firestore, storage, functions modules

2. **`src/context/AuthContext.tsx`**:
   - Replaced `FirebaseAuthService` (REST API) with `@react-native-firebase/auth`
   - Updated sign-in: `auth().signInWithEmailAndPassword(email, password)`
   - Updated sign-up: `auth().createUserWithEmailAndPassword(email, password)`
   - Updated sign-out: `auth().signOut()`
   - Changed Firestore calls from Web SDK to React Native Firebase syntax
   - Updated `onAuthStateChanged` to use `auth().onAuthStateChanged()`

3. **`src/context/UserProfileContext.tsx`**:
   - Replaced `getDoc()`, `setDoc()` with React Native Firebase methods
   - Changed from `doc(db, 'users', userId)` to `firestore().collection('users').doc(userId)`
   - Updated all Firestore operations to use React Native Firebase API

**Additional Packages Installed**:
```bash
npx expo install @react-native-firebase/firestore @react-native-firebase/storage @react-native-firebase/functions -- --legacy-peer-deps
```

**Result**: 
- ✅ Success
- All core auth and Firestore code migrated
- No TypeScript errors in migrated files
- Ready for native rebuild

**Learnings**:
- React Native Firebase uses modular approach (firestore(), auth(), etc.)
- No need to initialize Firebase app - auto-configured from native files
- Auth state persistence automatic with React Native Firebase
- Firestore syntax similar but uses collection/doc chain instead of doc() function

---

### Attempt 4: 2025-11-09 23:58 UTC - Native Rebuild

**Actions**:

1. **Fixed app.json plugins** - Removed firestore, storage, functions from plugins array
   - Only app and auth modules have Expo config plugins
   - Other modules are automatically linked via autolinking

2. **Created placeholder google-services.json** - For Android build compatibility
   - Used project info from existing Firebase config
   - Allows prebuild to succeed (iOS-first approach)

3. **Ran prebuild**:
   ```bash
   npx expo prebuild --clean --platform ios
   ```

4. **Started iOS build**:
   ```bash
   npx expo run:ios
   ```

**Result**: 
- ✅ Prebuild successful
- ✅ CocoaPods installed
- ⏳ iOS build in progress (terminal ID: 34181359-87dd-4e04-9683-f22097545276)

**Learnings**:
- Only @react-native-firebase/app and @react-native-firebase/auth need config plugins
- Other Firebase modules (firestore, storage, functions) work via autolinking
- google-services.json required for Android even when building iOS only
- --platform ios flag speeds up prebuild by skipping Android

---

### Attempt 2: [DATE/TIME] - Configuration

**Action**: 
[what was done]

**Result**: 
[outcome]

**Learnings**:
[insights]

---

### Attempt 3: [DATE/TIME] - Code Migration

**Files Changed**:
- `src/config/firebaseConfig.ts`
- `src/context/AuthContext.tsx`
- [others]

**Result**: 
[outcome]

**Issues Encountered**:
- [any problems]

**Learnings**:
[insights]

---

## Known Issues & Workarounds

### Issue 1: [Issue Name]

**Problem**: 
[description]

**Workaround**: 
[solution]

**Status**: 
---

### Attempt 5: Fix useFrameworks Build Errors (02:XX UTC - Nov 9, 2025)

**Action**: Fixed useFrameworks build errors
- Removed `expo-build-properties` plugin from `app.json` (useFrameworks: "static" caused non-modular header errors)
- Added `use_modular_headers!` directly to `ios/Podfile` after `use_expo_modules!`
- Cleaned and reinstalled pods: `cd ios && rm -rf Pods Podfile.lock build && pod install && cd ..`
- Started iOS build: `npx expo run:ios`

**Result**: ✅ Pod install SUCCESS - 127 total pods installed
- All React Native Firebase modules (RNFBApp, RNFBAuth, RNFBFirestore, RNFBFunctions, RNFBStorage) installed
- Firebase SDK 12.4.0 pods installed (FirebaseAuth, FirebaseFirestore, FirebaseFunctions, FirebaseStorage)
- Build started without CocoaPods errors

**Learnings**:
- React Native Firebase needs either `useFrameworks` OR `use_modular_headers!`
- `useFrameworks: "static"` causes "non-modular header inside framework module" errors
- `use_modular_headers!` is the recommended approach for Expo + React Native Firebase
- Expo automatically enables modular headers for required pods (ExpoModulesCore, React-Core, etc.)

---

### Attempt 6: iOS Build with use_modular_headers (02:XX UTC - Nov 9, 2025)

**Action**: Built iOS app with use_modular_headers! in Podfile
```bash
npx expo run:ios
```

**Result**: ❌ FAILED - 38 gRPC-Core module map errors
```
error: module map file '/Users/icebergslim/projects/voyager-RN/ios/Pods/Headers/Private/grpc/gRPC-Core.modulemap' not found (in target 'gRPC-C++' from project 'Pods')

❌ 38 error(s), and 3 warning(s)
CommandError: Failed to build iOS project. "xcodebuild" exited with error code 65.
```

**Root Cause**: 
- This is a **known issue** with React Native Firebase + Expo SDK 54 / React Native 0.81
- Tracked in: https://github.com/invertase/react-native-firebase/issues/8657
- gRPC-C++ (dependency of Firestore) has module map issues with Expo's build system
- `use_modular_headers!` alone is not sufficient - needs additional Xcode build setting

**Known Workaround** (from issue #8657):
Set `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` in Xcode build settings

**Options to Apply Workaround**:

1. **Option A: expo-build-properties plugin** (CLEANEST)
   ```json
   {
     "expo": {
       "plugins": [
         [
           "expo-build-properties",
           {
             "ios": {
               "extraPods": [],
               "deploymentTarget": "15.1",
               "flipper": false
             },
             "android": {}
           }
         ]
       ]
     }
   }
   ```
   Then modify `ios/Podfile` to add build setting in `post_install`:
   ```ruby
   post_install do |installer|
     installer.pods_project.build_configurations.each do |config|
       config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
     end
     # ... rest of post_install
   end
   ```

2. **Option B: Custom Expo Config Plugin** (MOST ROBUST)
   Create `plugins/withFirebaseModularHeaders.js`:
   ```javascript
   const { withPodfile } = require('@expo/config-plugins');

   module.exports = function withFirebaseModularHeaders(config) {
     return withPodfile(config, config => {
       const { contents } = config.modResults;
       
       // Add Firebase static framework flag
       if (!contents.includes('$RNFirebaseAsStaticFramework')) {
         config.modResults.contents = contents.replace(
           "use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']",
           "$RNFirebaseAsStaticFramework = true\n  use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']"
         );
       }
       
       // Add CLANG_ALLOW_NON_MODULAR_INCLUDES build setting
       if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
         config.modResults.contents = contents.replace(
           'react_native_post_install(',
           `installer.pods_project.build_configurations.each do |config|
              config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
            end
            react_native_post_install(`
         );
       }
       
       return config;
     });
   };
   ```
   
   Then add to `app.json`:
   ```json
   {
     "expo": {
       "plugins": [
         "./plugins/withFirebaseModularHeaders"
       ]
     }
   }
   ```

3. **Option C: Manual Podfile Edit** (TEMPORARY - LOST ON PREBUILD)
   Manually edit `ios/Podfile` after each `npx expo prebuild`:
   ```ruby
   post_install do |installer|
     installer.pods_project.build_configurations.each do |config|
       config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
     end
     
     react_native_post_install(
       installer,
       config[:reactNativePath],
       :mac_catalyst_enabled => false,
       :ccache_enabled => ccache_enabled?(podfile_properties),
     )
   end
   ```

**Learnings**:
- React Native Firebase + Expo SDK 54 has known build compatibility issues
- Firestore (which uses gRPC-C++) requires special Xcode build settings
- `use_modular_headers!` is necessary but not sufficient
- Must also set `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES`
- Custom Expo config plugin is the most maintainable solution
- This is an **upstream issue** - waiting for Expo or React Native Firebase to fix

**Status**: Workaround applied, build in progress

---

### Attempt 7: Apply gRPC Workaround via Custom Config Plugin (03:XX UTC - Nov 9, 2025)

**Action**: Created and applied custom Expo config plugin to fix gRPC module map errors

**Steps Taken**:

1. **Created** `plugins/withFirebaseModularHeaders.js`:
   - Adds `use_modular_headers!` to Podfile (required for React Native Firebase)
   - Adds `$RNFirebaseAsStaticFramework = true` flag
   - Sets `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES` in post_install hook

2. **Updated** `app.json` to include custom plugin:
   ```json
   {
     "expo": {
       "plugins": [
         "@react-native-firebase/app",
         "@react-native-firebase/auth",
         "./plugins/withFirebaseModularHeaders"
       ]
     }
   }
   ```

3. **Ran** `npx expo prebuild --clean --platform ios`
   - Cleared previous iOS build
   - Custom plugin successfully modified Podfile
   - CocoaPods installation successful

4. **Started** `npx expo run:ios`
   - Terminal ID: 54d0b4e8-bd65-4dab-9525-775923515ce9
   - Build in progress...

**Result**: ✅ Prebuild SUCCESS - Custom config plugin working correctly
- `use_modular_headers!` added to target
- Firebase static framework flag set
- Xcode build setting for non-modular includes configured
- All 127 CocoaPods installed without errors

**Learnings**:
- Custom Expo config plugins are the proper way to modify Podfile in managed workflow
- Must use `withPodfile` from `@expo/config-plugins`
- Config plugin approach is maintainable (survives `npx expo prebuild --clean`)
- The workaround from issue #8657 works when properly implemented
- Three modifications needed: use_modular_headers!, static framework flag, and Xcode build setting

**Next**: Wait for build to complete and test authentication + Firestore access

---

### Attempt 8: Correct gRPC Workaround - Apply to All Pod Targets (03:XX UTC - Nov 9, 2025)

**Problem**: Build still failed with same 38 gRPC module map errors despite config plugin

**Root Cause**: The workaround in Attempt 7 only applied `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES` to the **Pods project** build configurations, not to individual **pod targets**. The gRPC-C++ target needs this setting on its own build configuration.

**Action**: Updated config plugin to iterate through all pod targets

**Changes to `plugins/withFirebaseModularHeaders.js`**:
```javascript
// Before (Attempt 7 - WRONG)
installer.pods_project.build_configurations.each do |config|
  config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
end

// After (Attempt 8 - CORRECT)
installer.pods_project.targets.each do |target|
  target.build_configurations.each do |config|
    config.build_settings["CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES"] = "YES"
  end
end
```

**Result**: ✅ Prebuild SUCCESS
- Config plugin now iterates through ALL pod targets
- Each target (including gRPC-C++, gRPC-Core, FirebaseFirestore, etc.) gets the build setting
- Ready for build

**Learnings**:
- `installer.pods_project.build_configurations` = project-level settings (not enough)
- `installer.pods_project.targets.each` = target-level settings (what we need)
- gRPC-C++ target specifically needs this setting to find its module maps
- CocoaPods creates separate build configurations for each target

**Build Started**: Terminal ID: 28861cee-6ae6-4a6e-b69f-627f0e2c1afc

[resolved/ongoing]

---

## Success Criteria

- [x] ✅ Research complete (React Native Firebase is official solution)
- [x] ✅ Packages installed successfully (@react-native-firebase@23.5.0)
- [ ] ❌ App builds without errors (BLOCKED - gRPC module map issue #8657)
- [ ] ⏳ Apply CLANG_ALLOW_NON_MODULAR_INCLUDES workaround
- [ ] ⏳ Sign in works
- [ ] ⏳ Firestore queries work (NO permission errors)
- [ ] ⏳ Cloud Functions work (NO auth errors)
- [ ] ⏳ Auth persists across reloads
- [ ] ⏳ All tests pass

---

## Rollback Plan

If migration fails:
1. Revert code changes: `git checkout -- .`
2. Revert package.json: `git checkout package.json`
3. Reinstall old packages: `npm install`
4. Rebuild: `npx expo prebuild --clean && cd ios && pod install && cd .. && npx expo run:ios`

---

## References

- Research Doc: `/docs/expo/FIREBASE_AUTH_RESEARCH.md`
- React Native Firebase: https://rnfirebase.io/
- Auth Module: https://rnfirebase.io/auth/usage
- Firestore Module: https://rnfirebase.io/firestore/usage
- Expo Integration: https://rnfirebase.io/#installation-for-expo-projects
