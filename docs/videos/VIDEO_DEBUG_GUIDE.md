# Video Upload & Playback Debug Guide

## Issues to Investigate

### Android
- ✅ **Video uploads successfully** 
- ❌ **Thumbnail not showing** in grid
- ❌ **Video won't play** when clicked

### Web
- ❌ **Video upload not working**
- ❌ **No error messages displayed**

## Added Logging

All video operations now have comprehensive console logging with `[VideoService]`, `[VideoGrid]`, and `[useVideoUpload]` prefixes.

### Check These Logs on Android:

1. **During Upload:**
   ```
   [VideoService] Starting upload: { videoId, uri }
   [VideoService] Video blob created: { size, type }
   [VideoService] Starting Firebase upload to: users/{uid}/videos/{id}.mp4
   [VideoService] Upload progress: { transferred, total, percent }
   [VideoService] Video uploaded successfully: {url}
   [VideoService] Generating thumbnail from: {uri}
   [VideoService] Thumbnail generated: {thumbnailUri}
   [VideoService] Thumbnail blob created: { size, type }
   [VideoService] Uploading thumbnail to: users/{uid}/thumbnails/{id}.jpg
   [VideoService] Thumbnail uploaded successfully: {url}
   [VideoService] Creating Firestore document: { videoUrl, thumbnailUrl, fileSize }
   [VideoService] Video document created: {docId}
   ```

2. **When Loading Videos:**
   ```
   [useVideoUpload] Loading videos for user: {userId}
   [VideoService] Loading videos for user: {userId}
   [VideoService] Found {n} videos in Firestore
   [VideoService] Video document: { id, hasThumbnailUrl, hasVideoUrl, thumbnailUrl }
   [VideoService] Returning {n} videos
   [useVideoUpload] Loaded videos: {n} videos
   [useVideoUpload] Video {n}: { id, hasThumbnail, hasVideoUrl }
   ```

3. **When Rendering:**
   ```
   [VideoGrid] Rendering video item: { id, hasThumbnail, thumbnailUrl, videoUrl }
   [VideoGrid] Thumbnail loaded successfully: {id}
   OR
   [VideoGrid] Thumbnail load error: {id} {error}
   ```

4. **When Playing:**
   ```
   [VideoGrid] Video clicked: {id}
   [VideoGrid] Video loaded successfully: {id}
   OR
   [VideoGrid] Video playback error: {id} {error}
   ```

## Common Issues & Fixes

### Issue 1: Thumbnail URL Empty in Firestore
**Symptom:** Logs show `thumbnailUrl: '(empty)'`
**Causes:**
- Thumbnail generation failed
- `expo-video-thumbnails` not working on Android
- Video format not supported for thumbnail generation

**Fix:** Check if thumbnail generation error is logged:
```
[VideoService] Failed to generate/upload thumbnail: {error}
```

### Issue 2: Thumbnail URL Present But Won't Load
**Symptom:** Logs show thumbnail URL but image fails to load
**Causes:**
- Firebase Storage permissions issue
- CORS issue (web only)
- Invalid/expired download URL

**Fix:** Check Image onError callback:
```
[VideoGrid] Thumbnail load error: {id} {nativeEvent}
```

### Issue 3: Video Won't Play
**Symptom:** Video modal opens but video doesn't play
**Causes:**
- Video URL invalid or expired
- Video format not supported on Android
- `expo-av` Video component issue

**Fix:** Check Video onError callback:
```
[VideoGrid] Video playback error: {id} {error}
```

### Issue 4: Web Upload Silent Failure
**Symptom:** No upload progress, no error message
**Causes:**
- Firebase not initialized properly for web
- `fetch()` API issue with file URI on web
- Blob creation failing silently

**Fix:** Check console for:
```
[VideoService] Failed to fetch video: {status} {statusText}
[VideoService] Video blob created: { size: 0, type: '' }
```

## Testing Steps

### Android Emulator
1. Open Metro bundler console
2. Open React Native debugger (Cmd+M → Debug)
3. Upload a video
4. Watch console for all `[VideoService]` logs
5. Check if thumbnail URL is saved to Firestore
6. Try to play the video
7. Check for any error logs

### Web Browser
1. Open browser DevTools console
2. Upload a video
3. Watch for:
   - Any fetch() errors
   - Blob creation success/failure
   - Firebase upload progress
   - Thumbnail generation errors
4. Check Network tab for failed requests
5. Check Firestore in Firebase Console

## Quick Fixes to Try

### If Thumbnail Not Showing:
1. **Check thumbnail generation works:**
   ```typescript
   // In VideoService.ts, line ~110
   // If this fails, the thumbnail will be empty
   const thumbnailUri = await generateVideoThumbnail(videoData.uri);
   ```

2. **Try using video URL as fallback:**
   ```typescript
   // In VideoGrid.tsx, change renderVideoItem to:
   {video.thumbnailUrl ? (
     <Image source={{ uri: video.thumbnailUrl }} ... />
   ) : video.videoUrl ? (
     <View style={styles.thumbnailPlaceholder}>
       <Text>Video</Text>
     </View>
   ) : (
     <Ionicons name="videocam" ... />
   )}
   ```

### If Video Won't Play:
1. **Check video URL is accessible:**
   - Copy URL from logs
   - Paste in browser
   - Should download/play the video

2. **Try different video format:**
   - Android prefers H.264/AAC MP4
   - Some MOV files may not work

### If Web Upload Fails:
1. **Check file picker result:**
   ```typescript
   // Add logging in useVideoUpload selectVideo():
   console.log('Selected video result:', result);
   ```

2. **Check if fetch() works on web:**
   ```typescript
   // In VideoService, try alternative:
   const videoResponse = await fetch(videoData.uri);
   console.log('Fetch response:', videoResponse.ok, videoResponse.status);
   ```

## Firebase Storage Rules Check

Ensure your Firebase Storage rules allow uploads:

```javascript
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Next Steps

1. **Test on Android** with logging enabled
2. **Copy all console logs** showing the issue
3. **Check Firestore Console** to see if thumbnailUrl field has value
4. **Test video playback** directly in browser using the videoUrl
5. **Share logs** with specific error messages

