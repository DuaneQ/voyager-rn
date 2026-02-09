# Video Share Broken — White Screen Investigation

**Date:** February 9, 2026  
**Status:** ROOT CAUSE CONFIRMED — Fixed  
**Reporter:** User observed shared video links open to white screen  
**Affected:** Production (travalpass.com) video share links — white screen instead of video player

---

## Problem Statement

When sharing a video link (e.g., `https://travalpass.com/video-share/{videoId}`), the page opens to a **white screen** showing the SPA's `index.html` instead of the server-rendered video player page. The `videoShare` Cloud Function is **not being invoked** — the request never reaches it.

Public videos should be viewable by anyone, even without login.

---

## ROOT CAUSE (CONFIRMED)

**Two competing Firebase Hosting deployments + inconsistent share URL generation.**

### Problem 1: voyager-RN firebase.json missing function rewrites

Both `voyager-RN` and `voyager-pwa` deploy to the **same** Firebase Hosting site (`mundo1-1`, `channelId: live`). Each uses its own `firebase.json`:

**voyager-pwa/firebase.json** (has correct rewrites):
```json
"rewrites": [
  { "source": "/share-itinerary/**", "function": "itineraryShare" },
  { "source": "/video-share/**", "function": "videoShare" },
  { "source": "/video/**", "function": "videoShare" },
  { "source": "**", "destination": "/index.html" }
]
```

**voyager-RN/firebase.json** (ONLY had catch-all — FIXED):
```json
"rewrites": [
  { "source": "**", "destination": "/index.html" }
]
```

When voyager-RN deployed last, it **overwrote** the PWA's hosting config, removing all function rewrites. Every URL now hits the catch-all and serves `index.html`.

### Problem 2: Inconsistent share URL generation

**Itinerary share** in `src/components/modals/ShareAIItineraryModal.tsx` uses **direct Cloud Function URL**:
```typescript
const baseUrl = getCloudFunctionUrl('itineraryShare');
// → https://us-central1-mundo1-1.cloudfunctions.net/itineraryShare
const shareUrl = `${baseUrl}/share-itinerary/${itinerary.id}`;
```
This **bypasses Firebase Hosting entirely** → calls the function directly → **WORKS**.

**Video share** in `src/utils/videoSharing.ts` used **hardcoded hosting URL** (FIXED):
```typescript
const BASE_URL = 'https://travalpass.com'; // ← Hardcoded!
return `${BASE_URL}/video-share/${video.id}`;
```
This goes through Firebase Hosting → catch-all rewrite → `index.html` → **WHITE SCREEN**.

### Why itinerary share worked but video share didn't

| Feature | URL Pattern | Routing | Result |
|---------|------------|---------|--------|
| Itinerary share | `us-central1-mundo1-1.cloudfunctions.net/itineraryShare/share-itinerary/{id}` | Direct function call | ✅ Works |
| Video share | `travalpass.com/video-share/{id}` | Hosting → catch-all → index.html | ❌ White screen |

The difference: itinerary share bypasses hosting; video share depends on hosting rewrites that were wiped.

---

## THE FIX (Applied)

### Fix 1: Video share URL generation (immediate fix)
Changed `src/utils/videoSharing.ts` to use direct Cloud Function URL, matching itinerary share pattern:

```typescript
// BEFORE (broken):
const BASE_URL = 'https://travalpass.com';
return `${BASE_URL}/video-share/${video.id}`;

// AFTER (fixed):
import { getCloudFunctionUrl } from '../config/firebaseConfig';
const baseUrl = getCloudFunctionUrl('videoShare');
return `${baseUrl}/video-share/${video.id}`;
```

### Fix 2: Firebase Hosting rewrites (proper hosting fix)
Added function rewrites to `voyager-RN/firebase.json` so future hosting deployments include proper routing:

```json
"rewrites": [
  { "source": "/share-itinerary/**", "function": "itineraryShare" },
  { "source": "/video-share/**", "function": "videoShare" },
  { "source": "/video/**", "function": "videoShare" },
  { "source": "**", "destination": "/index.html" }
]
```

### Deployment notes:
- **Fix 1** takes effect on next mobile app build (RN generates correct share URLs)
- **Fix 2** takes effect on next push to main (hosting rewrite config deployed)
- Both fixes together ensure: (a) new share links work immediately via direct URL, (b) old travalpass.com links also work after hosting redeploy

---

## Evidence Chain

### 1. Function Export — ✅ CORRECT
- `videoShare` exported from `functions/src/index.ts` at line 969

### 2. Function Deployment — ✅ DEPLOYED
- `firebase functions:list --project mundo1-1`: `videoShare | v1 | https | us-central1 | nodejs20`

### 3. Function Direct Test — ✅ WORKS
- `curl https://us-central1-mundo1-1.cloudfunctions.net/videoShare/video-share/test123` → Function responds correctly
- Proves: function code works fine, problem is routing

### 4. Dev Hosting Test — ✅ WORKS
- `curl https://mundo1-dev.web.app/video-share/test123` → Function HTML returned
- Dev env still has PWA's firebase.json with proper rewrites

