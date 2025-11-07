# iOS Workspace Naming Resolution

## Issue: Incorrect Workspace Names in CI

### Problem Discovered
The iOS CI pipeline was failing with:
```
ERROR: VoyagerRN.xcworkspace not found
Available files in ios directory:
- Traval.xcworkspace  ← Actual workspace
- Traval.xcodeproj
- Traval/ (directory)
```

### Root Cause Analysis

#### Configuration vs Reality
The workflow expected `VoyagerRN.xcworkspace` but Expo prebuild generated `Traval.xcworkspace`.

#### Expo Prebuild Naming Logic
Expo uses the `app.json` → `"name"` field to determine all iOS project names:

```json
{
  "expo": {
    "name": "Traval",  ← This determines all iOS naming
    "slug": "voyager-rn"
  }
}
```

**Generated Structure:**
- **Xcode Project**: `Traval.xcodeproj`
- **Workspace**: `Traval.xcworkspace` 
- **Scheme**: `Traval`
- **App Directory**: `Traval/`

### Evolution of the Issue

#### Timeline of Naming Confusion
1. **Initial Error**: `voyager.xcworkspace` (completely wrong)
2. **First Fix**: `VoyagerRN.xcworkspace` (logical guess, still wrong)  
3. **Correct Fix**: `Traval.xcworkspace` (matches app.json name)

### Solution Implemented

#### Updated iOS Workflow
```yaml
# Before (Wrong):
xcodebuild -workspace VoyagerRN.xcworkspace -scheme VoyagerRN

# After (Correct):
xcodebuild -workspace Traval.xcworkspace -scheme Traval
```

#### Enhanced Diagnostics
Added workspace detection to prevent future naming issues:
```bash
# Verify workspace exists
if [ ! -d "Traval.xcworkspace" ]; then
  echo "Available .xcworkspace files:"
  find . -name "*.xcworkspace" -type d
  exit 1
fi
```

### Key Learning: Expo Project Naming

#### Configuration Source
```json
// app.json
{
  "expo": {
    "name": "Traval",     // ← iOS project names
    "slug": "voyager-rn"  // ← Used for URLs, package naming
  }
}
```

#### Generated iOS Structure
```
ios/
├── Traval/                    # Main app directory
├── Traval.xcodeproj/         # Xcode project
├── Traval.xcworkspace/       # CocoaPods workspace
├── Pods/                     # Dependencies
└── Podfile                   # Dependency config
```

#### Xcode Build Targets
- **Workspace**: `Traval.xcworkspace`
- **Scheme**: `Traval` 
- **Bundle ID**: `com.voyager.rn` (from app.json ios.bundleIdentifier)

### Verification Steps

#### Check Generated Names
```bash
# After expo prebuild --platform ios
ls ios/
# Should show: Traval.xcworkspace, Traval.xcodeproj, Traval/

# List available schemes
xcodebuild -workspace ios/Traval.xcworkspace -list
# Should show: Traval in schemes list
```

#### Configuration Alignment
Ensure consistency between:
1. `app.json` → `"name"` field
2. iOS workflow workspace references
3. Xcode scheme references

### Future Prevention

#### Before Changes
Always check the app.json name field:
```bash
cat app.json | grep '"name"'
# Output: "name": "Traval"
```

#### Workflow Alignment  
Ensure iOS workflows reference the correct names based on app.json:
- Workspace: `{name}.xcworkspace`
- Scheme: `{name}`
- Project: `{name}.xcodeproj`

### Documentation Updates

Updated troubleshooting guide to include:
- Expo naming conventions
- How to identify correct workspace names
- Diagnostic steps for workspace detection

---

**Issue Resolved**: October 28, 2025  
**Root Cause**: Mismatch between expected and actual workspace names  
**Solution**: Align workflow with app.json naming convention  
**Prevention**: Always verify names after expo prebuild changes