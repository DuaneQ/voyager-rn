/**
 * Find videos created around Jan 10-14, 2026 (the failing ones from screenshots)
 * Run this in Firebase Console > Firestore > videos collection
 */

// Go to: https://console.firebase.google.com/project/mundo1-1/firestore/data/videos

// In the Firebase Console, use this query:
// 1. Click "Start collection"
// 2. Add filters:
//    Field: createdAt
//    Operator: >=
//    Value: January 10, 2026 00:00:00 UTC
//
//    AND
//
//    Field: createdAt
//    Operator: <=
//    Value: January 15, 2026 23:59:59 UTC

// Or search for videos with titles:
// - "Video 1/14/2026"
// - "Video 1/13/2026"  
// - "Video 1/10/2026"
// - "TravalPass"

// Manual steps in Firebase Console:
console.log(`
🔍 HOW TO FIND THE FAILING VIDEOS IN FIREBASE CONSOLE:

1. Open Firebase Console:
   https://console.firebase.google.com/project/mundo1-1/firestore/data/videos

2. Look for videos with these titles (shown in screenshots):
   - "Video 1/14/2026"
   - "Video 1/13/2026"
   - "Video 1/10/2026"
   - "TravalPass - Travel the world together"

3. Or filter by creation date:
   - Click filter icon
   - Field: createdAt
   - Range: January 10-14, 2026

4. Check each video for:
   - duration field (should be > 1 second)
   - videoUrl (should exist)
   - fileSize (should be > 0)

5. Copy the Document IDs of any suspicious videos

=====================================
We know one failing video is:
Document ID: Yt1NBRsJFrIGF4D6nzgK
Storage path: users/MIei2rTwzjWGRbiEG4WSgrdsJ5V2/videos/video_1761135054429_n8qq22hjh.mp4
=====================================
`);