### 5. Prod Hosting Test — ❌ BROKEN
- `curl https://mundo1-1.web.app/video-share/test123` → SPA `index.html` returned
- `curl https://travalpass.com/video-share/test123` → SPA `index.html` returned
- `curl https://travalpass.com/share-itinerary/test123` → SPA `index.html` returned (ALSO broken via hosting!)
- Proves: ALL function rewrites are missing from production hosting

### 6. Deployment Workflows — ✅ BOTH DEPLOY TO SAME SITE
- `voyager-pwa/.github/workflows/firebase-hosting-merge.yml`: deploys to `mundo1-1`, `channelId: live`
- `voyager-RN/.github/workflows/firebase-hosting-merge.yml`: deploys to `mundo1-1`, `channelId: live`
- Whichever deployed last controls the hosting config — last deploy from voyager-RN wiped function rewrites

### 7. Share URL Generation — ROOT CAUSE CONFIRMED
- `ShareAIItineraryModal.tsx` line 39: `getCloudFunctionUrl('itineraryShare')` → direct URL → works
- `videoSharing.ts` line 11: `const BASE_URL = 'https://travalpass.com'` → hosting URL → broken

---

## Files Changed
- **`src/utils/videoSharing.ts`** — Changed `generateVideoShareUrl()` to use `getCloudFunctionUrl('videoShare')` instead of hardcoded `travalpass.com`
- **`firebase.json`** — Added function rewrites for `/share-itinerary/**`, `/video-share/**`, `/video/**` before the catch-all

## Files Involved (Reference)
- **Function:** `voyager-pwa/functions/src/videoSharing.ts` — Express app serving video share pages
- **Function export:** `voyager-pwa/functions/src/index.ts` line 969
- **RN share modal:** `src/components/modals/ShareAIItineraryModal.tsx` — uses `getCloudFunctionUrl()` (correct pattern)
- **RN video sharing:** `src/utils/videoSharing.ts` — was using hardcoded URL (fixed)
- **RN hosting config:** `firebase.json` — was missing function rewrites (fixed)
- **PWA hosting config:** `voyager-pwa/firebase.json` — has correct rewrites (reference)
- **RN deploy workflow:** `.github/workflows/firebase-hosting-merge.yml` — deploys to `mundo1-1`
- **PWA deploy workflow:** `voyager-pwa/.github/workflows/firebase-hosting-merge.yml` — also deploys to `mundo1-1`

---

## Timeline
| Date | Event |
|------|-------|
| Jul 20, 2025 | Video sharing rewrites added to PWA firebase.json |
| Feb 3, 2026 | Last dev hosting deploy (mundo1-dev) |
| Feb 6, 2026 | Last prod hosting deploy (mundo1-1) — likely from voyager-RN, wiping function rewrites |
| Feb 9, 2026 | User reports video share broken — white screen |
| Feb 9, 2026 | Investigation: initial theory (service worker) — WRONG |
| Feb 9, 2026 | User correction: PWA service worker is irrelevant — RN web replaced the PWA |
| Feb 9, 2026 | Root cause confirmed: RN firebase.json missing rewrites + hardcoded share URL |
| Feb 9, 2026 | Fix applied: direct function URL + firebase.json rewrites added |

---

## Investigation Steps (in order)
1. ✅ Checked function export in `index.ts` — correct
2. ✅ Checked PWA firebase.json rewrites — correct (but irrelevant if RN deployed last)
3. ✅ Checked `firebase functions:list` — function deployed
4. ✅ Curl tested `travalpass.com/video-share/test123` — returns SPA HTML (broken)
5. ✅ Curl tested direct function URL — works correctly
6. ✅ Curl tested `mundo1-dev.web.app/video-share/test123` — works (PWA still deployed there)
7. ✅ Curl tested `mundo1-1.web.app/video-share/test123` — returns SPA HTML (broken)
8. ❌ Investigated PWA service worker — WRONG PATH (user corrected: PWA replaced by RN web)
9. ✅ Examined voyager-RN `firebase.json` — found missing function rewrites
10. ✅ User challenged: "If that's the problem, why does itinerary share work?"
11. ✅ Curl tested `travalpass.com/share-itinerary/test123` — ALSO returns SPA HTML (both broken via hosting!)
12. ✅ Compared share URL generation: itinerary uses direct function URL, video uses travalpass.com
13. ✅ Confirmed both workflows deploy to same hosting site (`mundo1-1`, `channelId: live`)
14. ✅ Root cause confirmed — applied both fixes

---

## Lessons Learned
1. **When two repos deploy to the same hosting site**, the last deploy's `firebase.json` wins — keep rewrites in sync
2. **Consistent URL patterns matter** — itinerary share used direct function URL (worked), video share used hosting URL (broke)
3. **The PWA is no longer the web frontend** — the voyager-RN web build has replaced it. Only the PWA's Cloud Functions are still relevant.
4. **Test the actual URL path, not just the function** — the function worked; the routing to it was broken
5. **Document everything** — wrong theories must be crossed out, not deleted, so time isn't wasted revisiting them
