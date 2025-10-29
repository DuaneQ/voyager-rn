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

      // Read video file
      const videoFile = await FileSystem.readAsStringAsync(videoData.uri, {
        encoding: 'base64',
      });

      // Convert base64 to blob
      const response = await fetch(`data:video/mp4;base64,${videoFile}`);
      const blob = await response.blob();

      onProgress?.(20, 'Uploading video...');

      // Upload video to Storage (same path as PWA)
      const videoRef = ref(storage, `users/${userId}/videos/${videoId}.mp4`);
      const uploadTask: UploadTask = uploadBytesResumable(videoRef, blob, {
        contentType: 'video/mp4',
      });

      // Track upload progress
      const videoUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = 20 + (snapshot.bytesTransferred / snapshot.totalBytes) * 40;
            onProgress?.(Math.round(progress), 'Uploading video...');
          },
          reject,
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      onProgress?.(60, 'Creating thumbnail...');

      // Generate and upload thumbnail
      let thumbnailUrl = '';
      try {
        const thumbnailUri = await generateVideoThumbnail(videoData.uri);
        const thumbnailFile = await FileSystem.readAsStringAsync(thumbnailUri, {
          encoding: 'base64',
        });
        const thumbnailResponse = await fetch(
          `data:image/jpeg;base64,${thumbnailFile}`
        );
        const thumbnailBlob = await thumbnailResponse.blob();

        const thumbnailRef = ref(
          storage,
          `users/${userId}/thumbnails/${videoId}.jpg`
        );
        await uploadBytesResumable(thumbnailRef, thumbnailBlob);
        thumbnailUrl = await getDownloadURL(thumbnailRef);
      } catch (error) {
        console.warn('Failed to generate thumbnail:', error);
        // Use placeholder if thumbnail generation fails
        thumbnailUrl = '';
      }

      onProgress?.(80, 'Saving video details...');

      // Get file size
      const fileInfo = await FileSystem.getInfoAsync(videoData.uri);
      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;

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
        videos.push({
          id: doc.id,
          ...doc.data(),
        } as Video);
      });

      return videos;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load videos';
      throw new Error(errorMessage);
    }
  }
}

export const videoService = new VideoService();
