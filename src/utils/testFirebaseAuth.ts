/**
 * Test Firebase Authentication Configuration
 * 
 * This test verifies that Firebase Auth is properly configured
 * and can handle basic authentication operations.
 */

import { auth } from '../config/firebaseConfig';
import { sendPasswordResetEmail } from 'firebase/auth';

export const testFirebaseAuth = async () => {
  console.log('🧪 Testing Firebase Auth Configuration...');
  
  try {
    // Test 1: Check if auth is properly initialized
    console.log('✓ Auth instance created:', !!auth);
    console.log('✓ Auth app:', auth.app.name);
    console.log('✓ Auth config:', auth.config);
    
    // Test 2: Check if we can access Firebase Auth methods
    console.log('✓ sendPasswordResetEmail method available:', typeof sendPasswordResetEmail === 'function');
    
    // Test 3: Check current user state
    console.log('✓ Current user:', auth.currentUser ? auth.currentUser.uid : 'None');
    
    // Test 4: Test password reset email with a test email (this will fail but should give us error info)
    try {
      await sendPasswordResetEmail(auth, 'test@example.com');
      console.log('⚠️ Test password reset succeeded (unexpected)');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('✓ Password reset working (user-not-found is expected for test email)');
      } else {
        console.log('⚠️ Password reset error:', error.code, error.message);
      }
    }
    
    console.log('🎉 Firebase Auth test completed');
    return true;
  } catch (error) {
    console.error('❌ Firebase Auth test failed:', error);
    return false;
  }
};

// Export for use in app
export default testFirebaseAuth;