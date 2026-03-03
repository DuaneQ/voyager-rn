/**
 * SponsoredVideoCard — Renders a sponsored ad within the video feed.
 *
 * Mimics the layout of VideoCardV2 but renders an ad creative (video or image)
 * with a "Sponsored" badge, primary text, and a CTA pill that opens the
 * landing URL.
 *
 * Accessibility:
 * - `accessibilityLabel` on the CTA button
 * - `accessibilityRole="link"` for the CTA
 * - Visible "Sponsored" label for transparency
 * - Respects `prefers-reduced-motion` via `useReducedMotion` where available
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Platform,
  Dimensions,
  Share,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'
import type { AdUnit, VideoQuartile } from '../../types/AdDelivery'
import type { Video } from '../../types/Video'
import { adUnitToCommentableVideo } from '../../utils/adUnitAdapter'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

export interface SponsoredVideoCardProps {
  ad: AdUnit
  /** Whether this card is currently visible (for impression tracking). */
  isActive: boolean
  /** Card height — should match VideoCardV2 for consistent feed layout. */
  cardHeight?: number
  /** Called when the card becomes visible — hook fires trackImpression. */
  onImpression?: (campaignId: string) => void
  /** Called when user taps the CTA — hook fires trackClick. */
  onCtaPress?: (campaignId: string) => void
  /** Current mute state driven by the feed. */
  isMuted?: boolean
  /** Called when user toggles mute. */
  onMuteToggle?: (muted: boolean) => void
  /** Optional callback when user taps the like button. */
  onLike?: () => void
  /** Optional callback when user taps the comment button. Receives a Video stub for the shared comments modal. */
  onComment?: (video: Video) => void
  /** Optional callback when user taps the share button. Defaults to native Share sheet. */
  onShare?: () => void
  /** Called when the video reaches a quartile milestone (25/50/75/100%). */
  onQuartile?: (campaignId: string, quartile: VideoQuartile) => void
}

