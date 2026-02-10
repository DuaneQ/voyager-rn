# Android Video Feed Production Fix

## Problem Summary

**Issue**: Android video feed failing in production with "format not compatible with device" errors.

**Root Cause**: The `onVideoUploaded` Cloud Function has been failing since ~Feb 3, 2026 with IAM permission error:
```
Error: Permission 'iam.serviceAccounts.signBlob' denied on resource
```
in last ~7 days (since Feb 3, 2026) are broken on Android
- Older videos that were successfully migrated to Mux work fine
- New uploads continue to fail until IAM permission is fixed
- ❌ No `muxAssetId` (never sent to Mux)
- ❌ No `muxPlaybackUrl` (never transcoded)
- ❌ Only raw video URL (incompatible with Android devices due to codec/resolution issues)

**Impact**: 
- Affects **only Android** (iOS and Web work fine with raw videos)
- Videos uploaded before Mux integration are broken on Android
- Videos actively being processed by Mux show correctly (processing indicator)

## Technical Details

### Why Android is Affected

Android devices have limited hardware video decoder support:
- Budget devices (MediaTek, low-end Snapdragon) often lack HEVC/H.265 decoders
- High-resolution H.264 (4K, high bitrate) exceeds hardware decoder capabilities
- Each device typically supports 4-8 concurrent MediaCodec decoders maximum

### Why iOS/Web Works

- iOS: Universal hardware decoder support (H.264, HEVC on newer devices)
- Web: Software fallback decoders in browsers handle incompatible formats

### The Code Gap

Previous logic only detected videos **actively being processed**:

```typescript
// OLD: Only catches videos with muxAssetId (processing started)
const isMuxProcessing = Platform.OS === 'android' && !video.muxPlaybackUrl && !!video.muxAssetId;
```

**Missing case**: Videos with NO Mux processing at all (`muxAssetId` is undefined) fell through to raw playback, causing codec errors.

## Fix Implemented
IAM Permission Fix (REQUIRED FIRST)

The `onVideoUploaded` function needs permission to generate signed URLs for Mux to access videos in Firebase Storage.

**Run the fix script:**
```bash
cd /Users/icebergslim/projects/voyager-RN
./FIX_PRODUCTION_VIDEOS.sh
```

This script will:
1. Install gcloud CLI if needed
2. Authenticate with Google Cloud
3. Grant `roles/iam.serviceAccountTokenCreator` to Cloud Functions service account
4. Provide instructions for processing failed videos

**What the IAM fix does:**
- Allows Cloud Functions to call `file.getSignedUrl()` for Mux access
- Fixes: `Permission 'iam.serviceAccounts.signBlob' denied` errors
- Enables automatic Mux processing for **new uploads**

### 2. Enhanced Detection Logic (Client-side)
### 1. Enhanced Detection Logic

UpdFix Recently Failed Videos

### Automated Script (Recommended)

Use the Node.js script to process videos that failed in the last week:

```bash
cd /Users/icebergslim/projects/voyager-pwa
node process_failed_videos.js
```

**What the script does**:
1. Finds all videos without `muxAssetId`
2. Counts recent ones (last 7 days) vs older ones  
3. Asks for confirmation
4. Processes each video through `processVideoWithMux` function
5. Provides summary of success/failure

**How it works**:
1. Queries Firestore for videos without `muxAssetId`
2. Filters to recent uploads (last 7 days)
3. Calls `processVideoWithMux` Cloud Function for each video
4. Mux transcodes videos (2-10 minutes each)
5. Mux webhook updates Firestore with `muxPlaybackUrl` when ready

**Cost**: ~$0.005 per minute of video processed (Mux baseline encoding tier)

### Manual Processing (Individual Videos)

For specific problematic videos:

```bash
cd /Alternative: User Re-upload

After IAM permission is fixed, users can delete incompatible videos and re-upload. New uploads will automatically trigger Mux processing via the fixed `onVideoUploaded` f
# Process in batches if you have many videos
# Mux charges per asset, so review pricing before large migrations
```

**How it works**:
1. Queries Firestore for videos without `muxAssetId`
2. Submits each video URL to Mux for transcoding
3. Updates Firestore with `muxAssetId` and `muxStatus`
4. Mux webhook updates `muxPlaybackUrl` when ready (2-10 minutes per video)

**Cost**: ~$0.005 per minute of video processed (Mux baseline encoding tier)

### Option 2: Individual Video Processing

For specific problematic videos, use `processVideoWithMux`:

```typescript
// From React Native app (requires authenticated user)
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebaseConfig';

const processVideo = async (videoId: string, videoUrl: string) => {
  const processVideoFn = httpsCallable(functions, 'processVideoWithMux');
  const result = await processVideoFn({ videoId, videoUrl });
  console.log('Processing started:', result.data);
};
```

### Option 3: Delete and Re-upload

