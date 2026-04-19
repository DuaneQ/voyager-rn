/**
 * Profile completion utilities.
 * Calculates what percentage of the user profile is filled
 * and which fields are still missing.
 */

import { UserProfile } from '../types/UserProfile';

/** Fields checked for profile completion — ordered by importance for matching. */
const PROFILE_FIELDS: { key: keyof UserProfile; label: string }[] = [
  { key: 'dob', label: 'date of birth' },
  { key: 'gender', label: 'gender' },
  { key: 'bio', label: 'bio' },
  { key: 'username', label: 'username' },
  { key: 'sexualOrientation', label: 'orientation' },
  { key: 'status', label: 'relationship status' },
];

interface ProfileCompletionResult {
  /** 0–1 fraction */
  completion: number;
  /** Human-readable labels of missing fields */
  missingFields: string[];
}

export function getProfileCompletion(profile: UserProfile | null): ProfileCompletionResult {
  if (!profile) return { completion: 0, missingFields: PROFILE_FIELDS.map(f => f.label) };

  const missing: string[] = [];
  for (const { key, label } of PROFILE_FIELDS) {
    const val = profile[key];
    if (val === undefined || val === null || val === '') {
      missing.push(label);
    }
  }

  const filled = PROFILE_FIELDS.length - missing.length;
  return {
    completion: PROFILE_FIELDS.length > 0 ? filled / PROFILE_FIELDS.length : 1,
    missingFields: missing,
  };
}
