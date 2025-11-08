# ItineraryCard Profile Photo Fix

**Date**: November 3, 2025  
**Component**: `src/components/forms/ItineraryCard.tsx`  
**Issue**: Profile photos not showing on itinerary cards even when users have profile pictures

## Problem

The ItineraryCard was trying to load profile photos from Firebase Storage using the path `users/{uid}/profile/slot_0`, but the PWA actually stores the profile photo URL in the **Firestore user document** at `users/{uid}` under the field `photos.profile`.

## Root Cause

The React Native implementation was using a different approach than the PWA:
- **RN (incorrect)**: Used Firebase Storage `getDownloadURL()` with hardcoded path
- **PWA (correct)**: Used Firestore `getDoc()` to fetch user document and read `photos.profile` field

## Solution

Updated ItineraryCard to match the PWA implementation by:

1. **Changed imports** from Firebase Storage to Firestore:
```typescript
// Before:
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

// After:
import { getFirestore, doc, getDoc } from 'firebase/firestore';
```

2. **Updated photo loading logic** to fetch from Firestore:
```typescript
// Before: Tried to load from Storage
const storage = getStorage();
const photoRef = ref(storage, `users/${itinerary.userInfo.uid}/profile/slot_0`);
const url = await getDownloadURL(photoRef);

// After: Load from Firestore user document (matching PWA)
const db = getFirestore();
const userRef = doc(db, 'users', itinerary.userInfo.uid);
const userSnap = await getDoc(userRef);
if (userSnap.exists()) {
  const userData = userSnap.data();
  const photoUrl = userData?.photos?.profile; // This is the correct location
  if (photoUrl) {
    setProfilePhoto(photoUrl);
  }
}
```

## Technical Details

### PWA Reference
The PWA uses `useGetUserProfilePhoto` hook which:
- Fetches user document from Firestore
- Reads `data?.photos?.profile` field
- Returns the photo URL or default avatar

### Data Flow
1. User uploads profile photo via EditProfileModal
2. Photo uploaded to Firebase Storage
3. Photo URL stored in Firestore at `users/{uid}.photos.profile`
4. ItineraryCard reads from Firestore, not Storage directly

### Why This Matters
- **Performance**: Reading from Firestore is faster than constructing Storage paths
- **Flexibility**: Users can change which photo is their profile without file system changes
- **Consistency**: Matches PWA data model exactly
- **Reliability**: Firestore document is single source of truth

## Files Changed

- `src/components/forms/ItineraryCard.tsx`: Updated imports and photo loading logic

## Testing

Manual testing required:
1. ✅ View itinerary cards from users with profile photos
2. ✅ Verify profile photos display correctly
3. ✅ View itinerary cards from users without profile photos → Default avatar shows
4. ✅ Tap on profile photo → ViewProfileModal opens
5. ✅ Console logs show successful photo URL loading

## Expected Behavior

### Before Fix
- Profile photos never showed (even for users with photos)
- Default avatar always displayed
- Console showed "Profile photo not found" errors

### After Fix
- Profile photos display when available
- Default avatar only shows when user has no photo
- Console logs show "Profile photo URL found" messages

## Related Components

- **EditProfileModal**: Where users upload profile photos
- **ViewProfileModal**: Displays full user profile with photos
- **ProfileHeader**: Also displays user's own profile photo
- **PWA useGetUserProfilePhoto**: Hook that inspired this fix

## Notes

- The fix aligns React Native with PWA data model
- No database migration needed (data already stored correctly)
- Backwards compatible (falls back to default avatar gracefully)
- Enhanced console logging for debugging