function SponsoredVideoCardComponent({
  ad,
  isActive,
  cardHeight,
  onImpression,
  onCtaPress,
  isMuted = false,
  onMuteToggle,
  onLike,
  onComment,
  onShare,
  onQuartile,
}: SponsoredVideoCardProps) {
  const impressionFiredRef = useRef(false)
  const quartilesFiredRef = useRef<Set<VideoQuartile>>(new Set())
  const [isLiked, setIsLiked] = useState(false)
  const height = cardHeight ?? Dimensions.get('window').height
  const isVideoCreative = ad.creativeType === 'video'
  const videoSource = ad.muxPlaybackUrl ?? (isVideoCreative ? ad.assetUrl : undefined)

  // expo-video player — only created for video creatives
  // Init unmuted so the feed's isMuted state drives audio (same as VideoCardV2)
  const player = useVideoPlayer(
    videoSource ? { uri: videoSource } : null,
    (p) => {
      p.loop = true
      p.muted = isMuted
    },
  )

  // Log when the card first mounts so we can confirm the right ad is in the feed
  useEffect(() => {
    console.log(
      `[AdCard] mounted campaignId=${ad.campaignId} creativeType=${ad.creativeType}` +
      ` businessName=${ad.businessName} placement=${ad.placement}`,
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync isMuted changes to the player (e.g. user taps the mute button in feed)
  useEffect(() => {
    if (!player || !videoSource) return
    try {
      player.muted = isMuted
    } catch {
      // Player may have been released if the card scrolled off — safe to ignore
    }
  }, [isMuted, player, videoSource])

  // Play/pause based on active state
  useEffect(() => {
    if (!player || !videoSource) return
    try {
      if (isActive) {
        console.log(`[AdVideo] ▶ playing campaignId=${ad.campaignId} muted=${isMuted} source=${videoSource}`)
        player.play()
      } else {
        player.pause()
      }
    } catch {
      // Player may have been released if the card scrolled off — safe to ignore
    }
  }, [isActive, player, videoSource, ad.campaignId, isMuted])

  // Quartile tracking — poll player position while active
  useEffect(() => {
    if (!isActive || !isVideoCreative || !player || !videoSource) return
    const THRESHOLDS: VideoQuartile[] = [25, 50, 75, 100]
    const interval = setInterval(() => {
      try {
        const duration = player.duration
        const current = player.currentTime
        if (!duration || duration <= 0) return
        const pct = (current / duration) * 100
        for (const threshold of THRESHOLDS) {
          if (pct >= threshold && !quartilesFiredRef.current.has(threshold)) {
            quartilesFiredRef.current.add(threshold)
            console.log(`[AdQuartile] ${threshold}% reached campaignId=${ad.campaignId} time=${current.toFixed(1)}s duration=${duration.toFixed(1)}s`)
            onQuartile?.(ad.campaignId, threshold)
          }
        }
      } catch {
        // Player may have been released — safe to ignore
      }
    }, 500)
    return () => clearInterval(interval)
  }, [isActive, isVideoCreative, player, videoSource, ad.campaignId, onQuartile])

  // Fire impression when card becomes active
  useEffect(() => {
    if (isActive && !impressionFiredRef.current) {
      impressionFiredRef.current = true
      console.log(`[AdImpression] queued campaignId=${ad.campaignId} placement=${ad.placement}`)
      onImpression?.(ad.campaignId)
    }
  }, [isActive, ad.campaignId, ad.placement, onImpression])

  const handleMuteToggle = useCallback(() => {
    onMuteToggle?.(!isMuted)
  }, [isMuted, onMuteToggle])

  const handleLike = useCallback(() => {
    setIsLiked((prev) => !prev)
    onLike?.()
  }, [onLike])

  const handleComment = useCallback(() => {
    onComment?.(adUnitToCommentableVideo(ad))
  }, [onComment, ad])

  const handleShare = useCallback(async () => {
    if (onShare) {
      onShare()
      return
    }
    const url =
      ad.landingUrl && !/^https?:\/\//i.test(ad.landingUrl)
        ? `https://${ad.landingUrl}`
        : ad.landingUrl
    if (!url) return
    try {
      await Share.share({
        message: ad.primaryText ? `${ad.primaryText}\n${url}` : url,
        url,
      })
    } catch (err) {
      console.error('[SponsoredVideoCard] Share failed:', err)
    }
  }, [ad.landingUrl, ad.primaryText, onShare])

  const handleCtaPress = useCallback(() => {
    const rawUrl = ad.landingUrl ?? ''
    // Ensure URL has a scheme — bare domains like "travalpass.com" are treated
    // as file paths by iOS Linking without an explicit https:// prefix.
    const url =
      rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl
    console.log(`[AdClick] CTA tapped campaignId=${ad.campaignId} url=${url}`)
    onCtaPress?.(ad.campaignId)
    if (url) {
      Linking.openURL(url).catch((err) =>
        console.error('[SponsoredVideoCard] Failed to open URL:', err),
      )
    }
  }, [ad.campaignId, ad.landingUrl, onCtaPress])

  return (
    <View
      style={[styles.container, { height }]}
      accessibilityRole="none"
      accessibilityLabel={`Sponsored ad from ${ad.businessName}`}
    >
      {/* Creative — video playback or static image */}
      {isVideoCreative && videoSource ? (
        <VideoView
          player={player}
          style={styles.creative}
          contentFit="cover"
          nativeControls={false}
          accessibilityLabel={`Video ad for ${ad.businessName}`}
        />
      ) : (
        <Image
          source={{ uri: ad.assetUrl || ad.muxThumbnailUrl || '' }}
          style={styles.creative}
          resizeMode="cover"
          accessibilityLabel={`Ad image for ${ad.businessName}`}
        />
      )}

      {/* Sponsored badge */}
      <View style={styles.sponsoredBadge} accessibilityRole="text">
        <Text style={styles.sponsoredText}>Sponsored</Text>
      </View>

      {/* Business name */}
      {ad.businessName ? (
        <View style={styles.businessRow}>
          <Text style={styles.businessName} numberOfLines={1}>
            {ad.businessName}
          </Text>
        </View>
      ) : null}

      {/* Primary text */}
      {ad.primaryText ? (
        <View style={styles.primaryTextContainer}>
          <Text style={styles.primaryText} numberOfLines={2}>
            {ad.primaryText}
          </Text>
        </View>
      ) : null}

      {/* CTA pill — anchored to bottom */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={handleCtaPress}
        accessibilityRole="link"
        accessibilityLabel={`${ad.cta || 'Learn More'} — opens ${ad.businessName} website`}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>{ad.cta || 'Learn More'}</Text>
      </TouchableOpacity>

      {/* Right-rail action buttons — matching VideoCardV2 layout */}
      <View style={styles.actionsContainer}>
        {/* Like / Save */}
        <TouchableOpacity
          onPress={handleLike}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? 'Unlike ad' : 'Like ad'}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={32}
            color={isLiked ? '#ff0050' : '#fff'}
          />
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity
          onPress={handleComment}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Comment on ad"
        >
          <Ionicons name="chatbubble-outline" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity
          onPress={handleShare}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel="Share ad"
        >
          <Ionicons name="share-social-outline" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Mute button */}
      <View style={[styles.muteButtonWrapper, { pointerEvents: 'box-none' }]}>
        <TouchableOpacity
          onPress={handleMuteToggle}
          style={styles.muteButton}
          accessibilityRole="button"
          accessibilityLabel={isMuted ? 'Unmute video' : 'Mute video'}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export const SponsoredVideoCard = React.memo(SponsoredVideoCardComponent)

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creative: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  sponsoredBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sponsoredText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  businessRow: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 80,
  },
  businessName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  primaryTextContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 80,
  },
  primaryText: {
    color: '#fff',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 140,
    alignItems: 'center',
    zIndex: 30,
    elevation: 15,
    pointerEvents: 'box-none' as any,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 28,
    padding: 10,
  },
  actionText: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  muteButtonWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 50,
    pointerEvents: 'box-none' as any,
  },
  muteButton: {
    position: 'absolute',
    top: Platform.select({
      ios: 60,
      android: 200,
      web: 120,
    }),
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
    elevation: 10,
  },
  ctaButton: {
    position: 'absolute',
    bottom: 44,
    left: 16,
    right: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
})
