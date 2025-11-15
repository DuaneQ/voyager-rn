# Quick Reference - Cloud Functions Authentication

## Problem (Resolved ✅)
App was getting `FirebaseError: User must be authenticated` when calling Cloud Functions.

## Solution Summary
1. Fixed race condition in `FirebaseAuthService.ts` - sync Auth SDK BEFORE notifying listeners
2. Granted IAM permission for service account to create custom tokens
3. Used `fetch()` with manual Authorization header for `generateCustomToken` call

## Test Verification
```bash
./test-live-auth-flow.sh
```
All tests pass ✅

## Code Changes

### FirebaseAuthService.ts
```typescript
// BEFORE (broken)
this.notifyAuthStateChanged(user);
await this.syncWithAuthSDK(user.idToken);

// AFTER (fixed)
await this.syncWithAuthSDK(user.idToken);
this.notifyAuthStateChanged(user);
```

### IAM Permission
```bash
gcloud projects add-iam-policy-binding mundo1-dev \
  --member="serviceAccount:296095212837-compute@developer.gserviceaccount.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

## Expected Log Output (Success)
```
LOG  🔐 Signing in user: feedback@travalpass.com
LOG  [FirebaseAuthService] Syncing with Firebase Auth SDK...
LOG  ✅ [FirebaseAuthService] Successfully synced with Firebase Auth SDK
LOG  [UserProfileContext] User changed: Frj7COBIYEMqpHvTI7TQDRdJCwG3
LOG  [UserProfileContext] Fetching user profile via Cloud Function...
LOG  ✅ Profile loaded successfully
```

## Troubleshooting
If still seeing errors:
1. Clear Metro cache: `npm start -- --clear`
2. Reinstall app (clear AsyncStorage)
3. Run test script: `./test-live-auth-flow.sh`
4. Check logs for sync completion before profile fetch

## Full Documentation
See `AUTH_FIX_COMPLETE.md` for:
- Detailed root cause analysis
- Complete authentication flow diagram
- All code changes with explanations
- Manual cURL test commands
