/**
 * seed-itinerary-feed.js
 *
 * Seeds Firestore `itineraries` collection with:
 *   1. One itinerary OWNED by the test user (Support) — shows up in their dropdown
 *   2. Six itineraries owned by FAKE users going to the same destination — returned
 *      by searchItineraries so the sponsored interstitial ad fires after every 3 actions
 *
 * Usage:
 *   node scripts/seed-itinerary-feed.js
 *   node scripts/seed-itinerary-feed.js --clean   (deletes all seeded docs first)
 *
 * Project: mundo1-dev
 * Test user: Support (I8EPpdXmmNULf5yvvY44OOrRsuh2)
 */

const admin = require('firebase-admin');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT = path.resolve(__dirname, '../mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json');
const TEST_USER_ID = 'I8EPpdXmmNULf5yvvY44OOrRsuh2';
const TEST_USER_INFO = {
  uid: TEST_USER_ID,
  username: 'Support',
  email: 'support@travalpass.com',
  dob: '2001-01-22',
  gender: 'Male',
  status: 'Single',
  sexualOrientation: 'Heterosexual',
  blocked: [],
};

// Destination must be an exact string — other seeded docs must match exactly.
const DESTINATION = 'Paris, France';

// Future dates — overlapping range so all seed docs match the test user's itinerary
const USER_START  = '2026-04-15';
const USER_END    = '2026-04-22';
const toMs = (dateStr) => new Date(dateStr + 'T12:00:00.000Z').getTime();

// Tag prefix so we can identify and clean up seeded docs
const SEED_TAG = 'SEED_ITINERARY_FEED';

admin.initializeApp({
  credential: admin.credential.cert(SERVICE_ACCOUNT),
  projectId: 'mundo1-dev',
});

const db = admin.firestore();

// ── Seed data ────────────────────────────────────────────────────────────────

/** The test user's own itinerary (selectable from the dropdown). */
const ownerItinerary = {
  _seedTag: SEED_TAG,
  userId: TEST_USER_ID,
  destination: DESTINATION,
  startDate: USER_START,
  endDate: USER_END,
  startDay: toMs(USER_START),
  endDay: toMs(USER_END),
  description: 'Exploring the city of lights with a fellow traveler.',
  activities: ['Eiffel Tower', 'Louvre Museum', 'Seine River Cruise', 'Montmartre'],
  gender: 'No Preference',
  status: 'No Preference',
  sexualOrientation: 'No Preference',
  lowerRange: 20,
  upperRange: 45,
  age: 25,
  likes: [],
  userInfo: TEST_USER_INFO,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
};

/**
 * Six fake-user itineraries — deliberately varied across gender, relationship
 * status and sexual orientation so that the searchItineraries Firestore query
 * filters are exercised end-to-end.
 *
 * "No Preference" on a field means "show me anyone regardless of that value",
 * so those docs match ALL users.  Setting a concrete value (e.g. 'Male') means
 * that fake traveller only wants to match with Male users — useful for checking
 * that the gender filter works when the test user selects a preference.
 *
 * Campaign ad targeting (selectAds) is separate: it scores ads against the
 * userContext built from the test user's own profile, not the itinerary docs.
 */
const fakeUsers = [
  // Matches anyone (all No Preference) — baseline for ad interstitial testing
  { uid: 'fake_user_001', username: 'AlexChaudhary',  gender: 'No Preference', status: 'No Preference', sexualOrientation: 'No Preference', dob: '1995-06-15', age: 30, start: '2026-04-14', end: '2026-04-21' },
  // Only wants Female matches — tests status/orientation filter
  { uid: 'fake_user_002', username: 'SophieBlanc',    gender: 'Female',        status: 'Single',        sexualOrientation: 'Heterosexual',  dob: '1998-03-22', age: 27, start: '2026-04-16', end: '2026-04-23' },
  // No Preference gender, but filters on status
  { uid: 'fake_user_003', username: 'LucasMartinez',  gender: 'No Preference', status: 'Single',        sexualOrientation: 'No Preference', dob: '1993-11-01', age: 32, start: '2026-04-13', end: '2026-04-20' },
  // Fully open preferences — another "all audiences" doc to pad the results
  { uid: 'fake_user_004', username: 'AminaKonaté',    gender: 'No Preference', status: 'No Preference', sexualOrientation: 'No Preference', dob: '2000-07-08', age: 25, start: '2026-04-15', end: '2026-04-22' },
  // Male-only, broad orientation
  { uid: 'fake_user_005', username: 'RyoSuzuki',      gender: 'Male',          status: 'No Preference', sexualOrientation: 'No Preference', dob: '1990-02-14', age: 35, start: '2026-04-17', end: '2026-04-24' },
  // Fully open preferences — extra swipe depth for ad interval testing
  { uid: 'fake_user_006', username: 'IsabellaRossi',  gender: 'No Preference', status: 'No Preference', sexualOrientation: 'No Preference', dob: '1997-09-30', age: 28, start: '2026-04-12', end: '2026-04-19' },
];

