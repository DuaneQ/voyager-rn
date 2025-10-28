/**
 * useTravelPreferences Hook
 * Manages travel preference profiles with Firestore synchronization
 * 
 * Ported from voyager-pwa with React Native adaptations
 */

import { useState, useCallback, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebaseConfig';
import {
  TravelPreferenceProfile,
  UserTravelPreferences,
  PreferenceSignal,
} from '../types/TravelPreferences';
import {
  validateTravelPreferenceProfile,
  validateUserTravelPreferences,
  validatePreferenceSignal,
} from '../utils/travelPreferencesValidation';
import {
  createValidationError,
  createProfileNotFoundError,
  createDuplicateProfileNameError,
  createCannotDeleteDefaultError,
  createCannotDeleteLastProfileError,
  createMaxProfilesExceededError,
  createSaveFailedError,
  createLoadFailedError,
  createFirestoreError,
  createSignalSaveFailedError,
  TravelPreferencesError,
} from '../errors/TravelPreferencesErrors';

const MAX_PROFILES = 10;

interface UseTravelPreferencesReturn {
  // State
  preferences: UserTravelPreferences | null;
  profiles: TravelPreferenceProfile[];
  defaultProfile: TravelPreferenceProfile | null;
  loading: boolean;
  error: TravelPreferencesError | null;
  
  // Profile CRUD operations
  createProfile: (profile: Omit<TravelPreferenceProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TravelPreferenceProfile>;
  updateProfile: (profileId: string, updates: Partial<TravelPreferenceProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  setDefaultProfile: (profileId: string) => Promise<void>;
  getProfile: (profileId: string) => TravelPreferenceProfile | undefined;
  
  // Preference signals
  recordPreferenceSignal: (signal: Omit<PreferenceSignal, 'id' | 'timestamp'>) => Promise<void>;
  
  // Data refresh
  refreshPreferences: () => Promise<void>;
}

export function useTravelPreferences(): UseTravelPreferencesReturn {
  const [preferences, setPreferences] = useState<UserTravelPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<TravelPreferencesError | null>(null);

  const userId = auth?.currentUser?.uid;

  /**
   * Load preferences from Firestore
   */
  const loadPreferences = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const travelPreferences = userData.travelPreferences as UserTravelPreferences | undefined;

        if (travelPreferences) {
          // Validate loaded preferences
          const validation = validateUserTravelPreferences(travelPreferences);
          if (!validation.isValid) {
            console.warn('Loaded preferences have validation issues:', validation.errors);
            // Continue with potentially invalid data, but log warnings
          }
          setPreferences(travelPreferences);
        } else {
          // Initialize default preferences if none exist
          const defaultPreferences: UserTravelPreferences = {
            profiles: [],
            defaultProfileId: null,
            preferenceSignals: [],
          };
          setPreferences(defaultPreferences);
        }
      }
    } catch (err: any) {
      console.error('Error loading preferences:', err);
      const travelError = createLoadFailedError(err.message);
      setError(travelError);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /**
   * Save preferences to Firestore
   */
  const savePreferences = useCallback(async (newPreferences: UserTravelPreferences) => {
    if (!userId) {
      throw createSaveFailedError('User not authenticated');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        travelPreferences: newPreferences,
        updatedAt: serverTimestamp(),
      });
      setPreferences(newPreferences);
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      throw createFirestoreError(err);
    }
  }, [userId]);

  /**
   * Create a new profile
   */
  const createProfile = useCallback(async (
    profileData: Omit<TravelPreferenceProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TravelPreferenceProfile> => {
    if (!preferences) {
      throw createSaveFailedError('Preferences not loaded');
    }

    // Check max profiles limit
    if (preferences.profiles.length >= MAX_PROFILES) {
      throw createMaxProfilesExceededError(MAX_PROFILES);
    }

    // Check for duplicate name
    const duplicateName = preferences.profiles.some(
      p => p.name.toLowerCase() === profileData.name.toLowerCase()
    );
    if (duplicateName) {
      throw createDuplicateProfileNameError(profileData.name);
    }

    // Create new profile with timestamps
    // NOTE: Use Date objects instead of serverTimestamp() because Firestore
    // doesn't support serverTimestamp() inside arrays
    const now = new Date();
    const newProfile: TravelPreferenceProfile = {
      ...profileData,
      id: `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    // Validate new profile
    const validation = validateTravelPreferenceProfile(newProfile);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // If this is the first profile or marked as default, set it as default
    const isFirstProfile = preferences.profiles.length === 0;
    if (isFirstProfile || newProfile.isDefault) {
      // Clear other defaults
      preferences.profiles.forEach(p => p.isDefault = false);
    }

    const updatedPreferences: UserTravelPreferences = {
      ...preferences,
      profiles: [...preferences.profiles, newProfile],
      defaultProfileId: isFirstProfile || newProfile.isDefault ? newProfile.id : preferences.defaultProfileId,
    };

    await savePreferences(updatedPreferences);
    return newProfile;
  }, [preferences, savePreferences]);

  /**
   * Update an existing profile
   */
  const updateProfile = useCallback(async (
    profileId: string,
    updates: Partial<TravelPreferenceProfile>
  ): Promise<void> => {
    if (!preferences) {
      throw createSaveFailedError('Preferences not loaded');
    }

    const profileIndex = preferences.profiles.findIndex(p => p.id === profileId);
    if (profileIndex === -1) {
      throw createProfileNotFoundError(profileId);
    }

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const duplicateName = preferences.profiles.some(
        (p, idx) => idx !== profileIndex && p.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (duplicateName) {
        throw createDuplicateProfileNameError(updates.name);
      }
    }

    // Merge updates
    // NOTE: Use Date object instead of serverTimestamp() because Firestore
    // doesn't support serverTimestamp() inside arrays
    const updatedProfile: TravelPreferenceProfile = {
      ...preferences.profiles[profileIndex],
      ...updates,
      updatedAt: new Date(),
    };

    // Validate updated profile
    const validation = validateTravelPreferenceProfile(updatedProfile);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // Handle default profile logic
    let newDefaultProfileId = preferences.defaultProfileId;
    if (updates.isDefault) {
      // Clear other defaults
      preferences.profiles.forEach((p, idx) => {
        if (idx !== profileIndex) {
          p.isDefault = false;
        }
      });
      newDefaultProfileId = profileId;
    }

    const updatedProfiles = [...preferences.profiles];
    updatedProfiles[profileIndex] = updatedProfile;

    const updatedPreferences: UserTravelPreferences = {
      ...preferences,
      profiles: updatedProfiles,
      defaultProfileId: newDefaultProfileId,
    };

    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  /**
   * Delete a profile
   */
  const deleteProfile = useCallback(async (profileId: string): Promise<void> => {
    if (!preferences) {
      throw createSaveFailedError('Preferences not loaded');
    }

    const profile = preferences.profiles.find(p => p.id === profileId);
    if (!profile) {
      throw createProfileNotFoundError(profileId);
    }

    // Cannot delete last profile
    if (preferences.profiles.length === 1) {
      throw createCannotDeleteLastProfileError();
    }

    // Cannot delete default profile directly
    if (profile.isDefault || preferences.defaultProfileId === profileId) {
      throw createCannotDeleteDefaultError();
    }

    const updatedProfiles = preferences.profiles.filter(p => p.id !== profileId);

    const updatedPreferences: UserTravelPreferences = {
      ...preferences,
      profiles: updatedProfiles,
    };

    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  /**
   * Set a profile as default
   */
  const setDefaultProfile = useCallback(async (profileId: string): Promise<void> => {
    if (!preferences) {
      throw createSaveFailedError('Preferences not loaded');
    }

    const profileIndex = preferences.profiles.findIndex(p => p.id === profileId);
    if (profileIndex === -1) {
      throw createProfileNotFoundError(profileId);
    }

    // Clear other defaults
    const updatedProfiles = preferences.profiles.map((p, idx) => ({
      ...p,
      isDefault: idx === profileIndex,
    }));

    const updatedPreferences: UserTravelPreferences = {
      ...preferences,
      profiles: updatedProfiles,
      defaultProfileId: profileId,
    };

    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  /**
   * Get a specific profile
   */
  const getProfile = useCallback((profileId: string): TravelPreferenceProfile | undefined => {
    return preferences?.profiles.find(p => p.id === profileId);
  }, [preferences]);

  /**
   * Record a preference signal for learning
   */
  const recordPreferenceSignal = useCallback(async (
    signalData: Omit<PreferenceSignal, 'id' | 'timestamp'>
  ): Promise<void> => {
    if (!preferences) {
      throw createSignalSaveFailedError('Preferences not loaded');
    }

    const signal: PreferenceSignal = {
      ...signalData,
      id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(), // Use Date instead of serverTimestamp() for arrays
      processed: false,
    };

    // Validate signal
    const validation = validatePreferenceSignal(signal);
    if (!validation.isValid) {
      throw createValidationError(validation.errors);
    }

    // Add signal to array (keep last 1000 signals)
    const updatedSignals = [...(preferences.preferenceSignals || []), signal].slice(-1000);

    const updatedPreferences: UserTravelPreferences = {
      ...preferences,
      preferenceSignals: updatedSignals,
    };

    await savePreferences(updatedPreferences);
  }, [preferences, savePreferences]);

  /**
   * Refresh preferences from Firestore
   */
  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  // Load preferences on mount and when user changes
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Compute derived state
  const profiles = preferences?.profiles || [];
  const defaultProfile = profiles.find(p => p.id === preferences?.defaultProfileId) || null;

  return {
    preferences,
    profiles,
    defaultProfile,
    loading,
    error,
    createProfile,
    updateProfile,
    deleteProfile,
    setDefaultProfile,
    getProfile,
    recordPreferenceSignal,
    refreshPreferences,
  };
}
