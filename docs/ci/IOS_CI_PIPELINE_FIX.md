# iOS CI Pipeline Fix

## 🔍 **Problem Identified**

The iOS build was failing in the CI pipeline with this error:
```
Error: ENOENT: no such file or directory, open '/Users/runner/.expo/devicectl-exists'
```

**Root Cause**: 
- The pipeline was trying to run `expo start` which calls `expo run:ios`
- `expo run:ios` attempts to detect connected physical iOS devices using `devicectl`
- In CI environments, there are no physical devices, causing the device detection to fail
- The automation tests expect a **native iOS app** (`com.voyager.rn`) but the pipeline was set up for Expo Go

## ✅ **Solution Implemented**

### **1. Changed from Expo Go to Native App Build**

**Before** (failing approach):
```yaml
# This was trying to use Expo Go and failing on device detection
npm start &  # This calls expo start which tries to detect devices
```

**After** (fixed approach):
```yaml
# Build actual native iOS app for testing
npx expo prebuild --platform ios --clean
xcodebuild -workspace voyager.xcworkspace -scheme voyager ...
```

### **2. Updated Pipeline Steps**

**New pipeline flow:**
1. **Setup iOS Simulator** - Boot iPhone 15 simulator
2. **Generate Native iOS Project** - Use `expo prebuild` to create native iOS code
3. **Build Native iOS App** - Use `xcodebuild` to compile the app for simulator
4. **Install Native App on Simulator** - Install the built `.app` file
5. **Run Automation Tests** - Test the native app (not Expo Go)

### **3. Updated WebDriverIO Configuration**

**Enhanced `wdio.mobile.conf.ts`:**
```typescript
// Use app path for CI builds, bundleId for local development
...(process.env.CI && process.env.APP_PATH ? {
  'appium:app': process.env.APP_PATH  // Points to built .app file
} : {
  'appium:bundleId': 'com.voyager.rn'  // For local development
})
```

### **4. Fixed Bundle Identifier**

The `app.json` already had the correct bundle ID:
```json
{
  "ios": {
    "bundleIdentifier": "com.voyager.rn"
  }
}
```

This matches what the automation tests expect.

## 🔧 **Technical Details**

### **Why This Fix Works:**

1. **No Device Detection**: Using `expo prebuild` + `xcodebuild` avoids Expo CLI's device detection entirely
2. **Native App**: Creates a real iOS app that Appium can automate (not Expo Go)
3. **CI Optimized**: Uses CI-specific environment variables and paths
4. **Simulator Ready**: Builds specifically for iOS Simulator testing

### **Build Process:**

1. `expo prebuild --platform ios` generates native iOS project in `ios/` folder
2. `xcodebuild` compiles the React Native code into a `.app` bundle
3. App is installed on the simulator using `xcrun simctl install`
4. Appium connects to the native app using bundle ID or app path

## 🧪 **Testing the Fix**

The pipeline now follows this flow:
```
Setup Simulator → Generate Native Project → Build iOS App → Install App → Run Tests
```

Instead of the previous failing flow:
```
Setup Simulator → Install Expo Go → Start Expo (FAILS on device detection)
```

## 📋 **Key Files Modified**

1. **`azure-pipelines.yml`** - Complete pipeline overhaul for native app building
2. **`automation/wdio.mobile.conf.ts`** - Added CI-specific app path configuration

## ⚠️ **Important Notes**

- **Local Development**: Still works with bundle ID (`com.voyager.rn`)
- **CI Environment**: Uses built app path (`APP_PATH` environment variable)  
- **No Expo Go**: The automation tests now use a real native iOS app
- **Bundle ID Consistency**: Both local and CI use the same bundle identifier

This fix eliminates the `devicectl` error and provides a more stable testing environment by using native iOS builds instead of relying on Expo Go and device detection.