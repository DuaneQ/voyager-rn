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
import * as FileSystem from 'expo-file-system';

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

      console.log('[VideoService] Starting upload:', { videoId, uri: videoData.uri });

      // Fetch video file as blob directly from URI (works on iOS, Android, Web)
      const videoResponse = await fetch(videoData.uri);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();
      console.log('[VideoService] Video blob created:', { size: videoBlob.size, type: videoBlob.type });

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

      console.log('[VideoService] Starting Firebase upload to:', videoRef.fullPath);
      const uploadTask: UploadTask = uploadBytesResumable(videoRef, videoBlob, metadata);

      // Track upload progress
      const videoUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = 20 + (snapshot.bytesTransferred / snapshot.totalBytes) * 40;
            onProgress?.(Math.round(progress), 'Uploading video...');
            console.log('[VideoService] Upload progress:', {
              transferred: snapshot.bytesTransferred,
              total: snapshot.totalBytes,
              percent: Math.round(progress),
            });
          },
          (error) => {
            console.error('[VideoService] Upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('[VideoService] Video uploaded successfully:', url);
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
        console.log('[VideoService] Generating thumbnail from:', videoData.uri);
        const thumbnailUri = await generateVideoThumbnail(videoData.uri);
        console.log('[VideoService] Thumbnail generated:', thumbnailUri);
        
        const thumbnailResponse = await fetch(thumbnailUri);
        if (!thumbnailResponse.ok) {
          throw new Error(`Failed to fetch thumbnail: ${thumbnailResponse.status}`);
        }
        const thumbnailBlob = await thumbnailResponse.blob();
        console.log('[VideoService] Thumbnail blob created:', { size: thumbnailBlob.size, type: thumbnailBlob.type });

        const thumbnailRef = ref(
          storage,
          `users/${userId}/thumbnails/${videoId}.jpg`
        );
        console.log('[VideoService] Uploading thumbnail to:', thumbnailRef.fullPath);
        await uploadBytesResumable(thumbnailRef, thumbnailBlob);
        thumbnailUrl = await getDownloadURL(thumbnailRef);
        console.log('[VideoService] Thumbnail uploaded successfully:', thumbnailUrl);
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

      console.log('[VideoService] Creating Firestore document:', {
        videoUrl: video.videoUrl.substring(0, 50) + '...',
        thumbnailUrl: video.thumbnailUrl ? video.thumbnailUrl.substring(0, 50) + '...' : '(empty)',
        fileSize: video.fileSize,
      });

      const videoDoc = await addDoc(collection(db, 'videos'), video);
      console.log('[VideoService] Video document created:', videoDoc.id);

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
      console.log('[VideoService] Loading videos for user:', userId);
      
      const videosQuery = query(
        collection(db, 'videos'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const videosSnapshot = await getDocs(videosQuery);
      console.log('[VideoService] Found', videosSnapshot.size, 'videos in Firestore');
      
      const videos: Video[] = [];

      videosSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('[VideoService] Video document:', {
          id: doc.id,
          hasThumbnailUrl: !!data.thumbnailUrl,
          hasVideoUrl: !!data.videoUrl,
          thumbnailUrl: data.thumbnailUrl ? data.thumbnailUrl.substring(0, 50) + '...' : '(empty)',
        });
        
        videos.push({
          id: doc.id,
          ...data,
        } as Video);
      });

      console.log('[VideoService] Returning', videos.length, 'videos');
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
