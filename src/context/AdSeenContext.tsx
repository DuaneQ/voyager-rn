/**
 * AdSeenContext — App-level session registry of seen ad campaign IDs.
 *
 * Design:
 *   - Backed by a useRef<Set<string>> — writes never cause re-renders.
 *   - The context value is a stable object of two callbacks; neither changes
 *     identity after mount, so consumers are never re-rendered by this context.
 *   - Session-scoped: cleared when the app is killed (memory only).
 *
 * Consumers:
 *   - useAdTracking: calls addSeenId(campaignId) on every impression.
 *   - useAdDelivery: calls getSeenIds() on every fetch and passes the result
 *     to selectAds as seenCampaignIds so the server can apply the -5 penalty.
 */

import React, { createContext, useCallback, useContext, useRef } from 'react'

interface AdSeenContextValue {
  /** Register a campaign as seen. No-op if already registered. */
  addSeenId: (campaignId: string) => void
  /** Return a snapshot array of all seen campaign IDs this session. */
  getSeenIds: () => string[]
}

const AdSeenContext = createContext<AdSeenContextValue | null>(null)

export function AdSeenProvider({ children }: { children: React.ReactNode }) {
  const seenRef = useRef<Set<string>>(new Set())

  // Stable callbacks — never change identity → context consumers never re-render
  const addSeenId = useCallback((campaignId: string) => {
    if (campaignId) seenRef.current.add(campaignId)
  }, [])

  const getSeenIds = useCallback((): string[] => {
    return [...seenRef.current]
  }, [])

  return (
    <AdSeenContext.Provider value={{ addSeenId, getSeenIds }}>
      {children}
    </AdSeenContext.Provider>
  )
}

/**
 * Returns the AdSeenContext value.
 * Throws if used outside <AdSeenProvider> to catch mis-wiring early.
 */
export function useAdSeen(): AdSeenContextValue {
  const ctx = useContext(AdSeenContext)
  if (!ctx) {
    throw new Error('useAdSeen must be used within <AdSeenProvider>')
  }
  return ctx
}
