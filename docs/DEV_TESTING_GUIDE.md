# Places API Logging - Dev Testing Guide

**Date**: Feb 16, 2026 15:30 UTC  
**Status**: ✅ Ready for testing in dev environment

---

## 🎯 What's Ready for Testing

### 1. Enhanced PlacesAutocomplete Logging ✅

When you type in the destination field (AI Generation Modal or Add Itinerary Modal), you'll now see **high-visibility console logs**:

**While Typing**:
```
═════════════════════════════════════════════
📱 [PLACES AUTOCOMPLETE - MOBILE] Searching...
   Query: "Par"
   Session Token: YES ✅ (Grouped billing)
   Token Value: 4b8e7f2a-3d1c-4e9b-9a8b-7c6d5e4f3a2b
   Component: PlacesAutocomplete (mobile)
═════════════════════════════════════════════
```

**When You Select a Place**:
```
═════════════════════════════════════════════
✅ [PLACES AUTOCOMPLETE] Place Selected!
   Selected: "Paris, France"
   Place ID: ChIJD7fiBh9u5kcRYJSMaMOCCwQ
   🔒 Ending session token (billing session complete)
═════════════════════════════════════════════
```

### 2. verifyPlaces Function Removed ✅

**Status**: Commented out in `functions/src/index.ts` line 928-929

```typescript
// REMOVED: verifyPlaces function (not used by frontend, causing unnecessary API costs)
// export { verifyPlaces } from './verifyPlaces';
```

⚠️ **NOTE**: The function removal will deploy once we do a full functions deployment. For now, it's commented out but not yet deployed to dev. The PlacesAutocomplete logging is the priority.

---

## 📝 Testing Instructions

### Step 1: Open React Native App in Dev Mode

```bash
cd /Users/icebergslim/projects/voyager-RN
npx expo start
```

### Step 2: Open Developer Console

- **iOS Simulator**: Cmd+D → Remote JS Debugging → Open Chrome DevTools
- **Android Emulator**: Cmd+M → Remote JS Debugging → Open Chrome DevTools
- **Web**: Just open browser console (F12)

### Step 3: Navigate to AI Generation Modal

1. Open the app
2. Navigate to the screen with "Generate AI Itinerary" button
3. Click to open the modal
4. **Find the destination input field**

### Step 4: Type a Destination

Type slowly to see each autocomplete request:
- Type: "P" → see log
- Type: "Pa" → see log
- Type: "Par" → see log
- Type: "Pari" → see log
- Type: "Paris" → see log

### Step 5: Watch the Console Logs

You should see:
1. **Each keystroke logged** with:
   - Query text
   - Session token status (YES ✅ or NO ❌)
   - Token value
   - Component name

2. **Session token consistency**:
   - First keystroke creates a NEW token
   - Subsequent keystrokes REUSE the same token
   - Token format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`

3. **When you select "Paris, France"**:
   - Selection log appears
   - Session token is cleared (billing session ends)

### Step 6: Try Again

1. Clear the field
2. Type a different destination (e.g., "London")
3. Verify a **NEW session token** is created

---

## 🔍 What to Look For

### ✅ GOOD (Cost Optimized)
- Session Token: **YES ✅** on all requests
- Same token value for all keystrokes in one search
- Token cleared when place selected

**Cost**: **$0.017 per search** (grouped billing)

### ❌ BAD (Cost Spike)
- Session Token: **NO ❌** on requests
- Different token for each keystroke (or no token at all)

**Cost**: **$0.00283 per keystroke** (could be 5-10x more expensive!)

---

## 📊 Expected vs Actual

| Metric | Expected | What to Check |
|--------|----------|---------------|
| Session Token | YES ✅ | Every log should show YES |
| Token Consistency | Same token | Token value should NOT change between keystrokes |
| Token Cleared | On selection | New search should get new token |
| API Calls | Only after 300ms debounce | Typing "Paris" = 5 logs (not 1 per character) |

---

## 🚨 Red Flags

If you see any of these, **STOP and tell me**:

1. ❌ **Session Token: NO** on any request
2. ❌ **Token value changes** between keystrokes in same search
3. ❌ **Token NOT cleared** after place selection
4. ❌ **No logs appearing** when typing (logging broken)
5. ❌ **Logs appear but no session token** (token generation broken)

---

## 📸 What to Share

After testing, please share:

1. **Screenshot or copy/paste of console logs** showing:
   - Multiple keystrokes in one search
   - Place selection log
   - Session token values

2. **Number of API calls** for typing "Paris, France" and selecting it:
   - Expected: **5-6 calls** (one per letter after 300ms debounce)
   - Each call should have **SAME session token**

3. **Any errors or warnings** in the console

---

## 🔧 Troubleshooting

### No Logs Appearing
**Check**: Is the app running in dev mode? Logs only appear in development.

**Fix**: Make sure you're using `npx expo start` (not production build)

### Session Token Always "NO"
**Check**: Look for errors in the `getSessionToken()` function

**Fix**: We'll need to debug the token generation logic

### Different Token Per Keystroke
**Check**: Is `currentSessionToken` being preserved between calls?

**Fix**: This could indicate a module-level variable issue

### Token Not Clearing
**Check**: Does the selection log show "Ending session token"?

**Fix**: The `handleClearSession()` callback might not be firing

---

## 📝 After Testing - What to Capture

Once you generate an AI itinerary in dev, I'll need:

1. **All console logs** from the destination field (copy/paste)
2. **Cloud function logs** from the AI generation:
   ```bash
   firebase functions:log --project mundo1-dev --lines 200 | grep -E "(Places API|generateFullItinerary|searchAccommodations)"
   ```

This will show:
- ✅ Whether autocomplete used session tokens
- ✅ How many searchAccommodations calls were made
- ✅ Total API cost for the generation

---

## 🎯 Success Criteria

**Testing is successful if**:
1. ✅ Console logs appear when typing
2. ✅ All logs show "Session Token: YES ✅"
3. ✅ Same token used for all keystrokes
4. ✅ Token cleared on place selection
5. ✅ No errors in console

**Then we'll proceed to**:
- Generate full AI itinerary in dev
- Capture cloud function logs
- Calculate exact cost per generation
- Deploy verifyPlaces removal

---

**Ready when you are!** 🚀

**Files Modified**:
- ✅ `voyager-RN/src/components/common/PlacesAutocomplete.tsx` (enhanced logging)
- ✅ `voyager-pwa/functions/src/index.ts` (verifyPlaces commented out)
