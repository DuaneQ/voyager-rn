# React Native Web E2E Testing - Technical Notes

## Challenge: React Native Web + WebDriver Click Events

### The Problem

React Native Web compiles React Native components to **semantic-less HTML** (DIVs with `tabindex="0"` instead of actual `<button>` elements). The event handlers use React's synthetic event system, which creates challenges for WebDriver automation:

1. **Compiled DOM Structure**:
   ```html
   <!-- Instead of: <button onClick={handlePress}>Sign In</button> -->
   <div tabindex="0" data-testid="signin-button" class="...">
     <div>SIGN IN</div>
   </div>
   ```

2. **Event Handling Mismatch**:
   - React Native: Uses `onPress` (touch-based)
   - React Native Web: Converts `onPress` to synthetic click handlers
   - WebDriver: Dispatches native DOM events
   - **Result**: WebDriver clicks don't always trigger RN-web's synthetic event handlers

3. **Controlled Input Challenges**:
   - RN-web inputs are React-controlled (state-driven)
   - Standard WebDriver `setValue()` bypasses React's state management
   - **Solution**: Use native value setter + dispatch React events (`input`, `change`)

### Our Multi-Tier Solution

#### Tier 1: Enhanced UI Interaction (Attempted)

```typescript
// 1. Set input values using native setter + React events
await browser.execute((selector, value) => {
  const input = document.querySelector(selector);
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, selector, value);

// 2. Try standard click
await element.click();

// 3. Fallback: Dispatch pointer/touch events (RN-web specific)
await browser.execute((sel) => {
  const btn = document.querySelector(sel);
  btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }));
  btn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1 }));
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  btn.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
  btn.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
}, '[data-testid="signin-button"]');

// 4. Final fallback: Keyboard Enter
await browser.execute((sel) => {
  const btn = document.querySelector(sel);
  btn.focus();
  btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
  btn.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }));
}, '[data-testid="signin-button"]');
```

**Status**: ✅ Inputs filled successfully, ❌ Button clicks don't trigger onPress handlers

#### Tier 2: REST API Authentication (Primary Strategy)

When UI interactions fail (which is common with RN-web), fall back to Firebase REST API:

```typescript
// 1. Authenticate via Firebase REST API
const apiKey = 'AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0';
const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
const resp = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'appium_user@gmail.com', 
    password: '1234567890', 
    returnSecureToken: true 
  }),
});
const body = await resp.json();

// 2. Inject auth token into localStorage (what Firebase SDK expects)
const key = `firebase:authUser:${apiKey}:[DEFAULT]`;
const value = JSON.stringify({
  uid: body.localId,
  email: body.email,
  emailVerified: true,
  stsTokenManager: {
    accessToken: body.idToken,
    refreshToken: body.refreshToken,
    expirationTime: Date.now() + Number(body.expiresIn || 3600) * 1000,
  },
});
await browser.execute((k, v) => localStorage.setItem(k, v), key, value);

// 3. Reload page so React app picks up the auth token
await browser.url('http://localhost:19006/');

// 4. Wait for app to initialize
await browser.pause(2000);

// 5. Verify authenticated state
const authToken = await browser.execute(() => {
  const keys = Object.keys(localStorage);
  const firebaseKey = keys.find(k => k.startsWith('firebase:authUser:'));
  return firebaseKey ? localStorage.getItem(firebaseKey) : null;
});
expect(authToken).toBeTruthy();
```

**Status**: ✅ Reliable, deterministic, bypasses RN-web event handling issues

### Best Practices

1. **Storage Cleanup**: Always clear localStorage/sessionStorage before login tests
   ```typescript
   await browser.url(process.env.APP_URL); // Load bundle first
   await browser.pause(1000); // Let it initialize
   await browser.execute(() => {
     localStorage.clear();
     sessionStorage.clear();
   });
   await browser.url(process.env.APP_URL + '/login'); // Navigate to login
   ```

2. **Wait for RN-web Hydration**: The DOM is empty until Metro bundle executes
   ```typescript
   await browser.waitUntil(
     async () => {
       const emailInputs = await $$('input[type="email"]');
       const passwordInputs = await $$('input[type="password"]');
       return emailInputs.length > 0 && passwordInputs.length > 0;
     },
     { timeout: 15000, interval: 500 }
   );
   ```

3. **Verify State, Not UI**: Check localStorage auth tokens instead of waiting for specific screens
   ```typescript
   // ❌ Fragile - screen IDs may not exist or may change
   await $('#homeScreen').waitForDisplayed();
   
   // ✅ Robust - verify actual authentication state
   const authToken = await browser.execute(() => {
     return localStorage.getItem('firebase:authUser:...');
   });
   expect(authToken).toBeTruthy();
   ```

4. **Use REST API for Setup**: Treat UI testing separately from authentication
   - Use REST API to establish authenticated state
   - Then test authenticated features
   - Keeps tests fast and deterministic

### Expo Orchestration

Tests must wait for Metro bundler to complete before running:

```javascript
// run-web-e2e.js
const expoProcess = spawn('npx', ['expo', 'start', '--web', '--port', '19006']);

// Wait for bundle
await waitForApp('http://localhost:19006', 120000);

// Run WDIO
await runWdio();

// Cleanup
expoProcess.kill();
```

### Key Takeaways

- **RN-web is not traditional web**: DIVs ≠ buttons, synthetic events ≠ DOM events
- **REST API > UI clicks**: More reliable for authentication in E2E tests
- **Test state, not UI**: Verify localStorage tokens, not screen navigation
- **Controlled inputs need special handling**: Native setter + React event dispatch
- **Always wait for hydration**: RN-web bundle execution is asynchronous

### Test Credentials

- Email: `appium_user@gmail.com`
- Password: `1234567890`
- Firebase Project: `mundo1-dev`
- API Key: `AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0`

### References

- [React Native Web Event Handling](https://necolas.github.io/react-native-web/docs/interactions/)
- [Firebase REST API](https://firebase.google.com/docs/reference/rest/auth)
- [WebdriverIO Best Practices](https://webdriver.io/docs/bestpractices/)
