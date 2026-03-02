/**
 * PromotionCard — Renders a single sponsored or AI-generated promotion within the
 * AI Itinerary "Local Deals & Promotions" accordion section.
 *
 * Tracks impressions on mount (when the accordion is expanded) and clicks on CTA press.
 * Handles both real campaign ads (AdUnit mapped to PromotionData) and AI-generated
 * promotion entries embedded in the itinerary JSON.
 *
 * Accessibility:
 * - Semantic roles on interactive controls (button, link)
 * - Descriptive accessibilityLabel on image and CTA
 * - "Sponsored" label always visible
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import type { BusinessType } from '../../types/AdDelivery';

// ─── Public Interface ─────────────────────────────────────────────────────────

/**
 * Normalized promotion shape consumed by PromotionCard.
 * Covers both real AdUnit campaign ads and AI-generated promotion entries.
 */
export interface PromotionData {
  /** Set when this promotion is a tracked campaign ad; absent for AI-generated promotions. */
  _campaignId?: string;
  /** True for real campaign ads fetched from ad delivery. */
  _isRealAd?: boolean;
  businessName: string;
  businessType?: BusinessType | string;
  headline: string;
  description?: string;
  imageUrl?: string | null;
  cta?: string;
  landingUrl?: string | null;
  website?: string | null;
  rating?: number | null;
  priceRange?: string;
  operatingHours?: string;
  tags?: string[];
  offerDetails?: string | null;
  promoCode?: string | null;
  offerExpiry?: string;
  address?: string;
  phone?: string;
  email?: string;
  googleMapsUrl?: string;
}

export interface PromotionCardProps {
  promo: PromotionData;
  index: number;
  trackImpression: (campaignId: string) => void;
  trackClick: (campaignId: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

function PromotionCardComponent({
  promo,
  index,
  trackImpression,
  trackClick,
}: PromotionCardProps) {
  // Fire impression once when the card mounts (accordion section expanded)
  useEffect(() => {
    if (promo._isRealAd && promo._campaignId) {
      trackImpression(promo._campaignId);
    }
  }, [promo._isRealAd, promo._campaignId, trackImpression]);

  return (
    <View key={promo._campaignId ?? index} style={styles.card}>
      {/* Banner image */}
      {promo.imageUrl ? (
        <Image
          source={{ uri: promo.imageUrl }}
          style={styles.image}
          resizeMode="cover"
          accessibilityLabel={`${promo.businessName} promotional image`}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>
            {promo.businessType === 'restaurant' ? '🍽️'
              : promo.businessType === 'hotel' ? '🏨'
              : promo.businessType === 'tour' ? '🗺️'
              : promo.businessType === 'experience' ? '🎭'
              : promo.businessType === 'transport' ? '🚗'
              : promo.businessType === 'shop' ? '🛍️'
              : '📢'}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Sponsored label */}
        <View style={styles.sponsoredRow}>
          <Text style={styles.sponsoredLabel}>Sponsored</Text>
          {promo.businessType && (
            <View style={styles.typeChip}>
              <Text style={styles.typeChipText}>
                {promo.businessType.charAt(0).toUpperCase() + promo.businessType.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Business name & headline */}
        <Text style={styles.businessName}>{promo.businessName}</Text>
        <Text style={styles.headline}>{promo.headline}</Text>

        {promo.description ? (
          <Text style={styles.description}>{promo.description}</Text>
        ) : null}

        {/* Meta chips: rating, price range, operating hours */}
        <View style={styles.metaRow}>
          {promo.rating != null && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>⭐ {promo.rating}</Text>
            </View>
          )}
          {promo.priceRange && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{promo.priceRange}</Text>
            </View>
          )}
          {promo.operatingHours && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🕐 {promo.operatingHours}</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {promo.tags && promo.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {promo.tags.map((tag: string, tagIndex: number) => (
              <View key={tagIndex} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Offer details */}
        {(promo.offerDetails || promo.promoCode) && (
          <View style={styles.offerBox}>
            {promo.offerDetails && (
              <Text style={styles.offerDetails}>🏷️ {promo.offerDetails}</Text>
            )}
            {promo.promoCode && (
              <View style={styles.promoCodeRow}>
                <Text style={styles.promoCodeLabel}>Code: </Text>
                <Text style={styles.promoCode}>{promo.promoCode}</Text>
              </View>
            )}
            {promo.offerExpiry && (
              <Text style={styles.offerExpiry}>Expires: {promo.offerExpiry}</Text>
            )}
          </View>
        )}

        {/* Address / contact */}
        {promo.address && (
          <Text style={styles.address}>📍 {promo.address}</Text>
        )}
        {promo.phone && (
          <Text style={styles.contact}>📞 {promo.phone}</Text>
        )}
        {promo.email && (
          <Text style={styles.contact}>✉️ {promo.email}</Text>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {(promo.landingUrl || promo.website) && (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                if (promo._isRealAd && promo._campaignId) {
                  trackClick(promo._campaignId);
                }
                const url = promo.landingUrl || promo.website;
                if (url) Linking.openURL(url).catch(() => {});
              }}
              activeOpacity={0.7}
              accessibilityLabel={promo.cta || 'Learn More'}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>{promo.cta || 'Learn More'}</Text>
            </TouchableOpacity>
          )}
          {promo.googleMapsUrl && (
            <TouchableOpacity
              style={styles.mapsButton}
              onPress={() => Linking.openURL(promo.googleMapsUrl!).catch(() => {})}
              activeOpacity={0.7}
              accessibilityLabel="View on Google Maps"
              accessibilityRole="link"
            >
              <Text style={styles.mapsText}>📍 Maps</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export const PromotionCard = React.memo(PromotionCardComponent);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 160,
  },
  imagePlaceholder: {
    width: '100%',
    height: 100,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 40,
  },
  body: {
    padding: 14,
  },
  sponsoredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sponsoredLabel: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  typeChip: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  typeChipText: {
    fontSize: 11,
    color: '#5E35B1',
    fontWeight: '600',
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headline: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  chipText: {
    fontSize: 12,
    color: '#555',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  tagText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  offerBox: {
    backgroundColor: '#FFFDE7',
    borderWidth: 1,
    borderColor: '#FFF176',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  offerDetails: {
    fontSize: 13,
    color: '#F57F17',
    fontWeight: '600',
    marginBottom: 4,
  },
  promoCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoCodeLabel: {
    fontSize: 13,
    color: '#555',
  },
  promoCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1565C0',
    letterSpacing: 1,
  },
  offerExpiry: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  contact: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  ctaButton: {
    flex: 1,
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  mapsButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapsText: {
    fontSize: 13,
    color: '#1976d2',
    fontWeight: '600',
  },
});
