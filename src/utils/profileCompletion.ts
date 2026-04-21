/**
 * Profile completion utilities.
 * Single source of truth for profile completeness calculation.
 * Used by ProfilePage and ProfileHeader.
 */

import { UserProfile } from '../types/UserProfile';

/** Weighted fields for profile completion — matches PWA scoring. */
const PROFILE_FIELDS: { key: keyof UserProfile; label: string; weight: number }[] = [
  { key: 'dob',              label: 'date of birth',      weight: 15 },
  { key: 'gender',           label: 'gender',             weight: 15 },
  { key: 'username',         label: 'username',           weight: 15 },
  { key: 'sexualOrientation', label: 'orientation',       weight: 15 },
  { key: 'status',           label: 'relationship status', weight: 15 },
  { key: 'bio',              label: 'bio',                weight: 10 },
  // photo handled separately (two possible fields) — weight 15
];

const TOTAL_WEIGHT = PROFILE_FIELDS.reduce((sum, f) => sum + f.weight, 0) + 15; // 100

export interface ProfileCompletionResult {
  /** 0–1 fraction */
  completion: number;
  /** 0–100 integer percentage */
  percentage: number;
  /** Human-readable labels of missing fields */
  missingFields: string[];
}

export function getProfileCompletion(profile: UserProfile | null): ProfileCompletionResult {
  const allMissing = [
    ...PROFILE_FIELDS.map(f => f.label),
    'profile photo',
  ];
  if (!profile) return { completion: 0, percentage: 0, missingFields: allMissing };

  const missing: string[] = [];
  let score = 0;

  for (const { key, label, weight } of PROFILE_FIELDS) {
    const val = profile[key];
    const filled = val !== undefined && val !== null && String(val).trim() !== '';
    if (filled) {
      score += weight;
    } else {
      missing.push(label);
    }
  }

  // Photo check — two possible fields
  const hasPhoto = !!(profile.photoURL?.trim() || (profile.photos as any)?.profile?.trim());
  if (hasPhoto) {
    score += 15;
  } else {
    missing.push('profile photo');
  }

  const percentage = Math.round(score / TOTAL_WEIGHT * 100);
  return {
    completion: score / TOTAL_WEIGHT,
    percentage,
    missingFields: missing,
  };
}
