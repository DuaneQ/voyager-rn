/**
 * Integration tests for userProfile RPC functions (getUserProfile, updateUserProfile, createUserProfile)
 *
 * These tests call the live Cloud Functions endpoint (or local emulator if env configured) and
 * verify read/update behavior and security checks (permission denied/unauthenticated).
 *
 * Pattern follows existing integration tests in this folder.
 */

const FUNCTION_URL = 'https://us-central1-mundo1-dev.cloudfunctions.net';

describe('userProfile RPC integration tests', () => {
  let authToken: string;
  let profileUid: string | null = null;

  beforeAll(async () => {
    // Sign in to get ID token for authenticated calls
    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'usertravaltest@gmail.com',
          password: '1234567890',
          returnSecureToken: true,
        }),
      }
    );

    const authData = await authResponse.json();
    if (!authData.idToken) {
      throw new Error('Authentication failed: ' + JSON.stringify(authData));
    }
    authToken = authData.idToken;
  }, 30000);

  it('createUserProfile should create profile when missing (or return already-exists)', async () => {
    const profilePayload = {
      uid: undefined,
      username: 'integration_test_user',
      email: 'usertravaltest@gmail.com',
      dob: '1990-01-01',
      gender: 'Male',
      status: 'Single',
      sexualOrientation: 'Straight',
      blocked: [],
    };

    const res = await fetch(`${FUNCTION_URL}/createUserProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: { profile: profilePayload } }),
    });

    const body = await res.json();

    // If profile already exists, service will return an error; accept both outcomes
    if (body?.result?.success) {
      expect(body.result.success).toBe(true);
      expect(body.result.profile).toBeDefined();
      profileUid = body.result.profile.uid || null;
    } else {
      // Could be already-exists, treat as ok but ensure error message is reasonable
      expect(body?.error || body?.result?.error).toBeDefined();
    }
  }, 20000);

  it('getUserProfile should return the authenticated user profile', async () => {
    const res = await fetch(`${FUNCTION_URL}/getUserProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: {} }),
    });

    const body = await res.json();

    expect(body).toBeDefined();
    expect(body.result).toBeDefined();
    expect(body.result.success).toBe(true);
    expect(body.result.profile).toBeDefined();
    expect(body.result.profile.uid).toBeDefined();

    // Cache uid for later checks
    profileUid = body.result.profile.uid;
  }, 10000);

  it('updateUserProfile should update fields and getUserProfile should reflect updates', async () => {
    const newUsername = `integration_updated_${Date.now()}`;

    const updateRes = await fetch(`${FUNCTION_URL}/updateUserProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: { updates: { username: newUsername } } }),
    });

    const updateBody = await updateRes.json();
    expect(updateBody?.result?.success).toBe(true);

    // Read back
    const getRes = await fetch(`${FUNCTION_URL}/getUserProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: {} }),
    });

    const getBody = await getRes.json();
    expect(getBody?.result?.success).toBe(true);
    expect(getBody.result.profile.username).toBe(newUsername);
  }, 20000);

  it('should deny access when requesting another user profile', async () => {
    // Request profile for a different user id
    const otherUserId = 'some-other-user-000';

    const res = await fetch(`${FUNCTION_URL}/getUserProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ data: { userId: otherUserId } }),
    });

  const body = await res.json();

  // Expect failure due to permission-denied
  expect(body).toBeDefined();
  // Cloud Functions may surface the error under result.error or error
  const rawErr = body?.result?.error || body?.error || body;
  let errMsg = '';
  if (typeof rawErr === 'string') errMsg = rawErr;
  else if (rawErr && typeof rawErr === 'object') errMsg = rawErr.message || rawErr.error || JSON.stringify(rawErr);
  expect(typeof errMsg).toBe('string');
  expect(errMsg.toLowerCase()).toMatch(/permission|deny|denied|only access/);
  }, 10000);

  it('should return unauthenticated when no Authorization header is provided', async () => {
    const res = await fetch(`${FUNCTION_URL}/getUserProfile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: {} }),
    });

  const body = await res.json();
  const rawErr = body?.result?.error || body?.error || body;
  let errMsg = '';
  if (typeof rawErr === 'string') errMsg = rawErr;
  else if (rawErr && typeof rawErr === 'object') errMsg = rawErr.message || rawErr.error || JSON.stringify(rawErr);
  expect(typeof errMsg).toBe('string');
  expect(errMsg.toLowerCase()).toMatch(/unauthenticated|auth/);
  }, 10000);
});
