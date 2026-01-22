# Video Feed Documentation

**Purpose**: Consolidated, up-to-date documentation for video feed issues and solutions

---

## 📁 Current Documentation (Read These)

### 1. **CURRENT_STATUS.md** ⭐ START HERE
- Current state of the video feed
- Active memory leak issue (crashes after 3 videos)
- Recommended solutions (not yet implemented)
- Next steps and testing protocol

### 2. **FAILED_APPROACHES.md** ⚠️ READ BEFORE IMPLEMENTING
- What has been tried and WHY it failed
- Prevents re-attempting broken solutions
- Pattern recognition for future attempts

### 3. **MEMORY_DIAGNOSTIC_ANALYSIS.md** 📊 DATA
- Memory profiling data (Jan 21, 2026)
- Test results and measurements
- Diagnostic tools and scripts

### 4. **FIND_VIDEOS_GUIDE.js** 🔍 UTILITY
- Script to help find videos for testing
- Queries Firebase for available videos

---

## 🗂️ Archive

Historical documentation moved to `archive/` directory:
- Detailed post-mortems of failed attempts
- Old troubleshooting sessions
- Test coverage reports
- Feature implementation docs

**These are kept for reference but should NOT be used as current guidance.**

---

## 🚨 Critical Rules

### Before Implementing ANY Solution

1. ✅ **Read CURRENT_STATUS.md** - Know the current state
2. ✅ **Read FAILED_APPROACHES.md** - Don't repeat mistakes
3. ✅ **Get user approval** - No changes without consent
4. ✅ **Have rollback plan** - Git branch or commit
5. ✅ **Test on real device** - Emulators lie, unit tests with mocks lie

### After Implementing Changes

1. ✅ **TypeScript compiles** - `npx tsc --noEmit`
2. ✅ **Unit tests pass** - `npm test`
3. ✅ **Device tested** - Both iOS and Android
4. ✅ **Memory monitored** - Use diagnostic script
5. ✅ **Results documented** - Update CURRENT_STATUS.md

---

## 📊 Quick Status Check

**Last Updated**: January 21, 2026

**Issue**: Android crashes after 3 videos (17MB leak per video)  
**Root Cause**: MediaCodec decoders not released  
**Status**: 🔴 CRITICAL - Awaiting solution implementation  
**Next Step**: User must approve solution approach

---

## 🔗 Related Files

- `../../scripts/diagnose-memory.sh` - Memory monitoring tool
- `../../src/components/video/VideoCard.tsx` - Video component
- `../../src/pages/VideoFeedPage.tsx` - Feed container
- `../../android-crash.log` - Crash logs

---

## 📝 Documentation Standards

When adding new documentation:
- Keep it concise and actionable
- Include dates and test results
- Reference related files
- Update this README if adding new top-level docs
- Archive old docs that become obsolete

**Maintainer**: Keep this folder lean. If it gets over 10 files, consolidate or archive.
