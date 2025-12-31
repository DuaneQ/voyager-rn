/**
 * useTermsAcceptance Hook
 * Manages Terms of Service acceptance state and Firestore persistence
 * Following Single Responsibility Principle - only handles ToS acceptance logic
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  doc, 
  updateDoc, 
  getDoc, 
  serverTimestamp as firestoreServerTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';

interface TermsOfService {
  accepted: boolean;
  acceptedAt: Date | null;
  version: string;
}

interface UseTermsAcceptanceReturn {
  hasAcceptedTerms: boolean;
  isLoading: boolean;
  error: Error | null;
  acceptTerms: () => Promise<void>;
  checkTermsStatus: () => Promise<boolean>;
}

const CURRENT_TERMS_VERSION = '1.0.0';

/**
 * Custom hook for managing Terms of Service acceptance
 * Checks Firestore for user's acceptance status and provides method to accept
 * 
 * @returns {UseTermsAcceptanceReturn} Terms acceptance state and methods
 */
export const useTermsAcceptance = (): UseTermsAcceptanceReturn => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);

  /**
   * Check if user has accepted the current version of terms
   * @param uid - User ID to check
   * @returns Promise<boolean> - True if terms accepted
   */
  const checkTermsStatusForUid = useCallback(async (uid: string): Promise<boolean> => {
    if (!uid) {
      setHasAcceptedTerms(false);
      setIsLoading(false);
      return false;
    }

    setError(null);
    setIsLoading(true);
    
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        setHasAcceptedTerms(false);
        setIsLoading(false);
        return false;
      }
      
      const userData = userDoc.data();
      const termsOfService = userData?.termsOfService as TermsOfService | undefined;
      
      // Check if user has accepted current version
      const hasValidAcceptance = Boolean(
        termsOfService?.accepted && 
        termsOfService?.version === CURRENT_TERMS_VERSION
      );
      
      setHasAcceptedTerms(hasValidAcceptance);
      setIsLoading(false);
      return hasValidAcceptance;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      setHasAcceptedTerms(false);
      setIsLoading(false);
      return false;
    }
  }, []);

  /**
   * Listen for auth state changes and check terms status
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const uid = user?.uid;
      setUserId(uid);
      
      if (!uid) {
        setHasAcceptedTerms(false);
        setIsLoading(false);
        setError(null);
      } else {
        checkTermsStatusForUid(uid);
      }
    });
    
    return () => unsubscribe();
  }, [checkTermsStatusForUid]);

  /**
   * Accept the Terms of Service
   * Writes acceptance to Firestore user document
   */
  const acceptTerms = async (): Promise<void> => {
    setError(null);
    
    const currentUserId = auth.currentUser?.uid || userId;
    
    if (!currentUserId) {
      const noUserError = new Error('User must be logged in to accept terms');
      console.error('[useTermsAcceptance.acceptTerms] ❌ No user ID found');
      setError(noUserError);
      throw noUserError;
    }

    setIsLoading(true);
    
    try {
      const userDocRef = doc(db, 'users', currentUserId);
      
      // Write acceptance to Firestore
      await updateDoc(userDocRef, {
        termsOfService: {
          accepted: true,
          acceptedAt: firestoreServerTimestamp(),
          version: CURRENT_TERMS_VERSION,
        },
        lastUpdated: firestoreServerTimestamp(),
      });
      setHasAcceptedTerms(true);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      console.error('[useTermsAcceptance.acceptTerms] ❌ Error accepting terms:', errorObj);
      console.error('[useTermsAcceptance.acceptTerms] Error details:', {
        code: (err as any)?.code,
        message: errorObj.message,
        stack: errorObj.stack
      });
      setError(errorObj);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Manually check terms status (useful for refresh after acceptance)
   */
  const checkTermsStatus = async (): Promise<boolean> => {
    if (!userId) {
      setIsLoading(false);
      return false;
    }
    return checkTermsStatusForUid(userId);
  };

  return {
    hasAcceptedTerms,
    isLoading,
    error,
    acceptTerms,
    checkTermsStatus,
  };
};
