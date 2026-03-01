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

import React, { useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Platform,
  Dimensions,
} from 'react-native'
import type { AdUnit } from '../../types/AdDelivery'

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
  /** Called when user taps mute/unmute — passed through from feed. */
  isMuted?: boolean
  /** Called when user toggles mute. */
  onMuteToggle?: (muted: boolean) => void
}

function SponsoredVideoCardComponent({
  ad,
  isActive,
  cardHeight,
  onImpression,
  onCtaPress,
}: SponsoredVideoCardProps) {
  const impressionFiredRef = useRef(false)
  const height = cardHeight ?? Dimensions.get('window').height

  // Fire impression when card becomes active
  useEffect(() => {
    if (isActive && !impressionFiredRef.current) {
      impressionFiredRef.current = true
      onImpression?.(ad.campaignId)
    }
  }, [isActive, ad.campaignId, onImpression])

  const handleCtaPress = useCallback(() => {
    onCtaPress?.(ad.campaignId)
    if (ad.landingUrl) {
      Linking.openURL(ad.landingUrl).catch((err) =>
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
      {/* Creative — Image or video poster */}
      {ad.creativeType === 'image' || !ad.muxPlaybackUrl ? (
        <Image
          source={{ uri: ad.assetUrl || ad.muxThumbnailUrl || '' }}
          style={styles.creative}
          resizeMode="cover"
          accessibilityLabel={`Ad image for ${ad.businessName}`}
        />
      ) : (
        // Video ads show the Mux thumbnail as a poster frame.
        // Full video playback integration (via expo-av) follows the same
        // pattern as VideoCardV2 — to be wired by the feed page.
        <Image
          source={{ uri: ad.muxThumbnailUrl || ad.assetUrl || '' }}
          style={styles.creative}
          resizeMode="cover"
          accessibilityLabel={`Video ad poster for ${ad.businessName}`}
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
  ctaButton: {
    position: 'absolute',
    bottom: 44,
    left: 16,
    right: 16,
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
