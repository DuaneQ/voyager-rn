Prompt for Copilot (Implement VideoFeed Page in React Native)

You are implementing the Video Feed feature for the TravalPass React Native app.
This feature must mirror the PWA’s video functionality, integrating with Firebase Storage and Firestore while following S.O.L.I.D. principles, clean architecture, and TypeScript best practices.

The page displays user-uploaded travel videos (short-form format), supports infinite scrolling, like, view count tracking, and sharing, and allows authenticated users to upload new videos using the existing useVideoUpload hook.

The React Native version should preserve the same data schema, Firestore collections, and logic as the PWA, but with improved performance and mobile UX.

🎯 Primary Objectives

Build a scrollable video feed that loads videos from Firestore (videos collection), ordered by createdAt (descending).

Integrate VideoPlayer logic adapted for React Native (using react-native-video or expo-av).

Track video views, likes, and shares using Firestore and local caching for efficiency.

Support infinite scroll pagination (10–15 videos per page).

Include a floating upload button to open the upload modal that uses the existing useVideoUpload() hook.

Ensure all updates (likes/views) are debounced to prevent redundant network writes.

Implement proper cleanup (pause off-screen videos, release player instances).

⚙️ Functional Requirements
1️⃣ Video Feed Loading

Fetch videos via Firestore:

collection(db, 'videos');
orderBy('createdAt', 'desc');
limit(pageSize);
startAfter(lastVisibleDoc);


Cache the last fetched document for pagination.

On scroll near bottom, fetch next batch (onEndReached).

Track videos locally with useRef to avoid re-renders when scrolling.

2️⃣ Video Playback

Use react-native-video for playback.

Implement:

Auto-play video when fully visible.

Auto-pause when off-screen or user scrolls past.

Mute by default; unmute on user tap.

Use a FlatList to render one video per screen viewport for vertical feed swiping (similar to TikTok or Reels UX).

Reuse logic from PWA’s VideoPlayer:

Mute/unmute toggle

Error handling for unsupported formats

Overlay title/description and branding footer

3️⃣ View Tracking

When a video plays for more than 3 seconds, increment its viewCount in Firestore:

updateDoc(doc(db, 'videos', videoId), { viewCount: increment(1) });


Use a viewedVideoIds Set in memory to prevent multiple increments during the same session.

4️⃣ Like / Unlike

Use updateDoc with arrayUnion / arrayRemove on videos/{id}/likes.

Update local state optimistically.

Only authenticated users can like videos; prompt login otherwise.

Display heart icon toggled by video.likes.includes(auth.currentUser.uid).

5️⃣ Share Functionality

Reuse videoSharing.ts logic to generate shareable URLs:

Example: https://travalpass.com/videos/{videoId}

Implement the React Native share sheet:

import * as Sharing from 'expo-sharing';
import * as Clipboard from '@react-native-clipboard/clipboard';


Try sharing via native Share API; if unavailable, copy link to clipboard and show toast:

“Link copied to clipboard!”

6️⃣ Upload Modal Integration

Floating action button → opens upload modal (React Native bottom sheet).

Use useVideoUpload() from /hooks/useVideoUpload.tsx.

Ensure upload progress and error handling match PWA logic:

Status updates: “Uploading video...”, “Creating thumbnail...”, “Upload complete!”

Upon successful upload:

Add new video to top of feed.

Scroll to top and auto-play.

7️⃣ Offline / Performance Enhancements

Cache fetched videos and thumbnails in AsyncStorage.

Use react-native-fast-image for thumbnails.

Prefetch next video’s buffer while current video plays.

8️⃣ Error Handling

Wrap all Firestore operations in try/catch.

Use fallback UI for video load failures:

"Video failed to load. Tap to retry."


Display a skeleton loader during feed initialization.

🧱 Architecture Guidelines
Layer	Responsibility
/screens/VideoFeed.tsx	Page container handling scrolling, pagination, and event handlers
/components/VideoCard.tsx	Individual video component rendering player, title, likes, and share
/hooks/useVideoFeed.ts	Fetch, paginate, and manage video state
/hooks/useVideoUpload.tsx	Upload logic (already implemented)
/utils/videoHelpers.ts	Utility functions (debounce, visibility checks, caching, etc.)
/utils/videoSharing.ts	Existing share link generator
🧩 UX Details

Vertical scroll feed (TikTok-style).

Tap video to toggle play/pause.

Double-tap to like (animated heart).

Show overlay:

Title, location, and hashtags.

Like, comment, and share icons.

Profile avatar (if available).

Show TravalPass branding footer for public videos.

🧪 Testing

Create Jest + React Native Testing Library tests for:

Feed pagination (fetchNextPage)

Like/unlike updates

View tracking debounce

Share functionality

Upload modal integration

Error boundaries

Aim for ≥ 85% coverage.

✅ Deliverables

/screens/VideoFeed.tsx (main feed)

/components/VideoCard.tsx

/hooks/useVideoFeed.ts

Integration with useVideoUpload and videoSharing.ts

Jest tests: /__tests__/VideoFeed.test.tsx

⚡️ Key Principles

Keep the same Firestore schema (videos collection).

Use S.O.L.I.D. and dependency inversion (e.g., inject Firestore methods).

Debounce writes (views/likes).

Minimize re-renders with memoization and refs.

Optimize for low-latency mobile UX.