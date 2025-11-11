# Testing Cloud Functions - Quick Reference

## Testing Deployed Functions with curl

### getUserProfile

```bash
curl -X POST "https://us-central1-mundo1-dev.cloudfunctions.net/getUserProfile" \
  -H "Content-Type: application/json" \
  -d '{"data":{"userId":"Frj7COBIYEMqpHvTI7TQDRdJCwG3"}}'
```

**Expected Response (without auth):**
```json
{"error":{"message":"Unauthenticated","status":"UNAUTHENTICATED"}}
```

### updateUserProfile

```bash
curl -X POST "https://us-central1-mundo1-dev.cloudfunctions.net/updateUserProfile" \
  -H "Content-Type: application/json" \
  -d '{"data":{"userId":"test123","updates":{"username":"testuser"}}}'
```

**Expected Response (without auth):**
```json
{"error":{"message":"User must be authenticated","status":"UNAUTHENTICATED"}}
```

### createUserProfile

```bash
curl -X POST "https://us-central1-mundo1-dev.cloudfunctions.net/createUserProfile" \
  -H "Content-Type: application/json" \
  -d '{"data":{"userId":"test123","profile":{"username":"testuser"}}}'
```

**Expected Response (without auth):**
```json
{"error":{"message":"User must be authenticated","status":"UNAUTHENTICATED"}}
```

## Testing with Authentication

To test with a real authenticated user, you need to:

1. Get an ID token from Firebase Auth (via REST API or SDK)
2. Pass it in the Authorization header:

```bash
# Get ID token first (example using Firebase REST API)
ID_TOKEN="your-firebase-id-token-here"

curl -X POST "https://us-central1-mundo1-dev.cloudfunctions.net/getUserProfile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ID_TOKEN" \
  -d '{"data":{"userId":"your-user-id"}}'
```

**Expected Response (with valid auth):**
```json
{
  "result": {
    "success": true,
    "profile": {
      "uid": "user-id",
      "username": "username",
      "email": "user@example.com",
      ...
    }
  }
}
```

## Verification Checklist

✅ Function is deployed  
✅ Function rejects unauthenticated requests  
✅ Function accepts authenticated requests (when ID token provided)  
✅ Function returns expected data structure  
✅ Error messages are clear and follow Firebase patterns  

## Common Issues

### "Unauthenticated" error
- **Cause**: No Authorization header or invalid/expired ID token
- **Fix**: Ensure you're passing a valid Firebase ID token in the Authorization header

### "User must be authenticated" error  
- **Cause**: The callable function received a request without auth context
- **Fix**: Sign in with Firebase Auth SDK before calling the function, OR pass ID token manually

### "Missing or insufficient permissions" error
- **Cause**: Trying to access Firestore directly without auth (should use Cloud Functions instead)
- **Fix**: Use the RPC functions (getUserProfile, updateUserProfile, createUserProfile) instead of direct Firestore access

## Integration Tests

See `src/__tests__/integrations/SearchPage.integration.test.tsx` for examples of how to mock and test callable functions:

```typescript
import { httpsCallable } from 'firebase/functions';

const getUserProfile = httpsCallable(functions, 'getUserProfile');
const result = await getUserProfile({ userId: 'test-user-123' });
```

## Production Deployment

Functions are deployed to:
- **Project**: mundo1-dev (development)
- **Region**: us-central1
- **Runtime**: Node.js 20

To deploy updates:
```bash
cd voyager-pwa/functions
npm run build
firebase deploy --only functions:getUserProfile,functions:updateUserProfile,functions:createUserProfile
```
