/**
 * Stripe Portal Hook - React Native Web Implementation
 * Replicates exact functionality of voyager-pwa/src/hooks/useStripePortal.ts
 * 
 * NOTE: This hook is for WEB ONLY. Mobile users cannot access Stripe directly.
 * The Stripe billing portal is opened via window.location.assign (web browser redirect).
 */

import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface UseStripePortalReturn {
  openPortal: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for opening the Stripe Customer Portal
 * Allows premium users to manage their subscription (cancel, update payment, etc.)
 * 
 * @returns {UseStripePortalReturn} Portal control functions and state
 */
export function useStripePortal(): UseStripePortalReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPortal = useCallback(async () => {
    // Only works on web platform
    if (Platform.OS !== 'web') {
      setError('Stripe portal is only available on web.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Match PWA exactly: getFunctions() without arguments
      const functions = getFunctions();
      const createPortal = httpsCallable(functions, 'createStripePortalSession');
      // Pass the current origin so the portal redirects back correctly
      const origin = window.location.origin;
      const result: any = await createPortal({ origin });

      if (result?.data?.url) {
        // Redirect to Stripe billing portal
        window.location.assign(result.data.url);
      } else {
        setError('Failed to get portal link.');
      }
    } catch (err: any) {
      console.error('[useStripePortal] Error opening portal:', err);
      setError(err?.message || 'Error opening portal.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { openPortal, loading, error };
}
