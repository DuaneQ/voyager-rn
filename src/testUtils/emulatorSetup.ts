/**
 * Firebase Emulator Test Utilities (Admin SDK)
 * 
 * Helper functions for integration tests that run against Firebase Emulators.
 * Uses Firebase Admin SDK which is Node.js-native and works properly with Jest.
 * 
 * Usage:
 * 1. Start emulators: `firebase emulators:start`
 * 2. In your test file:
 *    ```typescript
 *    import { setupEmulatorTests, cleanupEmulatorTests } from './emulatorSetup';
 *    
 *    beforeAll(async () => {
 *      await setupEmulatorTests();
 *    });
 *    
 *    afterAll(async () => {
 *      await cleanupEmulatorTests();
 *    });
 *    ```
 */

import * as admin from 'firebase-admin';

// Emulator configuration (matches firebase.json in voyager-pwa)
const EMULATOR_CONFIG = {
  auth: {
    host: '127.0.0.1',
    port: 9099,
  },
  functions: {
    host: '127.0.0.1',
    port: 5001,
  },
  firestore: {
    host: '127.0.0.1',
    port: 8080,
  },
};

let testApp: admin.app.App | null = null;
let testAuth: admin.auth.Auth | null = null;
let testFirestore: admin.firestore.Firestore | null = null;
let testUserId: string | null = null;

/**
 * Initialize Firebase Admin SDK and connect to emulators
 * Call this in beforeAll() or beforeEach()
 * 
 * IMPORTANT: This is idempotent - it will reuse existing Admin SDK if already initialized
 */
