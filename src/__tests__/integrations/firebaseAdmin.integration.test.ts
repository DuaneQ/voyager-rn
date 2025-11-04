/**
 * Integration Tests: Firebase Admin SDK Demo
 * 
 * This test demonstrates that Firebase Admin SDK works properly with Jest
 * for integration testing against Firebase Emulators.
 * 
 * IMPORTANT: Run emulators first from voyager-pwa:
 *   cd ../voyager-pwa && firebase emulators:start
 */

import {
  setupEmulatorTests,
  cleanupEmulatorTests,
  getTestUserId,
  getTestFirestore,
  createTestItinerary,
  createTestUserProfile,
  clearFirestoreEmulator,
} from '../../testUtils/emulatorSetup';

describe('Firebase Admin SDK Integration Tests', () => {
  let testUserId: string;
  
  beforeAll(async () => {
    await setupEmulatorTests();
    testUserId = getTestUserId();
    console.log(`✅ Test setup complete. Test user ID: ${testUserId}`);
  });
  
  afterAll(async () => {
    // Cleanup happens globally - don't delete Admin SDK app here
    // await cleanupEmulatorTests();
  });
  
  beforeEach(async () => {
    await clearFirestoreEmulator();
  });

  describe('Firestore Operations', () => {
    it('should create and read a user profile', async () => {
      const userProfile = await createTestUserProfile({
        userId: 'test-user-1',
        age: 25,
        gender: 'Male',
        status: 'Single',
      });
      
      expect(userProfile.userId).toBe('test-user-1');
      expect(userProfile.age).toBe(25);
      
      // Read it back from Firestore
      const firestore = getTestFirestore();
      const userDoc = await firestore.collection('users').doc('test-user-1').get();
      
      expect(userDoc.exists).toBe(true);
      expect(userDoc.data()?.age).toBe(25);
    });
    
    it('should create and read an itinerary', async () => {
      await createTestUserProfile({
        userId: 'test-user-2',
        age: 30,
      });
      
      const itineraryId = await createTestItinerary({
        userId: 'test-user-2',
        destination: 'Paris, France',
        startDay: Date.now(),
        endDay: Date.now() + 86400000 * 7, // +7 days
        lowerRange: 20,
        upperRange: 40,
      });
      
      expect(itineraryId).toBeDefined();
      expect(typeof itineraryId).toBe('string');
      
      // Read it back
      const firestore = getTestFirestore();
      const itinDoc = await firestore.collection('itineraries').doc(itineraryId).get();
      
      expect(itinDoc.exists).toBe(true);
      expect(itinDoc.data()?.destination).toBe('Paris, France');
    });
    
    it('should clear all data', async () => {
      // Create some data
      await createTestUserProfile({ userId: 'user-1', age: 25 });
      await createTestUserProfile({ userId: 'user-2', age: 30 });
      await createTestItinerary({ userId: 'user-1', destination: 'London' });
      
      const firestore = getTestFirestore();
      
      // Verify data exists
      let usersSnapshot = await firestore.collection('users').get();
      let itinerariesSnapshot = await firestore.collection('itineraries').get();
      expect(usersSnapshot.size).toBeGreaterThan(0);
      expect(itinerariesSnapshot.size).toBeGreaterThan(0);
      
      // Clear all data
      await clearFirestoreEmulator();
      
      // Verify data is gone
      usersSnapshot = await firestore.collection('users').get();
      itinerariesSnapshot = await firestore.collection('itineraries').get();
      expect(usersSnapshot.size).toBe(0);
      expect(itinerariesSnapshot.size).toBe(0);
    });
  });

  describe('Itinerary Matching - Date Overlap', () => {
    it('should find itineraries with overlapping dates', async () => {
      const userStartDay = new Date('2025-12-01').getTime();
      const userEndDay = new Date('2025-12-07').getTime();
      
      // Create candidate itinerary that overlaps
      const candidateItineraryId = await createTestItinerary({
        userId: 'candidate-1',
        destination: 'Tokyo, Japan',
        startDay: new Date('2025-12-03').getTime(), // Overlaps user's trip
        endDay: new Date('2025-12-05').getTime(),
        lowerRange: 18,
        upperRange: 100,
      });
      
      await createTestUserProfile({
        userId: 'candidate-1',
        age: 28,
      });
      
      // Query Firestore for matches
      const firestore = getTestFirestore();
      const matchingSnapshot = await firestore.collection('itineraries')
        .where('destination', '==', 'Tokyo, Japan')
        .where('startDay', '<=', userEndDay)
        .where('endDay', '>=', userStartDay)
        .get();
      
      expect(matchingSnapshot.size).toBe(1);
      expect(matchingSnapshot.docs[0].id).toBe(candidateItineraryId);
    });
    
    it('should NOT find itineraries with no date overlap', async () => {
      const userStartDay = new Date('2025-12-01').getTime();
      const userEndDay = new Date('2025-12-07').getTime();
      
      // Create candidate itinerary that does NOT overlap
      await createTestItinerary({
        userId: 'candidate-2',
        destination: 'Tokyo, Japan',
        startDay: new Date('2025-12-10').getTime(), // No overlap
        endDay: new Date('2025-12-15').getTime(),
        lowerRange: 18,
        upperRange: 100,
      });
      
      await createTestUserProfile({
        userId: 'candidate-2',
        age: 28,
      });
      
      // Query for matches
      const firestore = getTestFirestore();
      const matchingSnapshot = await firestore.collection('itineraries')
        .where('destination', '==', 'Tokyo, Japan')
        .where('startDay', '<=', userEndDay)
        .where('endDay', '>=', userStartDay)
        .get();
      
      expect(matchingSnapshot.size).toBe(0);
    });
  });

  describe('Itinerary Matching - Age Range', () => {
    it('should filter by age range correctly', async () => {
      const startDay = Date.now();
      const endDay = startDay + 86400000 * 7;
      
      // User wants 25-35 year olds
      const userAgeMin = 25;
      const userAgeMax = 35;
      
      // Create candidates with different ages
      await createTestItinerary({
        userId: 'young-user',
        destination: 'Berlin',
        startDay,
        endDay,
        lowerRange: 18,
        upperRange: 100,
      });
      await createTestUserProfile({ userId: 'young-user', age: 20 }); // Too young
      
      await createTestItinerary({
        userId: 'right-age-user',
        destination: 'Berlin',
        startDay,
        endDay,
        lowerRange: 18,
        upperRange: 100,
      });
      await createTestUserProfile({ userId: 'right-age-user', age: 30 }); // Just right!
      
      await createTestItinerary({
        userId: 'old-user',
        destination: 'Berlin',
        startDay,
        endDay,
        lowerRange: 18,
        upperRange: 100,
      });
      await createTestUserProfile({ userId: 'old-user', age: 40 }); // Too old
      
      // Query all matching itineraries
      const firestore = getTestFirestore();
      const allMatches = await firestore.collection('itineraries')
        .where('destination', '==', 'Berlin')
        .where('startDay', '<=', endDay)
        .where('endDay', '>=', startDay)
        .get();
      
      // Now filter by age manually (in real app, this would be in Cloud Function)
      const filteredMatches: any[] = [];
      for (const doc of allMatches.docs) {
        const itinerary = doc.data();
        const userDoc = await firestore.collection('users').doc(itinerary.userId).get();
        const age = userDoc.data()?.age || 0;
        
        if (age >= userAgeMin && age <= userAgeMax) {
          filteredMatches.push({ id: doc.id, ...itinerary });
        }
      }
      
      expect(filteredMatches.length).toBe(1);
      expect(filteredMatches[0].userId).toBe('right-age-user');
    });
  });

  describe('Blocking Logic', () => {
    it('should exclude blocked users from results', async () => {
      const startDay = Date.now();
      const endDay = startDay + 86400000 * 7;
      
      // Create an itinerary from a user we'll block
      await createTestItinerary({
        userId: 'blocked-user',
        destination: 'London',
        startDay,
        endDay,
        lowerRange: 18,
        upperRange: 100,
      });
      await createTestUserProfile({
        userId: 'blocked-user',
        age: 30,
      });
      
      // Create our user profile with blocked list
      await createTestUserProfile({
        userId: testUserId,
        age: 30,
        blockedUsers: ['blocked-user'], // We've blocked this person
      });
      
      // Query matches
      const firestore = getTestFirestore();
      const allMatches = await firestore.collection('itineraries')
        .where('destination', '==', 'London')
        .get();
      
      // Filter out blocked users
      const currentUserDoc = await firestore.collection('users').doc(testUserId).get();
      const blockedUsers = currentUserDoc.data()?.blockedUsers || [];
      
      const filteredMatches = allMatches.docs.filter(
        doc => !blockedUsers.includes(doc.data().userId)
      );
      
      expect(filteredMatches.length).toBe(0); // Blocked user should not appear
    });
    
    it('should exclude users who blocked us', async () => {
      const startDay = Date.now();
      const endDay = startDay + 86400000 * 7;
      
      // Create an itinerary from a user who blocks us
      await createTestItinerary({
        userId: 'blocker-user',
        destination: 'Paris',
        startDay,
        endDay,
        lowerRange: 18,
        upperRange: 100,
      });
      await createTestUserProfile({
        userId: 'blocker-user',
        age: 30,
        blockedUsers: [testUserId], // This person blocked us
      });
      
      // Query matches
      const firestore = getTestFirestore();
      const allMatches = await firestore.collection('itineraries')
        .where('destination', '==', 'Paris')
        .get();
      
      // Filter out users who blocked us
      const filteredMatches: any[] = [];
      for (const doc of allMatches.docs) {
        const itinerary = doc.data();
        const candidateDoc = await firestore.collection('users').doc(itinerary.userId).get();
        const candidateBlockedUsers = candidateDoc.data()?.blockedUsers || [];
        
        if (!candidateBlockedUsers.includes(testUserId)) {
          filteredMatches.push(doc);
        }
      }
      
      expect(filteredMatches.length).toBe(0); // Shouldn't see users who blocked us
    });
  });
});
