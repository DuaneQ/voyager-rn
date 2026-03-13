/**
 * Ad delivery types for the consumer-side (voyager-RN).
 *
 * These mirror the server-side types in `functions/src/types/adDelivery.ts`.
 * Keep both in sync when modifying the contract.
 */

// ─── Placement & Creative ─────────────────────────────────────────────────────

export type Placement = 'video_feed' | 'itinerary_feed' | 'ai_slot'
export type CreativeType = 'image' | 'video'
export type BillingModel = 'cpm' | 'cpc'
export type BusinessType =
  | 'restaurant'
  | 'hotel'
  | 'tour'
  | 'experience'
  | 'transport'
  | 'shop'
  | 'activity'
  | 'other'

// ─── AdUnit — the unit returned by selectAds ──────────────────────────────────

export interface AdUnit {
  campaignId: string
  placement: Placement
  creativeType: CreativeType
  assetUrl: string
  /** HLS manifest URL for video_feed campaigns (Mux); absent for images. */
  muxPlaybackUrl?: string
  /** Mux thumbnail for poster frame. */
  muxThumbnailUrl?: string
  primaryText: string
  cta: string
  landingUrl: string
  billingModel: BillingModel
  /** Campaign name used as the business name in UI. */
  businessName: string
  businessType?: BusinessType | ''
  address?: string
  phone?: string
  email?: string
  promoCode?: string
  /** Offer details for AI-slot promotions. */
  offerDetails?: string
  /** Image URL shorthand (alias for assetUrl when creativeType is 'image'). */
  imageUrl?: string
}

// ─── UserAdContext (targeting) ─────────────────────────────────────────────────

export interface UserAdContext {
  destination?: string
  placeId?: string
  travelStartDate?: string // YYYY-MM-DD
  travelEndDate?: string   // YYYY-MM-DD
  gender?: string
  /** User's age (integer, computed from date of birth). */
  age?: number
  tripTypes?: string[]
  activityPreferences?: string[]
  travelStyles?: string[]
}

// ─── Request / Response shapes ────────────────────────────────────────────────

export interface SelectAdsRequest {
  placement: Placement
  limit?: number
  userContext?: UserAdContext
}

export interface SelectAdsResponse {
  ads: AdUnit[]
}

export type AdEventType = 'impression' | 'click' | 'video_quartile'
export type VideoQuartile = 25 | 50 | 75 | 100

export interface AdEvent {
  type: AdEventType
  campaignId: string
  timestamp: number // epoch ms
  quartile?: VideoQuartile
}

export interface LogAdEventsRequest {
  events: AdEvent[]
}

export interface LogAdEventsResponse {
  processed: number
  skipped: number
}
