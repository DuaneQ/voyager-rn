/**
 * adUnitAdapter
 *
 * Converts ad domain types to other domain types required by shared UI
 * components. Keeps the conversion logic in one place so neither the calling
 * page nor the card component needs to know the shape of both types.
 */

import { Timestamp } from 'firebase/firestore';
import type { AdUnit } from '../types/AdDelivery';
import type { Video } from '../types/Video';

/**
 * Produces a minimal `Video` stub from an `AdUnit` so that shared UI
 * components (e.g. VideoCommentsModal) can operate on ad comments using the
 * same interface as organic video comments.
 *
 * Comments for ads are stored in `videos/{campaignId}/comments` in Firestore,
 * matching the path the modal already uses for organic videos.
 */
export function adUnitToCommentableVideo(ad: AdUnit): Video {
  return {
    id: ad.campaignId,
    userId: '',
    videoUrl: '',
    thumbnailUrl: ad.muxThumbnailUrl ?? ad.assetUrl ?? '',
    isPublic: true,
    likes: [],
    comments: [],
    viewCount: 0,
    duration: 0,
    fileSize: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Video;
}
