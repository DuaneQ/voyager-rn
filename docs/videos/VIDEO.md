Prompt: Implement Unified Video Upload & Display for React Native (based on PWA logic)

Role:
You are a senior software engineer responsible for implementing the video upload and playback functionality in the TravalPass React Native mobile app, ported from the existing Progressive Web App (PWA).

The React Native app and PWA share the same Firebase backend (Firestore + Storage), so:

You must not modify existing Firestore schemas, document structures, or storage paths.

You can simplify and refactor client-side logic for readability, performance, and reliability.

Objective:
Implement video upload, preview, storage, and playback for profile videos and travel-related video posts, ensuring full functional parity between the PWA and React Native versions.

The final implementation must adhere to:

S.O.L.I.D. principles

Strong TypeScript typing

Robust permission handling (Camera Roll / Media Library)

≥ 90% unit test coverage

⚙️ Functional Requirements
1️⃣ Video Upload

Allow users to select a video from their device gallery or record a new one (using expo-image-picker or react-native-video-picker).

Prompt for required permissions before accessing the device library or camera:

iOS: Photo Library and Camera permissions

Android: READ_EXTERNAL_STORAGE / CAMERA

Compress video prior to upload (target ≤ 50 MB, same as PWA compression standards).

Display upload progress.

Upload to Firebase Storage using existing PWA paths

Store associated metadata in Firestore (same schema as PWA)

Update user’s Firestore profile to include the latest uploaded video ID if applicable.

Video Display / Playback

Display uploaded videos in a grid layout (thumbnail previews).

Tap on any video to open full-screen playback (using react-native-video or expo-av).

Support auto-resume, pause, mute, and full-screen toggle.

Optimize playback using lazy loading (videos only load when in viewport).

Reuse same Firestore query as PWA for video list retrieval.

3️⃣ Video Deletion

Allow users to delete videos they uploaded.

Confirm before deletion.

Delete both from Storage and Firestore metadata collection.

4️⃣ Cross-Platform Consistency

Use identical storage structure and metadata.

Upload/download functions must behave consistently on both PWA and React Native.

Implement videoService.ts under /services that abstracts all upload / list / delete functionality.

Architecture & Code Quality

Single Responsibility: Separate upload logic (service) from UI components.

Open/Closed: Allow new video categories without editing existing functions.

Liskov: UploadVideo works for both mobile and web contexts.

Interface Segregation: Separate concerns for upload, playback, and metadata retrieval.

Dependency Inversion: UI depends on videoService abstraction, not Firebase SDK.

Recommended Directory Structure

/src
  /components
    VideoGrid.tsx
    VideoUploader.tsx
    VideoPlayerModal.tsx
  /hooks
    useVideoUpload.ts
  /services
    videoService.ts
  /types
    video.d.ts

    Implementation Guidelines

Use expo-image-picker or react-native-image-picker for selecting / recording videos.

Request permissions at runtime:

import * as ImagePicker from 'expo-image-picker';
const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();


Compress videos using react-native-compressor or equivalent.

For playback: use react-native-video or expo-av with buffering and onError handlers.

Upload logic:

Convert to blob and upload with progress listener (uploadBytesResumable).

Update Firestore on success.

Handle network interruptions and retry logic.

🧪 Testing Requirements

Framework: Jest + React Native Testing Library

Mocks: Firebase Storage / Firestore / ImagePicker permissions.

Target ≥ 90 % coverage.

Test Cases

Upload success (progress → complete → Firestore updated)

Upload failure (network error → retry / error UI)

Permission denied (error toast / disabled upload button)

Video playback loads correctly (mocked video URL)

Deletion removes from Storage and Firestore

Render multiple videos in grid layout correctly

Verify lazy-loading only renders visible videos

🎨 UI Design Guidelines

White background; grid with 2 or 3 columns depending on screen width.

Each video shows a thumbnail (first frame) with duration overlay.

Full-screen modal for playback with semi-transparent close button.

Upload progress overlay (circular or linear).
