# TestFlight-Equivalent Local Testing Guide

## Goal
Test the exact build that will go to TestFlight WITHOUT wasting uploads.

## ⚠️ Important: Build Types Explained

| Build Type | Command | Upload Count | TestFlight Equivalent? |
|------------|---------|--------------|----------------------|
| **Local Release** | `npx expo run:ios --configuration Release` | ❌ Free | ⚠️ Similar but not identical |
| **EAS Testing** | `eas build --platform ios --profile testing` | ❌ Doesn't count! | ✅ Yes - uses EAS pipeline |
| **EAS Production** | `eas build --platform ios --profile production` | ✅ Counts as upload | ✅ Exact TestFlight build |
| **EAS Local** | `eas build --platform ios --local --profile production` | ❌ Free | ✅ Exact, built locally |

## 🎯 Recommended Testing Flow

### Phase 1: Quick Validation (What You're Doing Now)
```bash
# Run local release build for quick testing
npx expo run:ios --configuration Release
```
**Purpose**: Catch obvious crashes and logic errors  
**Time**: Instant (already built)  
**Cost**: Free

### Phase 2: EAS Testing Build (RECOMMENDED BEFORE TESTFLIGHT)
```bash
# Build using EAS testing profile - same pipeline as production!
eas build --platform ios --profile testing
```

**What happens:**
1. EAS builds your app on their servers (same as production)
2. Creates an .ipa file you can install on device
3. You get a download URL to install on your iPhone
4. **Does NOT count against TestFlight uploads!**

**Why this is important:**
- Uses the EXACT same build process as production
- Catches build configuration issues
- Tests with correct signing/provisioning
- Validates bundle correctly
- Tests on real device with production-like build

**Time**: 10-20 minutes  
**Cost**: Uses 1 EAS build credit (you have plenty)

**Install on device:**
```bash
# After build completes, you'll get a URL
# Open URL on iPhone to install the app
# OR scan QR code with iPhone camera
```

### Phase 3: TestFlight Upload (Only After Phase 2 Passes)
```bash
# Build for production (same as Phase 2, but for App Store)
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest
```

**Only do this after Phase 2 testing confirms everything works!**

## 🔍 Key Differences: Local vs EAS Build

### Local Release Build (`npx expo run:ios --configuration Release`)
- ❌ Uses development signing
- ❌ Different bundling process
- ❌ May behave differently than production
- ✅ Fast iteration
- ✅ Good for quick testing

### EAS Build (`eas build`)
- ✅ Uses distribution signing (same as App Store)
- ✅ Same bundling as TestFlight
- ✅ Catches provisioning/entitlement issues
- ✅ Tests exact binary that goes to Apple
- ⏱️ Takes longer (10-20 min)

## 📋 Complete Pre-TestFlight Testing Workflow

### Step 1: Automated Checks ✅ DONE
```bash
./test-before-upload.sh
```
- [x] TypeScript validation
- [x] 1809 tests passing

### Step 2: Local Release Testing (Current)
```bash
npx expo run:ios --configuration Release
```

**Manual Tests:**
- [ ] Google Sign-Up (no crash)
- [ ] Google Sign-In (profile creation)
- [ ] Email/Password Sign-Up (profile creation)
- [ ] Firebase Console verification
- [ ] Core features (search, chat, profile)
- [ ] No console errors

### Step 3: EAS Testing Build (RECOMMENDED NEXT)
```bash
# Build on EAS servers
eas build --platform ios --profile testing

# Wait 10-20 minutes for build to complete
# Install on iPhone via URL/QR code
```

**Repeat all manual tests from Step 2 on the EAS-built app**

### Step 4: TestFlight Upload (Only if Step 3 passes)
```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

## 🚨 What Can Go Wrong Between Local and EAS?

**Common issues caught by EAS testing build:**
1. **Code signing**: Provisioning profiles, entitlements
2. **Environment variables**: Different in production build
3. **Bundle issues**: Assets not included correctly
4. **Native module linking**: Works locally but fails in production
5. **iOS capabilities**: Permissions, background modes
6. **API keys**: Hardcoded values vs environment configs

## 💡 Pro Tip: EAS Build Status

Check build status:
```bash
# View recent builds
eas build:list --platform ios

# View specific build details
eas build:view [BUILD_ID]
```

## ⚡ Quick Commands Reference

```bash
# Phase 1: Local Release (what you're doing now)
npx expo run:ios --configuration Release

# Phase 2: EAS Testing Build (recommended next)
eas build --platform ios --profile testing

# Phase 3: Production Build + Submit (only after Phase 2 passes)
eas build --platform ios --profile production
eas submit --platform ios --latest

# Check build status
eas build:list --platform ios
```

## 🎯 Bottom Line

**To minimize wasted TestFlight uploads:**

1. ✅ Test local Release build first (you're here)
2. ✅ **Build with EAS testing profile** - this is the critical step!
3. ✅ Test EAS build thoroughly on device
4. ✅ Only then upload to TestFlight

**The EAS testing build is the closest you can get to TestFlight without actually uploading to TestFlight.**

---

**Current Status:**
- Phase 1: ✅ Ready to test (local Release build available)
- Phase 2: 📋 Recommended next step
- Phase 3: ⏸️ Wait until Phase 2 passes
