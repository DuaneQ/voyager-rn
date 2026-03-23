/**
 * useTermsAcceptance Hook
 * Manages Terms of Service acceptance state and Firestore persistence.
 *
 * Derives hasAcceptedTerms directly from UserProfileContext.userProfile —
 * no independent Firestore read or onAuthStateChanged listener is needed.
 * UserProfileContext is the single source of truth for the user document.
 */

import { useState, useCallback } from 'react';
import {
  doc,
  setDoc,
  serverTimestamp as firestoreServerTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { AppError, isAppError } from '../errors/AppError';
import { createFirestoreError } from '../errors/factories/firestoreErrors';
import { createNotAuthenticatedError } from '../errors/factories/profileErrors';

interface UseTermsAcceptanceReturn {
  hasAcceptedTerms: boolean;
  isLoading: boolean;
  error: AppError | Error | null;
  acceptTerms: () => Promise<void>;
  checkTermsStatus: () => Promise<boolean>;
}

const CURRENT_TERMS_VERSION = '1.0.0';

export const useTermsAcceptance = (): UseTermsAcceptanceReturn => {
  const [error, setError] = useState<AppError | Error | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const { user } = useAuth();
  const { userProfile, isLoading, setUserProfile } = useUserProfile();

  // Derived directly from the profile already loaded by UserProfileContext —
  // no extra getDoc call or auth listener needed.
  const hasAcceptedTerms = Boolean(
    userProfile?.termsOfService?.accepted &&
    userProfile?.termsOfService?.version === CURRENT_TERMS_VERSION
  );

  const acceptTerms = async (): Promise<void> => {
    const uid = user?.uid;
    if (!uid) {
      const noUserError = createNotAuthenticatedError();
      console.error('[useTermsAcceptance.acceptTerms] ❌ No user ID found');
      setError(noUserError);
      throw noUserError;
    }

    setIsAccepting(true);
    setError(null);

    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          termsOfService: {
            accepted: true,
            acceptedAt: firestoreServerTimestamp(),
            version: CURRENT_TERMS_VERSION,
          },
          lastUpdated: firestoreServerTimestamp(),
        },
        { merge: true }
      );

      // Update local profile state immediately so TermsGuard re-renders without
      // waiting for a re-fetch. acceptedAt is null locally because server
      // timestamps are not resolvable on the client.
      setUserProfile(userProfile ? {
        ...userProfile,
        termsOfService: {
          accepted: true,
          acceptedAt: null,
          version: CURRENT_TERMS_VERSION,
        },
      } : null);
    } catch (err) {
      const appError = isAppError(err)
        ? err
        : createFirestoreError(err, 'acceptTerms', { userId: uid });
      console.error('[useTermsAcceptance.acceptTerms] ❌ Error accepting terms:', appError.toLogObject());
      setError(appError);
      throw appError;
    } finally {
      setIsAccepting(false);
    }
  };

  // Returns the current derived value.
  // Kept for interface compatibility with the error-retry path in TermsGuard.
  const checkTermsStatus = useCallback(async (): Promise<boolean> => {
    return hasAcceptedTerms;
  }, [hasAcceptedTerms]);

  return {
    hasAcceptedTerms,
    isLoading: isLoading || isAccepting,
    error,
    acceptTerms,
    checkTermsStatus,
  };
};
