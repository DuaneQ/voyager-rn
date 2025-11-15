/**
 * Hook for creating and updating manual itineraries
 * Uses createItinerary RPC to persist to PostgreSQL
 */

import { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import * as firebaseCfg from '../config/firebaseConfig';
import {
  ManualItineraryFormData,
  ManualItineraryData,
  CreateItineraryResponse,
  ItineraryValidationError,
} from '../types/ManualItinerary';
import { calculateAge } from '../utils/calculateAge';

export const useCreateItinerary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateItinerary = useCallback((
    formData: ManualItineraryFormData,
    userProfile: any
  ): ItineraryValidationError[] => {
    const errors: ItineraryValidationError[] = [];

    // User profile validation
    if (!userProfile?.dob || !userProfile?.gender) {
      errors.push({
        field: 'profile',
        message: 'Please complete your profile by setting your date of birth and gender before creating an itinerary.',
      });
    }

    // Required fields
    if (!formData.destination.trim()) {
      errors.push({ field: 'destination', message: 'Destination is required' });
    }

    if (!formData.startDate) {
      errors.push({ field: 'startDate', message: 'Start date is required' });
    }

    if (!formData.endDate) {
      errors.push({ field: 'endDate', message: 'End date is required' });
    }

    // Date validation
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        errors.push({ field: 'startDate', message: 'Start date cannot be in the past' });
      }

      if (endDate < startDate) {
        errors.push({ field: 'endDate', message: 'End date must be after start date' });
      }
    }

    // Preference validations
    if (!formData.gender) {
      errors.push({ field: 'gender', message: 'Gender preference is required' });
    }

    if (!formData.status) {
      errors.push({ field: 'status', message: 'Status preference is required' });
    }

    if (!formData.sexualOrientation) {
      errors.push({ field: 'sexualOrientation', message: 'Sexual orientation preference is required' });
    }

    // Age range validation
    if (formData.lowerRange < 18) {
      errors.push({ field: 'lowerRange', message: 'Minimum age must be at least 18' });
    }

    if (formData.upperRange > 100) {
      errors.push({ field: 'upperRange', message: 'Maximum age cannot exceed 100' });
    }

    if (formData.lowerRange > formData.upperRange) {
      errors.push({ field: 'ageRange', message: 'Minimum age must be less than maximum age' });
    }

    return errors;
  }, []);

  const createItinerary = useCallback(async (
    formData: ManualItineraryFormData,
    userProfile: any,
    editingItineraryId?: string
  ): Promise<CreateItineraryResponse> => {
  const _resolvedAuth: any = (firebaseCfg && typeof (firebaseCfg as any).getAuthInstance === 'function')
    ? (firebaseCfg as any).getAuthInstance()
    : (firebaseCfg as any).auth || null;
  const userId = _resolvedAuth?.currentUser?.uid;
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate
    const validationErrors = validateItinerary(formData, userProfile);
    if (validationErrors.length > 0) {
      return { 
        success: false, 
        error: validationErrors.map(e => e.message).join(', '),
        validationErrors,
      };
    }

    setLoading(true);
    setError(null);

    try {
  const resolvedFunctions = (firebaseCfg as any).functions;
  const createItineraryFn = httpsCallable(resolvedFunctions, 'createItinerary');

      // Convert dates to timestamps (noon UTC to avoid timezone issues)
      const startDate = new Date(formData.startDate + 'T12:00:00.000Z');
      const endDate = new Date(formData.endDate + 'T12:00:00.000Z');

      // Calculate age from user's date of birth for filtering
      const userAge = userProfile?.dob ? calculateAge(userProfile.dob) : 0;

      // Build payload matching PostgreSQL schema
      const payload: Partial<ManualItineraryData> = {
        ...(editingItineraryId && { id: editingItineraryId }),
        userId,
        destination: formData.destination.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        startDay: startDate.getTime(),
        endDay: endDate.getTime(),
        description: formData.description?.trim() || '',
  activities: Array.isArray(formData.activities) ? formData.activities.filter(a => a && String(a).trim()) : [],
        gender: formData.gender,
        status: formData.status,
        sexualOrientation: formData.sexualOrientation,
        lowerRange: formData.lowerRange,
        upperRange: formData.upperRange,
        likes: editingItineraryId ? undefined : [], // Don't override likes when editing
        age: userAge, // Include calculated age for efficient search filtering
        userInfo: {
          username: userProfile.username || 'Anonymous',
          gender: userProfile.gender || 'Not specified',
          dob: userProfile.dob || 'Unknown',
          uid: userId,
          email: userProfile.email || '',
          status: userProfile.status || 'single',
          sexualOrientation: userProfile.sexualOrientation || 'not specified',
          blocked: userProfile.blocked || [],
        },
      };

      console.log('[useCreateItinerary] Creating itinerary:', { 
        destination: payload.destination,
        isEditing: !!editingItineraryId 
      });

      const result: any = await createItineraryFn({ itinerary: payload });

      if (!result.data?.success) {
        throw new Error(result.data?.error || 'Failed to create itinerary');
      }

      console.log('[useCreateItinerary] Success:', result.data.data?.id);
      return { success: true, data: result.data.data };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create itinerary';
      console.error('[useCreateItinerary] Error:', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [validateItinerary]);

  return {
    createItinerary,
    loading,
    error,
    validateItinerary,
  };
};
