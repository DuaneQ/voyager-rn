/**
 * Ad hooks barrel export.
 *
 * Single import point for all ad-related hooks:
 *   import { useAdDelivery, useAdTracking, useAdFrequency } from '../hooks/ads'
 */

export { useAdDelivery, clearAdsCache } from './useAdDelivery'
export type { UseAdDeliveryOptions, UseAdDeliveryReturn } from './useAdDelivery'

export { useAdTracking } from './useAdTracking'
export type { UseAdTrackingReturn } from './useAdTracking'

export { useAdFrequency } from './useAdFrequency'
export type { UseAdFrequencyReturn } from './useAdFrequency'
