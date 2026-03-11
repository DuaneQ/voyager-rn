/**
 * SponsoredItineraryCard — Renders a sponsored ad within the itinerary/search feed.
 *
 * Designed to match the visual weight and card layout of ItineraryCard but
 * clearly marked as sponsored content.
 *
 * Shows: business name, primary text, image creative, CTA button,
 * optional promo code, and a transparent "Sponsored" label.
 *
 * Accessibility:
 * - Semantic roles on interactive elements
 * - Descriptive labels
 * - Visible "Sponsored" badge
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
} from 'react-native'
import type { AdUnit } from '../../types/AdDelivery'

export interface SponsoredItineraryCardProps {
  ad: AdUnit
  /** Whether the card is currently visible onscreen. */
  isVisible?: boolean
  /** Called when the card becomes visible — hook fires trackImpression. */
  onImpression?: (campaignId: string) => void
  /** Called when user taps the CTA — hook fires trackClick. */
  onCtaPress?: (campaignId: string) => void
  /** Called when user swipes/dismisses this ad. */
  onDismiss?: (campaignId: string) => void
}

function SponsoredItineraryCardComponent({
  ad,
  isVisible = true,
  onImpression,
  onCtaPress,
  onDismiss,
}: SponsoredItineraryCardProps) {
  const impressionFiredRef = useRef(false)

  // Fire impression when card becomes visible
  useEffect(() => {
    if (isVisible && !impressionFiredRef.current) {
      impressionFiredRef.current = true
      onImpression?.(ad.campaignId)
    }
  }, [isVisible, ad.campaignId, onImpression])

  const handleCtaPress = useCallback(() => {
    onCtaPress?.(ad.campaignId)
    if (ad.landingUrl) {
      Linking.openURL(ad.landingUrl).catch((err) =>
        console.error('[SponsoredItineraryCard] Failed to open URL:', err),
      )
    }
  }, [ad.campaignId, ad.landingUrl, onCtaPress])

  const handleDismiss = useCallback(() => {
    onDismiss?.(ad.campaignId)
  }, [ad.campaignId, onDismiss])

  const imageUri = ad.assetUrl || ad.muxThumbnailUrl

  return (
    <View
      style={styles.card}
      accessibilityRole="none"
      accessibilityLabel={`Sponsored content from ${ad.businessName}`}
    >
      {/* Creative image */}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`Ad image for ${ad.businessName}`}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>Ad</Text>
        </View>
      )}

      {/* Sponsored badge — overlaid on image */}
      <View style={styles.sponsoredBadge}>
        <Text style={styles.sponsoredText}>Sponsored</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.businessName} numberOfLines={1}>
          {ad.businessName}
        </Text>

        {ad.primaryText ? (
          <Text style={styles.primaryText} numberOfLines={3}>
            {ad.primaryText}
          </Text>
        ) : null}

        {/* Promo code */}
        {ad.promoCode ? (
          <View style={styles.promoRow}>
            <Text style={styles.promoLabel}>Promo: </Text>
            <Text style={styles.promoCode}>{ad.promoCode}</Text>
          </View>
        ) : null}

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleCtaPress}
            accessibilityRole="link"
            accessibilityLabel={`${ad.cta || 'Learn More'} — opens ${ad.businessName} website`}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>{ad.cta || 'Learn More'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss this ad"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export const SponsoredItineraryCard = React.memo(SponsoredItineraryCardComponent)

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    alignSelf: 'stretch',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
      },
    }),
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
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
  content: {
    padding: 16,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  primaryText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  promoLabel: {
    fontSize: 12,
    color: '#666',
  },
  promoCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1976d2',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaButton: {
    flex: 1,
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 12,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dismissButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '600',
  },
})
