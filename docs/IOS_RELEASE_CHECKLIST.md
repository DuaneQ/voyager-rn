# iOS Release Checklist - TravalPass

**CRITICAL:** Follow this checklist BEFORE every iOS build submission.

---

## Pre-Build Requirements

### 1. ✅ Increment Build Number (MANDATORY)

**Location:** `app.json` → `expo.ios.buildNumber`

**Current Build:** 15  
**Next Build:** 16 (increment before next submission)

**How to increment:**
```json
// app.json
"ios": {
  "buildNumber": "15"  // ← Change this to "16" for next build
}
```

⚠️ **NEVER submit without incrementing - wastes EAS build quota and costs money!**

---

### 2. ✅ Run Full Test Suite

```bash
npm test -- --no-coverage
```

**Expected:** All tests passing (1900+ tests)

---

### 3. ✅ Test Release Build Locally

```bash
npx expo run:ios --configuration Release
```

**Test checklist:**
- [ ] App launches without errors
- [ ] Terms of Service displays and cannot be bypassed
- [ ] User blocking works
- [ ] User reporting works
- [ ] Video reporting shows on other users' videos (not own videos)
- [ ] Firebase connection working
- [ ] Google Sign-In working
- [ ] Apple Sign-In working

---

### 4. ✅ Verify Apple Requirements (Guideline 1.2)

All 5 requirements must be implemented:
- [ ] Terms with zero tolerance (Section 4)
- [ ] Content filtering (multiple layers)
- [ ] Flagging mechanism (user + video reporting)
- [ ] Blocking with instant removal
- [ ] 24-hour response commitment

**Documentation:** See `docs/APPLE_REVIEW_NOTES.md`

---

### 5. ✅ Check Version Numbers

```json
// app.json
"version": "1.0.0",           // App version (user-facing)
"ios": {
  "buildNumber": "15"         // Build number (must increment)
},
"android": {
  "versionCode": 2            // Android version code
}
```

---

## Build & Submit

### 6. Build iOS App (with auto-submit)

```bash
eas build --platform ios --profile production --auto-submit
```

**Wait time:** 10-20 minutes for build + submission

---

### 7. Add Review Notes in App Store Connect

After auto-submit completes:

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to: My Apps → TravalPass → App Store tab
3. Find the new build and click "+" to add it
4. Scroll to "App Review Information" section
5. In "Notes" field, paste content from `docs/APPLE_REVIEW_NOTES.md`

---

## Post-Submission Verification

### 8. Verify Submission Status

Check App Store Connect:
- [ ] Build appears in "Activity" tab
- [ ] Status shows "Waiting for Review"
- [ ] Review notes are attached
- [ ] All required metadata is complete

---

## Build Number History

| Build | Date | Status | Notes |
|-------|------|--------|-------|
| 14 | Jan 14, 2026 | Rejected | Missing explicit zero tolerance language |
| 15 | Jan 15, 2026 | Submitted | Added Terms Section 4 + video reporting |
| 16 | TBD | Pending | ← Next build number |

---

## Quick Reference

**Current State (Build 15):**
- ✅ Build number incremented: 14 → 15
- ✅ Tests passing (1,908 tests)
- ✅ Release build tested locally
- ✅ All Apple requirements met
- ✅ Documentation prepared

**Before Next Build:**
- ⚠️ INCREMENT BUILD NUMBER TO 16
- ⚠️ Test release build again
- ⚠️ Run full test suite

---

**Last Updated:** January 15, 2026  
**Build Status:** Build 15 ready for submission
