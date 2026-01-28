/**
 * Video Sharing Utilities for React Native
 * Provides cross-platform sharing functionality for videos
 */

import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Alert, Platform } from 'react-native';
import { Video } from '../types/Video';

const BASE_URL = 'https://travalpass.com'; // Production URL

/**
 * Generate shareable URL for a video
 */
export const generateVideoShareUrl = (videoId: string): string => {
  return `${BASE_URL}/video/${videoId}`;
};

/**
 * Generate video share message
 */
export const generateShareMessage = (video: Video): string => {
  const url = generateVideoShareUrl(video.id);
  const title = video.title || 'Check out this video';
  return `${title}\n\n${url}\n\nWatch on TravalPass`;
};

/**
 * Share video using native share sheet (preferred method)
 */
export const shareVideo = async (video: Video): Promise<boolean> => {
  try {
    const message = generateShareMessage(video);
    
    // Web-specific sharing using Web Share API
    if (Platform.OS === 'web') {
      // Check if Web Share API is available
      if (navigator.share) {
        try {
          await navigator.share({
            title: video.title || 'Check out this video on TravalPass',
            text: 'Watch this amazing travel video!',
            url: generateVideoShareUrl(video.id),
          });
          return true;
        } catch (error: any) {
          // User cancelled or share failed
          if (error.name !== 'AbortError') {
            console.error('[videoSharing] Web share error:', error);
          }
        }
      }
      
      // Fallback for web: copy to clipboard and show alert
      await copyVideoLink(video);
      alert('Link copied to clipboard! You can now paste it anywhere to share.');
      return true;
    }
    
    // Mobile native sharing
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      // Try native share with URL
      // Note: expo-sharing doesn't support text sharing on all platforms
      // So we'll use clipboard as fallback
      await copyVideoLink(video);
      Alert.alert(
        'Link Copied!',
        'Video link copied to clipboard. You can now paste it anywhere to share.',
        [{ text: 'OK' }]
      );
      return true;
    } else {
      // Fallback to clipboard
      await copyVideoLink(video);
      Alert.alert(
        'Link Copied!',
        'Video link copied to clipboard. Paste it in your favorite app to share.',
        [{ text: 'OK' }]
      );
      return true;
    }
  } catch (error) {
    console.error('Error sharing video:', error);
    Alert.alert(
      'Share Failed',
      'Unable to share video. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
};

/**
 * Copy video link to clipboard
 */
export const copyVideoLink = async (video: Video): Promise<boolean> => {
  try {
    const url = generateVideoShareUrl(video.id);
    await Clipboard.setStringAsync(url);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
};

/**
 * Share video via specific platform (if needed)
 * This is a helper for future platform-specific sharing
 */
export const shareVideoToPlatform = async (
  video: Video,
  platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy'
): Promise<boolean> => {
  const url = generateVideoShareUrl(video.id);
  const title = video.title || 'Check out this video';

  try {
    switch (platform) {
      case 'copy':
        await copyVideoLink(video);
        Alert.alert('Link Copied!', 'Video link copied to clipboard.');
        return true;

      case 'facebook':
        // Facebook share URL
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        // Would need Linking.openURL(fbUrl) here
        return true;

      case 'twitter':
        // Twitter share URL
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
        // Would need Linking.openURL(twitterUrl) here
        return true;

      case 'whatsapp':
        // WhatsApp share URL
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(`${title} ${url}`)}`;
        // Would need Linking.openURL(whatsappUrl) here
        return true;

      default:
        return false;
    }
  } catch (error) {
    console.error(`Error sharing to ${platform}:`, error);
    return false;
  }
};

/**
 * Show share options dialog
 */
export const showShareDialog = (
  video: Video,
  onShare?: () => void
): void => {
  Alert.alert(
    'Share Video',
    'Choose how to share this video',
    [
      {
        text: 'Copy Link',
        onPress: async () => {
          const success = await copyVideoLink(video);
          if (success) {
            Alert.alert('Success', 'Link copied to clipboard!');
            onShare?.();
          }
        },
      },
      {
        text: 'Share',
        onPress: async () => {
          const success = await shareVideo(video);
          if (success) {
            onShare?.();
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );
};

/**
 * Update page meta tags for social sharing (not applicable in RN)
 * This is a no-op for React Native but kept for API consistency with PWA
 */
export const updatePageMetaTags = (video: Video): void => {
  // No-op in React Native - meta tags are handled server-side
  
};