export const setupEmulatorTests = async () => {
  try {
    // If already initialized, just return (reuse existing connection)
    if (testApp && testFirestore && testAuth && testUserId) {
      console.log('🔧 [EmulatorSetup] Admin SDK already initialized, reusing existing connection');
      return;
    }
    
    console.log('🔧 [EmulatorSetup] Starting Firebase Admin SDK emulator initialization...');
    
    // Configure emulator connections FIRST (before initializing Admin SDK)
    // CRITICAL: Set these BEFORE any Admin SDK initialization
    process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_CONFIG.auth.host}:${EMULATOR_CONFIG.auth.port}`;
    console.log(`✅ [EmulatorSetup] Emulator environment configured:`);
    console.log(`   - Firestore: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(`   - Auth: ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
    
    // Only initialize if not already done
    if (!testApp) {
      console.log('🔧 [EmulatorSetup] Initializing Firebase Admin SDK...');
      testApp = admin.initializeApp({
        projectId: 'mundo1-dev',
      }, `test-admin-${Date.now()}`);
      console.log(`✅ [EmulatorSetup] Admin app initialized: ${testApp.name}`);
    }

    // Get services (reuse if already available)
    if (!testAuth || !testFirestore) {
      console.log('🔧 [EmulatorSetup] Getting Firebase Admin services...');
      testAuth = admin.auth(testApp);
      testFirestore = admin.firestore(testApp);
      console.log('✅ [EmulatorSetup] Firebase Admin services obtained');
    }

    // Create a test user for authenticated operations (only once)
    if (!testUserId) {
      console.log('🔧 [EmulatorSetup] Creating test user...');
      try {
        const userRecord = await testAuth.createUser({
          uid: `test-user-${Date.now()}`,
          email: `test-${Date.now()}@example.com`, // Use unique email
          emailVerified: true,
          displayName: 'Test User',
        });
        testUserId = userRecord.uid;
        console.log(`✅ [EmulatorSetup] Test user created: ${testUserId}`);
      } catch (error: any) {
        // If user already exists, just use it
        if (error.code === 'auth/email-already-exists') {
          console.log('⚠️  Test user already exists, reusing...');
          testUserId = `test-user-${Date.now()}`;
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Firebase Admin Emulators connected successfully');
  } catch (error) {
    console.error('❌ Failed to setup emulator tests:', error);
    throw error;
  }
};

/**
 * Clean up Firebase Admin app and connections
 * Call this in afterAll()
 */
export const cleanupEmulatorTests = async () => {
  try {
    if (testApp) {
      await testApp.delete();
      testApp = null;
      testAuth = null;
      testFirestore = null;
      testUserId = null;
    }
    console.log('✅ Emulator tests cleaned up');
  } catch (error) {
    console.error('❌ Failed to cleanup emulator tests:', error);
  }
};

/**
 * Get test Firebase Admin Auth instance
 */
export const getTestAuth = () => {
  if (!testAuth) {
    throw new Error('Test auth not initialized. Call setupEmulatorTests() first.');
  }
  return testAuth;
};

/**
 * Get test Firebase Admin Firestore instance
 */
export const getTestFirestore = () => {
  if (!testFirestore) {
    throw new Error('Test Firestore not initialized. Call setupEmulatorTests() first.');
  }
  return testFirestore;
};

/**
 * Get test user ID (created during setup)
 */
export const getTestUserId = () => {
  if (!testUserId) {
    throw new Error('Test user not created. Call setupEmulatorTests() first.');
  }
  return testUserId;
};

/**
 * Get test Firebase Admin App instance
 */
export const getTestApp = () => {
  if (!testApp) {
    throw new Error('Test app not initialized. Call setupEmulatorTests() first.');
  }
  return testApp;
};

/**
 * Helper to call Firebase Cloud Functions via HTTP
 * Since Admin SDK doesn't have a functions client, we use fetch
 */
export const callFunction = async (functionName: string, data: any) => {
  const url = `http://${EMULATOR_CONFIG.functions.host}:${EMULATOR_CONFIG.functions.port}/mundo1-dev/us-central1/${functionName}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Function call failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  return result.result;
};

/**
 * Helper to create an itinerary document in Firestore
 */
export const createTestItinerary = async (itineraryData: any) => {
  const firestore = getTestFirestore();
  const userId = itineraryData.userId || getTestUserId();
  
  const itinerary = {
    userId,
    destination: itineraryData.destination || 'Test Destination',
    startDay: itineraryData.startDay || Date.now(),
    endDay: itineraryData.endDay || Date.now() + 86400000, // +1 day
    lowerRange: itineraryData.lowerRange || 18,
    upperRange: itineraryData.upperRange || 99,
    preferences: itineraryData.preferences || {},
    isPublic: itineraryData.isPublic !== undefined ? itineraryData.isPublic : true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...itineraryData,
  };

  const docRef = await firestore.collection('itineraries').add(itinerary);
  return docRef.id; // Return just the ID string
};

/**
 * Helper to create a test user profile in Firestore
 */
export const createTestUserProfile = async (userData: any) => {
  const firestore = getTestFirestore();
  const userId = userData.userId || getTestUserId();
  
  const userProfile = {
    age: userData.age || 25,
    blockedUsers: userData.blockedUsers || [],
    email: userData.email || 'test@example.com',
    displayName: userData.displayName || 'Test User',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...userData,
  };

  await firestore.collection('users').doc(userId).set(userProfile);
  return { userId, ...userProfile };
};

/**
 * Helper to clear all test data from Firestore
 * 
 * CRITICAL SAFETY CHECK: This will ONLY work if the emulator is properly configured
 * It will throw an error if trying to clear production/dev data
 */
export const clearFirestoreEmulator = async () => {
  // SAFETY CHECK: Verify we're connected to emulator, not production!
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      '🚨 SAFETY CHECK FAILED: FIRESTORE_EMULATOR_HOST not set! ' +
      'Refusing to clear data - this might be production! ' +
      'Call setupEmulatorTests() first to configure emulator connection.'
    );
  }
  
  const expectedHost = `${EMULATOR_CONFIG.firestore.host}:${EMULATOR_CONFIG.firestore.port}`;
  if (process.env.FIRESTORE_EMULATOR_HOST !== expectedHost) {
    throw new Error(
      `🚨 SAFETY CHECK FAILED: FIRESTORE_EMULATOR_HOST mismatch! ` +
      `Expected: ${expectedHost}, Got: ${process.env.FIRESTORE_EMULATOR_HOST}. ` +
      `This might not be the emulator!`
    );
  }
  
  console.log(`✅ Safety check passed: Connected to emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
  
  const firestore = getTestFirestore();
  
  // Delete all itineraries
  const itinerariesSnapshot = await firestore.collection('itineraries').get();
  await Promise.all(itinerariesSnapshot.docs.map(doc => doc.ref.delete()));
  
  // Delete all users
  const usersSnapshot = await firestore.collection('users').get();
  await Promise.all(usersSnapshot.docs.map(doc => doc.ref.delete()));
  
  console.log('✅ Firestore emulator data cleared');
};

/**
 * Check if emulators are running
 * Useful for conditional test execution
 */
export const areEmulatorsRunning = async (): Promise<boolean> => {
  try {
    const response = await fetch(`http://${EMULATOR_CONFIG.functions.host}:${EMULATOR_CONFIG.functions.port}`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Wait for emulator to be ready
 * Useful in CI environments where emulator startup is async
 */
export const waitForEmulator = async (
  maxRetries = 30,
  retryDelay = 1000
): Promise<boolean> => {
  for (let i = 0; i < maxRetries; i++) {
    const isRunning = await areEmulatorsRunning();
    if (isRunning) {
      console.log(`✅ Emulator is ready (attempt ${i + 1}/${maxRetries})`);
      return true;
    }
    console.log(`⏳ Waiting for emulator... (attempt ${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  console.error('❌ Emulator did not become ready in time');
  return false;
};