const activitySets = [
  ['Musée d\'Orsay', 'Luxembourg Gardens', 'Montparnasse Tower'],
  ['Palace of Versailles', 'Sainte-Chapelle', 'Le Marais walk'],
  ['Notre-Dame Cathedral', 'Île de la Cité', 'Bateaux Mouches'],
  ['Père Lachaise Cemetery', 'Canal Saint-Martin', 'Belleville Graffiti Tour'],
  ['Centre Pompidou', 'Palais Royal', 'Rue Mouffetard food tour'],
  ['Musée Picasso', 'Jardin des Tuileries', 'Opéra Garnier'],
];

const descriptions = [
  'Looking for a travel buddy who loves art and history.',
  'Planning a relaxed Parisian holiday — museums and food!',
  'First time in Paris, excited to explore with someone.',
  'Solo traveler happy to team up for some excursions.',
  'Architecture enthusiast — want to visit every arrondissement.',
  'Foodie & wine lover seeking a companion for the best bistros.',
];

const matchingItineraries = fakeUsers.map((u, i) => ({
  _seedTag: SEED_TAG,
  userId: u.uid,
  destination: DESTINATION,
  startDate: u.start,
  endDate: u.end,
  startDay: toMs(u.start),
  endDay: toMs(u.end),
  description: descriptions[i],
  activities: activitySets[i],
  // Use each fake user's own preference settings so the Firestore query
  // exercises real filtering (gender/status/sexualOrientation filters).
  gender: u.gender,
  status: u.status,
  sexualOrientation: u.sexualOrientation,
  lowerRange: 20,
  upperRange: 45,
  age: u.age,
  likes: [],
  userInfo: {
    uid: u.uid,
    username: u.username,
    email: `${u.uid}@seed.travalpass.com`,
    dob: u.dob,
    gender: u.gender,
    status: u.status,
    sexualOrientation: u.sexualOrientation,
    blocked: [],
  },
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

async function clean() {
  console.log(`\n🗑  Cleaning up docs tagged ${SEED_TAG} …`);
  const snap = await db.collection('itineraries')
    .where('_seedTag', '==', SEED_TAG)
    .get();

  if (snap.empty) {
    console.log('   Nothing to clean.');
    return;
  }

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`   Deleted ${snap.size} doc(s).`);
}

async function seed() {
  console.log('\n🌱  Seeding itineraries …');
  const all = [ownerItinerary, ...matchingItineraries];
  const batch = db.batch();

  const refs = all.map((doc) => {
    const ref = db.collection('itineraries').doc();
    batch.set(ref, doc);
    return { id: ref.id, destination: doc.destination, userId: doc.userId };
  });

  await batch.commit();

  console.log(`\n✅  Seeded ${all.length} itinerary doc(s) to mundo1-dev:\n`);
  console.log(`   📌 Test user's own itinerary (selectable in dropdown):`);
  console.log(`      ID: ${refs[0].id}  —  ${DESTINATION}  ${USER_START} → ${USER_END}`);
  console.log(`\n   🔍 Matching itineraries (search results):`);
  refs.slice(1).forEach((r, i) => {
    const u = fakeUsers[i];
    console.log(`      ID: ${r.id}  —  ${u.username}  (${u.start} → ${u.end})`);
  });

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEPS (itinerary_feed ad test)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. In voyager-ads portal, create an itinerary_feed campaign
   pointing to an active ad with a square image (1:1).
   Make sure status=active, isUnderReview=false.

2. In voyager-RN (web or device), log in as Support.

3. Go to Search tab → dropdown will now show:
   "${DESTINATION}  ${USER_START} → ${USER_END}"

4. Select that itinerary — search returns 6 matches.

5. Like/Dislike 3 cards → interstitial SponsoredItineraryCard
   should appear (AD_INTERSTITIAL_INTERVAL = 3).

6. Verify:
   - [AdDelivery] fetching placement=itinerary_feed logged
   - [AdCard] mounted + impression queued + flushed
   - SponsoredItineraryCard renders with correct ad data
   - After dismissing, organic cards resume
   - After 3 more actions, next ad cycle fires

7. To clean up after testing:
   node scripts/seed-itinerary-feed.js --clean
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const isClean = process.argv.includes('--clean');
    if (isClean) {
      await clean();
    } else {
      await clean(); // always clean first to avoid duplicates on re-runs
      await seed();
    }
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  }
})();
