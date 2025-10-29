Prompt: Implement Unified Photo Upload for React Native (based on PWA logic)

Role:
You are a senior software engineer tasked with porting and improving the photo-upload functionality from the existing TravalPass Progressive Web App (PWA) into the React Native mobile app.
The React Native app and PWA share the same backend database (Firestore) and storage layer (Firebase Storage) — therefore:

You must not alter database schemas, document structure, or storage paths.

You may simplify and refactor client-side logic for clarity, performance, and maintainability.

Primary Goals:

Implement photo upload for both:

The profile photo (single image).

The photo grid/gallery (multiple images).

Reuse the same Firebase Storage paths and metadata formats as the PWA.

Ensure seamless behavior across both web (PWA) and mobile (React Native).

Strictly follow S.O.L.I.D. principles, strong typing, and clean architecture.

Deliver ≥ 90 % unit-test coverage with reusable mocks and clear separation of concerns.

⚙️ Functional Requirements

Profile Photo Upload

Allow users to select or capture a photo (via Expo ImagePicker or RN Image Picker).

Show local preview before upload.

Compress image before upload to optimize bandwidth (≤ 2 MB).

Upload to Firebase Storage under the existing users/{userId}/profile.jpg path.

Update Firestore user.profilePhotoUrl field.

Photo Grid / Gallery Upload

Support multiple image uploads (up to X photos – same as PWA).

Store in users/{userId}/photos/{photoId}.jpg using identical metadata schema (caption, timestamp, storageRef, etc.).

Retrieve existing photos and display in grid view.

Allow deletion with confirmation dialog.

Cross-Platform Consistency

Use a shared photoService.ts or storageService.ts that abstracts Firebase logic.

Ensure all logic runs identically on web and mobile (with platform detection for file handling).
Error Handling & User Feedback

Show upload progress and success/failure states.

Gracefully handle network interruptions (retry or notify user).

🧱 Architecture & Code Quality

Single Responsibility: Each component (UI, service, hook) does one thing.

Open/Closed: New upload targets can be added via service extension, not code edits.

Liskov: Mobile and web upload flows must be interchangeable.

Interface Segregation: Split interfaces for profile vs gallery upload.

Dependency Inversion: Components depend on abstractions, not Firebase SDK directly.

esting Requirements

Goal: ≥ 90 % coverage.

Framework: Jest + React Native Testing Library.

Mock Firebase Storage and Firestore calls.

Test cases:

Upload success + failure.

Retry logic + network errors.

Deletion flow confirmation.

Rendering of upload progress and preview.

State sync between context and storage.

💡 Implementation Guidelines

Keep typings strict (interface PhotoMetadata { id:string; url:string; caption?:string; createdAt:number; }).

Extract constants (paths, limits, MIME types) to /config/storage.ts.

Use async/await + try/catch + typed errors.

Maintain consistent naming (uploadProfilePhoto, uploadGalleryPhoto).

Use ESLint + Prettier + TypeScript strict mode.

✅ Deliverables

ProfilePhotoUploader.tsx

PhotoGrid.tsx

photoService.ts with fully typed methods and JSDoc.

usePhotoUpload.ts custom hook for managing upload state.

Unit tests covering all paths (≥ 90 %).

Brief README snippet documenting service API and test coverage report.