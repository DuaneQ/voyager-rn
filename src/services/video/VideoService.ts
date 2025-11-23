/**
 * VideoService
 * Handles video upload, deletion, and retrieval
 * Uses same Firebase Storage paths as PWA for cross-platform compatibility
 */

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { storage, db } from '../../config/firebaseConfig';
import { Video, VideoUploadData } from '../../types/Video';
import { generateVideoThumbnail } from '../../utils/videoValidation';

export class VideoService {
  /**
   * Upload video to Firebase Storage and create Firestore document
   * Uses same paths as PWA: users/{userId}/videos/ and users/{userId}/thumbnails/
   */
  async uploadVideo(
    videoData: VideoUploadData,
    userId: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<Video> {
    try {
      // Generate unique video ID
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      onProgress?.(10, 'Preparing video...');

      // Fetch video file as blob directly from URI (works on iOS, Android, Web)
      const videoResponse = await fetch(videoData.uri);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();

      onProgress?.(20, 'Uploading video...');

      // Upload video to Storage (same path as PWA)
      const videoRef = ref(storage, `users/${userId}/videos/${videoId}.mp4`);
      
      // Add metadata for better compatibility
      const metadata = {
        contentType: 'video/mp4',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          fileSize: videoBlob.size.toString(),
        },
      };

      const uploadTask: UploadTask = uploadBytesResumable(videoRef, videoBlob, metadata);

      // Track upload progress
      const videoUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = 20 + (snapshot.bytesTransferred / snapshot.totalBytes) * 40;
            onProgress?.(Math.round(progress), 'Uploading video...');
            
          },
          (error) => {
            console.error('[VideoService] Upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              
              resolve(url);
            } catch (error) {
              console.error('[VideoService] Failed to get download URL:', error);
              reject(new Error('Failed to get download URL'));
            }
          }
        );
      });

      onProgress?.(60, 'Creating thumbnail...');

      // Generate and upload thumbnail
      let thumbnailUrl = '';
      try {
        
        const thumbnailUri = await generateVideoThumbnail(videoData.uri);

        const thumbnailResponse = await fetch(thumbnailUri);
        if (!thumbnailResponse.ok) {
          throw new Error(`Failed to fetch thumbnail: ${thumbnailResponse.status}`);
        }
        const thumbnailBlob = await thumbnailResponse.blob();

        const thumbnailRef = ref(
          storage,
          `users/${userId}/thumbnails/${videoId}.jpg`
        );
        
        await uploadBytesResumable(thumbnailRef, thumbnailBlob);
        thumbnailUrl = await getDownloadURL(thumbnailRef);
        
      } catch (error) {
        console.warn('[VideoService] Failed to generate/upload thumbnail:', error);
        // Use empty string if thumbnail generation fails (PWA uses fallback)
        thumbnailUrl = '';
      }

      onProgress?.(80, 'Saving video details...');

      // Get file size from blob
      const fileSize = videoBlob.size;

      // Create Firestore document (same schema as PWA)
      const video: Omit<Video, 'id'> = {
        userId,
        title: videoData.title || `Video ${new Date().toLocaleDateString()}`,
        description: videoData.description || '',
        videoUrl,
        thumbnailUrl,
        isPublic: videoData.isPublic,
        likes: [],
        comments: [],
        viewCount: 0,
        duration: 0, // Could be extracted if needed
        fileSize,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const videoDoc = await addDoc(collection(db, 'videos'), video);

      onProgress?.(100, 'Upload complete!');

      return {
        id: videoDoc.id,
        ...video,
      };
    } catch (error) {
      console.error('[VideoService] Video upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Video upload failed';
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete video from Storage and Firestore
   */
  async deleteVideo(videoId: string, video: Video): Promise<void> {
    try {
      // Delete video file from Storage
      const videoRef = ref(storage, video.videoUrl);
      await deleteObject(videoRef);

      // Delete thumbnail from Storage
      if (video.thumbnailUrl) {
        const thumbnailRef = ref(storage, video.thumbnailUrl);
        await deleteObject(thumbnailRef);
      }

      // Delete Firestore document
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Video deletion failed';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get user's videos from Firestore
   */
  async getUserVideos(userId: string): Promise<Video[]> {
    try {

      const videosQuery = query(
        collection(db, 'videos'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const videosSnapshot = await getDocs(videosQuery);

      const videos: Video[] = [];

      videosSnapshot.forEach((doc) => {
        const data = doc.data();

        videos.push({
          id: doc.id,
          ...data,
        } as Video);
      });

      return videos;
    } catch (error) {
      console.error('[VideoService] Error loading videos:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load videos';
      throw new Error(errorMessage);
    }
  }
}

export const videoService = new VideoService();
