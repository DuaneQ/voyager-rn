/**
 * Sync Firebase REST API Auth with Firebase Auth SDK
 * 
 * Problem: Firestore Web SDK requires Firebase Auth SDK to be initialized
 * and have a signed-in user to attach auth tokens to requests.
 * 
 * Solution: After signing in via REST API, we need to also sign in to
 * Firebase Auth SDK to enable Firestore access.
 * 
 * This requires a Cloud Function to generate custom tokens from the REST API's ID token.
 */

import { auth, signInWithCustomToken, getCloudFunctionUrl } from '../../config/firebaseConfig';

/**
 * Sync REST API user with Firebase Auth SDK for Firestore access
 * @param idToken - The ID token from FirebaseAuthService
 */
export async function syncAuthWithFirestore(idToken: string): Promise<void> {
  try {
    console.log('[syncAuthWithFirestore] Requesting custom token...');
    
    // Call Cloud Function via direct HTTP (Firebase Functions SDK incompatible with RN)
    const functionUrl = getCloudFunctionUrl('getCustomToken');
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ data: { idToken } })
    });
    
    const result = await response.json();
    const customToken = result.customToken;
    
    if (!customToken) {
      throw new Error('No custom token returned from function');
    }
    
    console.log('[syncAuthWithFirestore] Signing in to Auth SDK with custom token...');
    
    // Sign in to Firebase Auth SDK with custom token
    // This enables Firestore to attach auth tokens to requests
    await signInWithCustomToken(auth, customToken);
    
    console.log('[syncAuthWithFirestore] Successfully synced with Firestore');
  } catch (error) {
    console.error('[syncAuthWithFirestore] Error syncing auth:', error);
    throw error;
  }
}

/**
 * Sign out from Firebase Auth SDK (for Firestore)
 */
export async function signOutFromFirestore(): Promise<void> {
  try {
    await auth.signOut();
    console.log('[syncAuthWithFirestore] Signed out from Auth SDK');
  } catch (error) {
    console.error('[syncAuthWithFirestore] Error signing out:', error);
  }
}
