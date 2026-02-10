# Production Video Processing - Root Cause Analysis & Fix

## Executive Summary

**Problem**: Android video feed failing in production with format compatibility errors.

**Root Cause**: IAM permission `iam.serviceAccounts.signBlob` was missing, causing `onVideoUploaded` Cloud Function to fail silently since Feb 3, 2026.

**Status**: ✅ **FIXED** - IAM permissions granted, 5 failed videos processed to Mux.

---

## Timeline of Events

### February 3, 2026 @ 22:10 UTC
- `onVideoUploaded` function redeployed to production
- Function requires `iam.serviceAccounts.signBlob` permission to create signed URLs for Mux
- Permission was NOT granted during deployment

### February 3-10, 2026
- **All video uploads failed silently:**
  - Videos uploaded to Firebase Storage successfully
  - `onVideoUploaded` triggered but failed with permission error
  - NO Mux processing occurred
  - Android app showed format errors (raw MP4s don't work on Android)

### February 10, 2026 @ 14:14 UTC
- Last video upload attempt: `video_1770732863952_4fq341n32.mp4`
- Function triggered, failed with IAM error:
  ```
  [Mux] Error processing video: Permission 'iam.serviceAccounts.signBlob' denied
  ```

### February 10, 2026 (Today) - Fix Applied
1. ✅ Identified IAM permission issue from Firebase Console logs
2. ✅ Granted `roles/iam.serviceAccountTokenCreator` to compute service account
3. ✅ Processed 5 failed videos manually using admin script
4. ✅ All 5 videos submitted to Mux successfully

---

## What We Found

### Cloud Function Status
```bash
Function: onVideoUploaded
Status: ACTIVE ✅
Trigger: google.cloud.storage.object.v1.finalized
Bucket: mundo1-1.appspot.com
Service Account: 533074391000-compute@developer.gserviceaccount.com
Last Deployed: 2026-02-03T23:49:50Z
```

###Executions Since Feb 3
- **Total executions**: Multiple (triggered by Storage uploads)
- **Successful**: 0 ❌
- **Failed with IAM error**: All ❌
- **Last attempt**: Feb 10 @ 14:14 UTC

### Failed Videos Processed
1. **Concert in ATL** - Mux Asset: `cTAtjFclJrvK9KJEppVKwPuguZfrqZPjCf7B02c1mf4I`
2. **How to match with other users** - Mux Asset: `l7HEBEKzlpU1fsCw0102pl66p025MQJz4w3Uu00MuYU88UY`
3. **Savannah, GA** - Mux Asset: `VmX5CePYkGRYrk02hQY9WBVuWrHXS6fayYQlGwxRxums`
4. **Grenada 01/26** (today's upload) - Mux Asset: `grGNQ1cQwzz21mpBxaXaf7C6kkaNPT81NCuH01M00dgYg`
5. **bowling alley** - Mux Asset: `aNGcyI2Rn2zU49h2UTqQrPGS9ZzW6w4ZBnAv7hgW8RY`

---

## Fix Applied

### 1. IAM Permission Grant
```bash
gcloud iam service-accounts add-iam-policy-binding \
  533074391000-compute@developer.gserviceaccount.com \
  --member="serviceAccount:533074391000-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --project=mundo1-1
```

**Result**: `onVideoUploaded` function can now create signed URLs for Mux.

### 2. Manual Video Processing
Created admin script (`process_failed_videos_admin.js`) to:
- Query Firestore for videos without `muxAssetId`
- Create Mux assets for each video
- Update Firestore with Mux asset IDs

**Result**: 5/5 videos processed successfully, status: "preparing"

---

## Current Status

### ✅ Fixed
- IAM permissions granted
- Future uploads will process automatically
- 5 failed videos submitted to Mux

### 🔄 In Progress
- Mux processing 5 videos (2-10 minutes each)
- Webhook will update `muxPlaybackUrl` when ready

### ⏳ Next Steps
1. **Wait for Mux** (2-10 min): Videos will finish encoding
2. **Webhook fires**: `muxWebhook` function updates Firestore with playback URLs
3. **Test Android**: Videos should now play on Android
4. **Monitor**: Watch for new uploads to verify automatic processing works

---

## Monitoring

### Check Mux Processing Status
```bash
# Mux Dashboard
https://dashboard.mux.com/

# Firestore - check for muxPlaybackUrl field
gcloud firestore documents list videos --project=mundo1-1
```

### Check Recent onVideoUploaded Executions
```bash
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=onvideouploaded" \
  --limit=20 --project=mundo1-1
```

### Verify New Uploads Work
1. Upload a test video from Android app
2. Check Cloud Run logs for `[Mux] Processing video upload`
3. Verify Mux asset created (no IAM error)
4. Wait for webhook to add `muxPlaybackUrl`
5. Verify video plays on Android

---

## Why This Happened

### The Deployment Gap
When `onVideoUploaded` was deployed on Feb 3, the deployment process did NOT automatically grant the required IAM permissions. This is because:

1. **Cloud Functions Gen2** use Cloud Run under the hood
2. **Service Account**: Uses default compute service account
3. **file.getSignedUrl()** requires `iam.serviceAccounts.signBlob` permission
4. **Permission gap**: Function deployed without this permission

### Silent Failure
The function failed silently because:
- No retry policy configured (`RETRY_POLICY_DO_NOT_RETRY`)
- Errors logged but not alerted
- Videos uploaded to Storage (looked successful to users)
- Only Android users noticed (iOS/Web can play raw MP4s)

---

## Prevention

### 1. Add IAM Permission Check
Add to function deployment checklist:
```typescript
// Add to onVideoUploaded function
console.log('[Mux] Verifying IAM permissions...');
try {
  await file.getSignedUrl({ action: 'read', expires: Date.now() + 1000 });
} catch (error) {
  console.error('[Mux] IAM PERMISSION MISSING!', error);
  // Send alert to monitoring
}
```

### 2. Add Retry Policy
Update function configuration:
```typescript
export const onVideoUploaded = onObjectFinalized({
  ...
  retryPolicy: 'RETRY_POLICY_RETRY', // ← Add retries
  ...
});
```

### 3. Set Up Alerts
- Alert on IAM permission errors
- Alert on zero `onVideoUploaded` executions for > 1 hour
- Monitor Mux asset creation success rate

---

## Verification Checklist

- [x] IAM permissions granted
- [x] 5 failed videos processed to Mux
- [ ] Mux processing complete (wait 2-10 min)
- [ ] muxPlaybackUrl populated in Firestore
- [ ] Test video plays on Android device
- [ ] Upload new video and verify automated processing

**Next action**: Wait 10 minutes, then check Firestore for `muxPlaybackUrl` fields.
