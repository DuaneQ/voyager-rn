#!/usr/bin/env node
// Minimal Node script to test create/search/delete itineraries on remote cloud functions
// Usage: EMAIL=user@example.com PASSWORD=secret node scripts/cloud-function-crud-test.mjs

const API_KEY = process.env.API_KEY || 'AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0';
const PROJECT = process.env.FUNCTIONS_PROJECT_ID || 'mundo1-dev';
const REGION = process.env.FUNCTIONS_REGION || 'us-central1';
const FUNCTION_BASE = process.env.FUNCTION_URL_BASE || `https://${REGION}-${PROJECT}.cloudfunctions.net`;

const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('ERROR: EMAIL and PASSWORD environment variables required.');
  console.error('Usage: EMAIL=user@example.com PASSWORD=secret node scripts/cloud-function-crud-test.mjs');
  process.exit(1);
}

const fetch = global.fetch || (await import('node-fetch')).default;

async function signIn(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Sign-in error: ${JSON.stringify(json)}`);
  return json; // contains idToken, localId
}

async function callCallable(functionName, idToken, payload) {
  const url = `${FUNCTION_BASE}/${functionName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data: payload }),
  });
  const json = await res.json();
  return { status: res.status, json };
}

(async () => {
  try {
    console.log('Signing in as', EMAIL);
    const signInResult = await signIn(EMAIL, PASSWORD);
    const idToken = signInResult.idToken;
    const uid = signInResult.localId;
    console.log('Signed in as uid:', uid);

    // Create itinerary
    const timestamp = Date.now();
    const destination = `TEST-DEST-${timestamp}`;
    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // tomorrow
    const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 3 days from now
    const startDay = new Date(startDate + 'T12:00:00.000Z').getTime();
    const endDay = new Date(endDate + 'T12:00:00.000Z').getTime();

    const itineraryPayload = {
      itinerary: {
        userId: uid,
        destination,
        startDate,
        endDate,
        startDay,
        endDay,
        description: 'Created by automated test',
        activities: ['testing', 'debugging'],
        gender: 'no preference',
        status: 'no preference',
        sexualOrientation: 'no preference',
        lowerRange: 18,
        upperRange: 99,
        likes: [],
        age: 30,
        userInfo: {
          uid,
          email: EMAIL,
          username: 'test-user',
          gender: 'other',
          dob: '1990-01-01',
          status: 'single',
          sexualOrientation: 'not specified',
          blocked: [],
        }
      }
    };

    console.log('Calling createItinerary...');
    const createRes = await callCallable('createItinerary', idToken, itineraryPayload);
    console.log('createItinerary HTTP status:', createRes.status);
    console.log('createItinerary body:', JSON.stringify(createRes.json, null, 2));
    if (!createRes.json?.data?.success) {
      throw new Error('createItinerary failed: ' + JSON.stringify(createRes.json));
    }
    const createdItinerary = createRes.json.data.data;
    const createdId = createdItinerary?.id || createdItinerary?.itineraryId || createdItinerary?.itineraries?.[0]?.id;
    console.log('Created itinerary id:', createdId);

    // Search itineraries to find this created one
    const searchPayload = {
      destination,
      gender: 'no preference',
      status: 'no preference',
      sexualOrientation: 'no preference',
      minStartDay: startDay - 1000,
      maxEndDay: endDay + 1000,
      pageSize: 20,
      excludedIds: [],
      blockedUserIds: [],
      currentUserId: uid,
      lowerRange: 18,
      upperRange: 99,
    };

    console.log('Calling searchItineraries...');
    const searchRes = await callCallable('searchItineraries', idToken, searchPayload);
    console.log('searchItineraries HTTP status:', searchRes.status);
    console.log('searchItineraries body summary:', JSON.stringify(searchRes.json?.data?.data?.slice(0, 5) || [], null, 2));

    const found = (searchRes.json?.data?.data || []).find(it => it.destination === destination || it.id === createdId);
    console.log('Found created itinerary in search:', !!found);

    // Delete itinerary
    if (!createdId) {
      console.warn('Unable to determine created itinerary id; skipping delete');
    } else {
      console.log('Calling deleteItinerary for id:', createdId);
      const deleteRes = await callCallable('deleteItinerary', idToken, { id: createdId });
      console.log('deleteItinerary HTTP status:', deleteRes.status);
      console.log('deleteItinerary body:', JSON.stringify(deleteRes.json, null, 2));
      if (!deleteRes.json?.data?.success) {
        throw new Error('deleteItinerary failed: ' + JSON.stringify(deleteRes.json));
      } else {
        console.log('Successfully deleted itinerary', createdId);
      }
    }

    console.log('CRUD test completed successfully');
  } catch (err) {
    console.error('ERROR in CRUD test:', err.message || err);
    console.error(err.stack || '');
    process.exit(2);
  }
})();
