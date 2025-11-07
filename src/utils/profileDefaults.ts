/**
 * Apply lightweight, non-intrusive defaults to a TravelPreferenceProfile.
 * These defaults are for first-time users so the AI generation flow has
 * reasonable values without forcing the user to configure everything.
 *
 * Defaults are intentionally conservative (they won't enable flights by
 * default) and match UX expectations: mid-range travel, generic accommodation,
 * public transportation, small group, no accessibility flags.
 */
import { TravelPreferenceProfile } from '../types/TravelPreferences';

export function applyProfileDefaults(profile?: TravelPreferenceProfile | null): TravelPreferenceProfile | null {
  if (!profile) return null;

  const defaults: Partial<TravelPreferenceProfile> = {
    travelStyle: 'mid-range',
    budgetRange: { min: 50, max: 300, currency: 'USD' },
    activities: profile.activities && profile.activities.length > 0 ? profile.activities : [],
    foodPreferences: profile.foodPreferences || { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
    accommodation: profile.accommodation || { type: 'any', starRating: 3 },
    transportation: profile.transportation || { primaryMode: 'public', maxWalkingDistance: undefined, includeFlights: false },
    groupSize: profile.groupSize || { preferred: 1, sizes: [1] },
    accessibility: profile.accessibility || { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false }
  };

  // Merge shallowly - keep any explicit values the user provided
  const merged: TravelPreferenceProfile = {
    ...profile,
    travelStyle: (profile.travelStyle as any) || (defaults.travelStyle as any),
    budgetRange: profile.budgetRange || (defaults.budgetRange as any),
    activities: profile.activities || (defaults.activities as any),
    foodPreferences: profile.foodPreferences || (defaults.foodPreferences as any),
    accommodation: profile.accommodation || (defaults.accommodation as any),
    transportation: profile.transportation || (defaults.transportation as any),
    groupSize: profile.groupSize || (defaults.groupSize as any),
    accessibility: profile.accessibility || (defaults.accessibility as any),
    // Preserve timestamps or set to now if missing
    createdAt: profile.createdAt || new Date(),
    updatedAt: profile.updatedAt || new Date()
  };

  return merged;
}

export default applyProfileDefaults;