Users can delete incompatible videos and re-upload them. New uploads automatically trigger Mux processing via the `onVideoUploaded` Cloud Function.

## Verification Steps

### 1. Check If Mux Cloud Functions Are Deployed

```bash
cd /path/to/voyager-pwa

# List deployed functions
npx firebase-tools functions:list --project mundo1-1

# Should see:
# - onVideoUploaded
# - muxWebhook
# - processVideoWithMux
# - migrateVideosToMux
```

### 2. Verify Mux Webhook Setup

Check Firebase Console → Functions → muxWebhook logs for recent activity.

Expected webhook URL:
```
https://us-central1-mundo1-1.cloudfunctions.net/muxWebhook
```

Verify in Mux Dashboard (https://dashboard.mux.com/settings/webhooks) that this URL is configured.

### 3. Test New Video Upload Flow

1. Upload a test video from the app
2. Check Firestore `videos` collection for the new document
3. Should see fields: `muxAssetId`, `muxStatus: "preparing"`, `muxProcessingStartedAt`
4. Wait 2-10 minutes for Mux to process
5. Pull-to-refresh the video feed
6. Verify video now has `muxPlaybackUrl` and plays on Android

### 4. Query for Problematic Videos

```javascript
// Firestore query to find videos without Mux processing
db.cStep 1: Fix IAM Permission (CRITICAL - Do First)
- [ ] Run `./FIX_PRODUCTION_VIDEOS.sh` to grant signBlob permission
- [ ] Verify permission granted: Check Cloud Functions logs for next upload
- [ ] Test with new video upload to confirm onVideoUploaded works

### Step 2: Process Failed Videos
- [ ] Run `node process_failed_videos.js` to process videos from last week
- [ ] Monitor Mux webhook logs for processing completion (2-10 min per video)
- [ ] Verify processed videos now have `muxPlaybackUrl` in Firestore

### Step 3: Deploy Client Code Fix
- [x] Update `VideoCardV2.tsx` with enhanced detection logic
- [x] Update UI messaging for incompatible videos
- [ ] Test on Android emulator/device
- [ ] Deploy to production via EAS build
- [ ] Verify Android app shows correct messages for unprocessed videos

### Immediate (Code Fix)
- [x] Update `VideoCardV2.tsx` with enhanced detection logic
- [x] Update UI messaging for incompatible videos
- [ ] Test on Android emulator/device
- [ ] Deploy to production via EAS build

### Follow-up (Video Migration)
- [ ] Verify Mux Cloud Functions are deployed to production
- [ ] Run dry-run migration to count affected videos
- [ ] Review Mux pricing for migration cost estimate
- [ ] Execute batch migration (in batches of 50)
- [ ] Monitor Mux webhook logs for processing completion
- [ ] Verify videos now play on Android production app

## Monitoring & Prevention

### Log Monitoring

Watch for these Firebase Function logs:
```
[Mux] Processing video upload: userId=..., videoId=...
[Mux] Asset created: ABC123, status: preparing
[Mux Webhook] Asset ready: ABC123, playbackUrl: https://stream.mux.com/...
```

### Error Detection

Look for player errors in Android production:
```
[ExpoVideoPlayer] UNSUPPORTED FORMAT for ...: { mimeType: ..., size: ... }
```

### Prevention

New video uploads should automatically trigger Mux processing. If `onVideoUploaded` fails:
1. Check Cloud Function deployment status
2. Verify Firebase Storage bucket trigger is configured
3. Check function logs for errors
4. Ensure Mux API credentials are valid

## Cost Considerations

**Mux Pricing** (baseline encoding tier):
- $0.005 per minute of video processed
- $0.002 per minute of video delivered (bandwidth)

**Example**: 
- 100 videos averaging 2 minutes each
- Encoding cost: 100 × 2 × $0.005 = **$1.00**
- Monthly bandwidth (1000 views): 100 × 2 × 1000 × $0.002 = **$40** (scales with usage)

**Optimization**:
- Max resolution capped at 1080p (see `max_resolution_tier` in code)
- Baseline encoding tier (fastest, lowest quality needs)
- Adaptive bitrate streaming reduces bandwidth costs

## Related Files

- `src/components/video/VideoCardV2.tsx` - Main video player component (fixed)
- `functions/src/muxVideoProcessing.ts` - Cloud Functions for Mux integration
- `src/services/video/ExpoVideoPlayer.ts` - Player with format detection
- `voyager-pwa/functions/src/muxVideoProcessing.ts` - Shared Cloud Functions

## References

- [Mux Video Documentation](https://docs.mux.com/guides/video/stream-video-files)
- [Android MediaCodec Limits](https://developer.android.com/reference/android/media/MediaCodec)
- [Expo Video API](https://docs.expo.dev/versions/latest/sdk/video/)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)

---

**Last Updated**: February 10, 2026
**Status**: Fix implemented, awaiting production deployment and video migration
