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
import { Platform } from 'react-native';
import { storage, db } from '../../config/firebaseConfig';
import { Video, VideoUploadData } from '../../types/Video';
import { generateVideoThumbnail } from '../../utils/videoValidation';

export class VideoService {
  private currentUploadTask: UploadTask | null = null;
  private isCancelled: boolean = false;

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
      this.isCancelled = false;
      // Generate unique video ID
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      onProgress?.(10, 'Preparing video...');

      // Read video file as blob
      // On web, the URI is typically a blob: URL or data: URL from file input
      // On native, it's a file:// or content:// URI
      let videoBlob: Blob;
      
      if (Platform.OS === 'web') {
        // Web: Use fetch for blob: and data: URLs, or any URL really
        try {
          const response = await fetch(videoData.uri);
          videoBlob = await response.blob();
        } catch (fetchError) {
          throw new Error(`Failed to read video file on web: ${fetchError}`);
        }
      } else {
        // Native platforms use XMLHttpRequest
        videoBlob = await new Promise<Blob>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.onload = function() {
            if (xhr.status === 200) {
              resolve(xhr.response);
            } else {
              reject(new Error(`Failed to read video file: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error('Failed to read video file'));
          xhr.responseType = 'blob';
          xhr.open('GET', videoData.uri, true);
          xhr.send(null);
        });
      }

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
      this.currentUploadTask = uploadTask;

      // Track upload progress
      const videoUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = 20 + (snapshot.bytesTransferred / snapshot.totalBytes) * 40;
            onProgress?.(Math.round(progress), 'Uploading video...');
            
          },
          (error) => {
            this.currentUploadTask = null;
            // Check if this is a cancellation error
            const isCancellation = error.code === 'storage/canceled' || 
                                  error.message?.includes('canceled');
            if (!isCancellation) {
              console.error('[VideoService] Upload task error:', error);
            }
            reject(new Error(`Upload failed: ${error.message}`));
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              this.currentUploadTask = null;
              resolve(url);
            } catch (error) {
              reject(new Error('Failed to get download URL'));
            }
          }
        );
      });

      // Check if upload was cancelled while we were uploading
      if (this.isCancelled) {
        throw new Error('Upload canceled by user');
      }

      onProgress?.(60, 'Creating thumbnail...');

      // Generate and upload thumbnail
      let thumbnailUrl = '';
      try {
        
        const thumbnailUri = await generateVideoThumbnail(videoData.uri);
        let thumbnailBlob: Blob;
        
        // Handle data URL (from web) vs file URI (from mobile)
        if (thumbnailUri.startsWith('data:')) {
          // Convert data URL to blob
          const response = await fetch(thumbnailUri);
          thumbnailBlob = await response.blob();
        } else {
          // Read thumbnail as blob using XMLHttpRequest (mobile)
          thumbnailBlob = await new Promise<Blob>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function() {
              if (xhr.status === 200) {
                resolve(xhr.response);
              } else {
                reject(new Error(`Failed to read thumbnail: ${xhr.status}`));
              }
            };
            xhr.onerror = () => reject(new Error('Failed to read thumbnail'));
            xhr.responseType = 'blob';
            xhr.open('GET', thumbnailUri, true);
            xhr.send(null);
          });
        }

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

      // Check if upload was cancelled during thumbnail generation
      if (this.isCancelled) {
        throw new Error('Upload canceled by user');
      }

      onProgress?.(80, 'Saving video details...');

      // Check if upload was cancelled before saving to Firestore
      if (this.isCancelled) {
        throw new Error('Upload canceled by user');
      }

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
      
      // Final check - if cancelled after Firestore write, delete the document
      if (this.isCancelled) {
        await deleteDoc(videoDoc);
        throw new Error('Upload canceled by user');
      }
      
      onProgress?.(100, 'Upload complete!');

      this.isCancelled = false;
      this.currentUploadTask = null;

      return {
        id: videoDoc.id,
        ...video,
      };
    } catch (error) {
      this.isCancelled = false;
      this.currentUploadTask = null;
      
      const errorMessage =
        error instanceof Error ? error.message : 'Video upload failed';
      
      // Don't log cancellation errors - these are intentional user actions
      const isCancellation = errorMessage.includes('storage/canceled') ||
                            errorMessage.includes('canceled') ||
                            errorMessage.includes('Upload canceled');
      
      if (!isCancellation) {
        console.error('[VideoService] Video upload error:', error);
      } else {
        console.log('[VideoService] Upload cancelled by user');
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete video from Storage and Firestore
   * Gracefully handles missing Storage objects (e.g. already deleted from PWA)
   */
  async deleteVideo(videoId: string, video: Video): Promise<void> {
    try {
      // Delete video file from Storage (ignore if already deleted)
      try {
        const videoRef = ref(storage, video.videoUrl);
        await deleteObject(videoRef);
      } catch (storageErr: any) {
        if (storageErr?.code === 'storage/object-not-found') {
          console.warn('[VideoService] Video file already deleted from Storage, continuing cleanup');
        } else {
          throw storageErr;
        }
      }

      // Delete thumbnail from Storage (ignore if already deleted or missing)
      if (video.thumbnailUrl) {
        try {
          const thumbnailRef = ref(storage, video.thumbnailUrl);
          await deleteObject(thumbnailRef);
        } catch (thumbErr: any) {
          if (thumbErr?.code === 'storage/object-not-found') {
            console.warn('[VideoService] Thumbnail already deleted from Storage, continuing cleanup');
          } else {
            throw thumbErr;
          }
        }
      }

      // Delete Firestore document
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (error) {
      console.error('[VideoService] Video deletion error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Video deletion failed';
      throw new Error(`Failed to delete video: ${errorMessage}`);
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

  /**
   * Cancel the current upload if one is in progress
   */
  cancelUpload(): boolean {
    this.isCancelled = true;
    if (this.currentUploadTask) {
      this.currentUploadTask.cancel();
      this.currentUploadTask = null;
      return true;
    }
    return false;
  }
}

export const videoService = new VideoService();
