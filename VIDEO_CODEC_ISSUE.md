# Video Codec Issue - Android Emulator

## Problem Summary

**Android Emulator does not support HEVC (H.265) video playback**, only H.264 (AVC) is supported.

### Symptoms
- ✅ Video uploads successfully to Firebase Storage
- ❌ Thumbnail generation fails (empty thumbnailUrl in Firestore)
- ❌ Video playback fails with error: `Decoder failed: c2.goldfish.hevc.decoder`

### Root Cause
The Android Goldfish emulator (default Android emulator) does not include hardware or software decoder for HEVC/H.265 codec. This affects:
1. **Thumbnail generation** - `expo-video-thumbnails` cannot extract frames from HEVC videos
2. **Video playback** - `expo-av` Video component cannot decode HEVC videos

## Error Messages

### Playback Error
```
ERROR [VideoGrid] Video playback error: wBfdQ8u5eleJaewOT52X 
me.g: Decoder failed: c2.goldfish.hevc.decoder
```

### Thumbnail Error (in logs)
```
[VideoService] Failed to generate/upload thumbnail: [Error message]
[VideoGrid] Rendering video item: {"hasThumbnail": false, "thumbnailUrl": "(empty)"}
```

## Solutions

### Option 1: Use H.264 Encoded Videos (Recommended for Testing)
**For immediate testing**, use H.264 (AVC) encoded MP4 videos:

#### How to Convert Video to H.264:
**On Mac (using ffmpeg):**
```bash
# Install ffmpeg if not already installed
brew install ffmpeg

# Convert video to H.264
ffmpeg -i input_video.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output_h264.mp4
```

**On Windows (using ffmpeg):**
```powershell
# Download ffmpeg from https://ffmpeg.org/download.html
# Convert video to H.264
ffmpeg.exe -i input_video.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output_h264.mp4
```

**Using Online Tools:**
- [CloudConvert](https://cloudconvert.com/mp4-converter) - Select "Video Codec: H.264"
- [Online-Convert](https://www.online-convert.com/) - Choose MP4 with H.264 codec

#### Verify Video Codec:
```bash
# Check codec info
ffmpeg -i your_video.mp4
# Look for "Video: h264" in output (good)
# Avoid "Video: hevc" or "Video: h265" (won't work on emulator)
```

### Option 2: Test on Physical Android Device
Physical Android devices typically support both H.264 and HEVC codecs. To test:
1. Enable USB debugging on your Android phone
2. Connect via USB
3. Run `npx expo run:android`
4. The app will install on your physical device

### Option 3: Add Video Transcoding (Future Enhancement)
To automatically convert videos to H.264 during upload, we would need to:

1. **Add `expo-video-processing` or similar library**
2. **Transcode on device before upload**
   ```typescript
   // Pseudocode
   const transcodedUri = await transcodeVideo(videoUri, {
     codec: 'h264',
     bitrate: 2000000, // 2 Mbps
   });
   ```
3. **Trade-off**: Longer upload time, more battery usage

**Note**: This is complex and may not be necessary for MVP.

### Option 4: Server-Side Transcoding (Production Solution)
For production, use Firebase Cloud Functions or AWS MediaConvert to transcode videos after upload:

1. User uploads video (any codec)
2. Cloud function triggers on upload
3. Transcode to H.264 in cloud
4. Replace original with transcoded version
5. Generate thumbnail server-side

**Benefits**:
- Works with any input codec
- No device processing overhead
- Consistent quality across all users

## Current Implementation

### Error Handling Added
1. **Playback Error**: Shows user-friendly message about unsupported format
2. **Thumbnail Fallback**: Video uploads even if thumbnail generation fails
3. **Logging**: Comprehensive logs to identify codec issues

### User Experience
- Videos upload successfully to Firebase Storage
- If thumbnail fails, video shows placeholder icon
- If playback fails, user sees: *"This video format is not supported on your device. Please use H.264 (AVC) encoded videos."*

## Testing Checklist

### ✅ H.264 Video (Should Work)
- [x] Video uploads successfully
- [x] Thumbnail generates and displays
- [x] Video plays in modal
- [x] No decoder errors

### ❌ HEVC Video (Expected to Fail on Emulator)
- [x] Video uploads successfully
- [x] Thumbnail generation fails (empty thumbnailUrl)
- [x] Video shows placeholder icon (no thumbnail)
- [x] Playback fails with decoder error
- [x] User sees helpful error message

## Recommendations

### For Development
1. **Use H.264 encoded test videos** for Android emulator testing
2. **Test HEVC videos on physical devices** to verify they work in production
3. **Document video requirements** in user-facing help/FAQ

### For Production
1. **Add video format validation** before upload
   - Show warning if video is HEVC
   - Suggest re-encoding or using different video

2. **Consider server-side transcoding** if budget allows
   - Firebase Cloud Functions + FFmpeg
   - AWS MediaConvert
   - Google Cloud Video Transcoder API

3. **Update app requirements**:
   - Document supported video formats (H.264/AVC MP4)
   - Add format check in video picker
   - Show helpful error during upload if format is unsupported

## Supported Video Specifications

### ✅ Recommended Format
- **Container**: MP4
- **Video Codec**: H.264 (AVC)
- **Audio Codec**: AAC
- **Max File Size**: 100 MB (current limit)
- **Max Duration**: 60 seconds (current limit)
- **Resolution**: Up to 1920x1080 (1080p)

### ❌ Not Supported (on Android Emulator)
- **HEVC/H.265** - Modern codec, better compression, but not supported
- **VP9/VP8** - WebM codecs, limited mobile support
- **AV1** - Newest codec, very limited device support

## Web Platform Note

Web video upload is a separate issue. The codec issue primarily affects:
- **Android Emulator**: Cannot play HEVC
- **iOS Simulator**: Usually supports HEVC
- **Web Browser**: Depends on browser (Chrome/Firefox support H.264 widely)

For web issues, check:
1. CORS settings for Firebase Storage
2. Browser console for fetch() errors
3. File picker compatibility on web platform

## References

- [Android Media Formats](https://developer.android.com/guide/topics/media/media-formats)
- [expo-av Documentation](https://docs.expo.dev/versions/latest/sdk/video/)
- [expo-video-thumbnails Documentation](https://docs.expo.dev/versions/latest/sdk/video-thumbnails/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

