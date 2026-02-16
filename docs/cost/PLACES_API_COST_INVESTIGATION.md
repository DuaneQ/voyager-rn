# Google Places API Cost Spike Investigation Guide

## Overview
Comprehensive logging has been added to track all Google Places API calls across the application.

**Date of Spike**: February 9, 2026  
**Cost**: $46.72 (vs ~$20 baseline)  
**Previous Spike**: January 29, 2026 ($113, resolved by removing verifyPlaces usage)

---

## 🔍 What Has Been Logged

### Client-Side (React Native Web)
**File**: `src/utils/placesApiLogger.ts`  
**Components**:
- `PlacesAutocomplete.tsx` (web + mobile)
  - Logs each autocomplete request
  - Tracks session token usage (YES✅ = FREE, NO❌ = $0.00283/call)
  - Shows component name and query

**Console Messages**:
```
🔍 [Places API] Autocomplete: "Paris" | Session: YES✅ | Cost: $0.01700 | Component: PlacesAutocomplete (web)
🔍 [Places API] Autocomplete: "London" | Session: NO❌ | Cost: $0.00283 | Component: PlacesAutocomplete (mobile)
```

### Server-Side (Firebase Cloud Functions)
**File**: `functions/src/utils/placesApiLogger.ts`  
**Functions**:
- `searchActivities.ts` - Text Search API ($0.032/call)
- `searchAccommodations.ts` - Text Search API ($0.032/call)
- `verifyPlaces.ts` - Text Search API ($0.032/call, **should not be running**)

**Console Messages**:
```
⚠️ [Places API] TEXT SEARCH (EXPENSIVE): "restaurants in Paris" | Page: NO | MaxResults: 30 | Cost: $0.032 | Function: searchActivities
⚠️ [Places API] TEXT SEARCH (EXPENSIVE): "hotel in Paris" | Page: YES | MaxResults: 20 | Cost: $0.032 | Function: searchAccommodations
```

---

## 📊 How to Access Logs

### Firebase Console Logs
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `mundo1-1` (production)
3. Navigate to **Functions** → **Logs**
4. Filter by date: February 9, 2026
5. Search for: `[Places API]`

### Client-Side Browser DevTools
1. Open application in browser
2. Open DevTools → Console
3. Look for: `🔍 [Places API]` messages
4. Check localStorage: `placesApiUsageStats`

### Firebase CLI Logs
```bash
# View recent logs
firebase functions:log --project mundo1-1 --lines 1000

# Filter for Places API
firebase functions:log --project mundo1-1 --lines 1000 | grep "Places API"

# View specific function
firebase functions:log --only searchActivities --project mundo1-1
```

---

## 🧮 Cost Analysis Framework

### API Pricing (from Google Maps Platform)
| API | Cost per Call | Free Tier | Notes |
|-----|--------------|-----------|-------|
| **Autocomplete (Per Request)** | $0.00283 | 10k/month | Per keystroke WITHOUT session token |
| **Autocomplete (Per Session)** | $0.01700 | N/A | With session token = cheapest |
| **Text Search** | **$0.03200** | 5k/month | **MOST EXPENSIVE**, used by cloud functions |
| **Place Details** | $0.01700 | 5k/month | Expensive, currently avoided |
| **Nearby Search** | $0.03200 | 5k/month | Expensive, not currently used |

### Cost Spike Scenarios

#### Scenario 1: Session Tokens Not Working
**Symptoms**:
- Many autocomplete calls with `Session: NO❌`
- Cost: Each keystroke = $0.00283

**Example**:
- User types "Paris, France" (14 keystrokes)
- WITHOUT session token: 14 × $0.00283 = $0.0396
- WITH session token: 1 × $0.01700 = $0.0170
- **If 1000 users did this: $39.60 vs $17.00 = $22.60 extra cost**

**How to Confirm**:
```bash
# Search client-side logs for session status
cat client_logs.txt | grep "Places API" | grep "Session: NO"
```

#### Scenario 2: Text Search Volume Increase
**Symptoms**:
- Many `TEXT SEARCH (EXPENSIVE)` messages
- High AI itinerary generation volume

**Example**:
- Each AI generation: 2-4 Text Search calls (activities + accommodations + pagination)
- Cost per generation: 3 × $0.032 = $0.096

**If AI generations increased**:
- Feb 8: 100 generations = $9.60
- Feb 9: 300 generations = $28.80 (**+$19.20 spike**)

**How to Confirm**:
```bash
# Count Text Search calls on Feb 9
firebase functions:log --project mundo1-1 | grep "2026-02-09" | grep "TEXT SEARCH" | wc -l
```

#### Scenario 3: verifyPlaces Still Running (Should NOT Be)
**Symptoms**:
- `Function: verifyPlaces` messages in logs
- Batch verification calls (10+ places per itinerary)

**Example**:
- Each AI generation: 10 places verified
- Cost: 10 × $0.032 = $0.32 per generation
- **If 60 generations: $19.20 spike**

**How to Confirm**:
```bash
# Check if verifyPlaces is still being called
firebase functions:log --only verifyPlaces --project mundo1-1 | grep "2026-02-09"
```

#### Scenario 4: Excessive Pagination
**Symptoms**:
- Many `Page: YES` messages
- Multiple pages fetched per search

**Example**:
- searchActivities: 1 initial + 2 paginated = 3 calls
- Cost: 3 × $0.032 = $0.096 per search
- **Normal**: 1-2 pages
- **Abnormal**: Fetching all 3-4 pages consistently

**How to Confirm**:
```bash
# Count paginated calls
firebase functions:log --project mundo1-1 | grep "2026-02-09" | grep "Page: YES" | wc -l
```

---

## 🔎 Investigation Steps

### Step 1: Get Baseline Metrics (Normal Day vs Spike Day)
```bash
# Feb 8 (before spike)
firebase functions:log --project mundo1-1 | grep "2026-02-08" | grep "Places API" > feb8_logs.txt

# Feb 9 (spike day)
firebase functions:log --project mundo1-1 | grep "2026-02-09" | grep "Places API" > feb9_logs.txt

# Compare counts
echo "Feb 8 Text Search calls:" $(grep "TEXT SEARCH" feb8_logs.txt | wc -l)
echo "Feb 9 Text Search calls:" $(grep "TEXT SEARCH" feb9_logs.txt | wc -l)
```

### Step 2: Count API Calls by Type
```bash
# Feb 9 breakdown
echo "Autocomplete calls:" $(grep "Autocomplete" feb9_logs.txt | wc -l)
echo "Text Search calls:" $(grep "TEXT SEARCH" feb9_logs.txt | wc -l)
echo "  - searchActivities:" $(grep "searchActivities" feb9_logs.txt | wc -l)
echo "  - searchAccommodations:" $(grep "searchAccommodations" feb9_logs.txt | wc -l)
echo "  - verifyPlaces:" $(grep "verifyPlaces" feb9_logs.txt | wc -l)
```

### Step 3: Check Session Token Usage
```bash
# How many autocomplete calls are missing session tokens?
echo "Without session token:" $(grep "Session: NO" feb9_logs.txt | wc -l)
echo "With session token:" $(grep "Session: YES" feb9_logs.txt | wc -l)
```

### Step 4: Check Itinerary Generation Volume
```javascript
// Run in Firebase Console or Node.js script
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

async function countGenerations(startDate, endDate) {
  const snapshot = await db.collection('itineraries')
    .where('createdAt', '>=', new Date(startDate))
    .where('createdAt', '<=', new Date(endDate))
    .get();
  
  console.log(`Itineraries created: ${snapshot.size}`);
  
  // Count AI-generated (premium) vs manual
  let aiGenerated = 0;
  let manual = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.response?.data?.metadata?.generationType === 'ai') {
      aiGenerated++;
    } else {
      manual++;
    }
  });
  
  console.log(`  AI Generated: ${aiGenerated}`);
  console.log(`  Manual: ${manual}`);
  
  return { total: snapshot.size, aiGenerated, manual };
}

// Compare Feb 8 vs Feb 9
countGenerations('2026-02-08', '2026-02-08T23:59:59');
countGenerations('2026-02-09', '2026-02-09T23:59:59');
```

### Step 5: Calculate Actual Cost
Based on your findings:

```javascript
function calculateCost(data) {
  const costs = {
    autocompleteWithSession: 0.017,
    autocompleteNoSession: 0.00283,
    textSearch: 0.032,
    placeDetails: 0.017,
  };
  
  let totalCost = 0;
  
  // Add autocomplete costs
  totalCost += data.autocompleteWithSession * costs.autocompleteWithSession;
  totalCost += data.autocompleteNoSession * costs.autocompleteNoSession;
  
  // Add text search costs
  totalCost += data.textSearch * costs.textSearch;
  
  // Add place details costs (if any)
  totalCost += data.placeDetails * costs.placeDetails;
  
  console.log(`Estimated cost: $${totalCost.toFixed(2)}`);
  return totalCost;
}

// Example for Feb 9
calculateCost({
  autocompleteWithSession: 100,
  autocompleteNoSession: 50,
  textSearch: 600, // <-- This is likely the culprit
  placeDetails: 0,
});
// Output: Estimated cost: $20.84
```

---

## 🎯 Expected Findings & Solutions

### Finding 1: High Text Search Volume (Most Likely)
**Expected**: 600-800 Text Search calls on Feb 9 (vs 200-300 on Feb 8)

**Root Cause**: Increased AI itinerary generation usage

**Solutions**:
1. **Implement result caching** (voyager-pwa has 5-min cache, port to React Native)
2. **Reduce maxResults** in searchActivities (currently 30, could be 15)
3. **Limit pagination** (currently fetches 2-4 pages, limit to 1-2)
4. **Add rate limiting** per user (e.g., 3 AI generations per hour)

**Estimated Savings**: 40-60% cost reduction

### Finding 2: verifyPlaces Still Running (Possible)
**Expected**: verifyPlaces function being called despite being "stopped"

**Root Cause**: Old code path still active, or function not removed from deployment

**Solutions**:
1. **Verify function is not called** from client code
2. **Remove export from `functions/src/index.ts`**
3. **Redeploy functions** without verifyPlaces
4. **Add deprecation warning** if function is called

**Estimated Savings**: If called, could save $10-20/day

### Finding 3: Session Tokens Not Working (Unlikely)
**Expected**: Should see mostly `Session: YES✅` messages

**Root Cause**: Token generation/storage broken, or timeout too short

**Solutions**:
1. **Test session token implementation** in PlacesAutocomplete
2. **Increase session timeout** from 3 minutes to 5 minutes
3. **Add persistent storage** for session tokens (currently module-level)
4. **Add retry logic** if token invalid

**Estimated Savings**: Minimal (autocomplete volume is low)

---

## 📝 Next Steps

### Immediate Actions (Today)
1. ✅ **Logging implemented** (client + server)
2. ⏳ **Run Step 1-5 investigation** (see above)
3. ⏳ **Identify primary cost driver** (Text Search volume? verifyPlaces? Pagination?)
4. ⏳ **Document findings** in this file

### Short-Term Fixes (This Week)
Based on findings, implement:
- [ ] **Result caching** for searchActivities/searchAccommodations (5-min TTL)
- [ ] **Reduce maxResults** to 15 (from 30)
- [ ] **Limit pagination** to 1 page (from 2-4)
- [ ] **Remove verifyPlaces** from deployment (if still active)
- [ ] **Add rate limiting** for AI generations (3/hour per user)

### Long-Term Optimizations (Next Sprint)
- [ ] **Implement Places API caching layer** (Redis or Firestore-based)
- [ ] **Switch to Places API (New)** (cheaper pricing for some SKUs)
- [ ] **Pre-fetch popular destinations** during off-peak hours
- [ ] **Add cost monitoring alerts** (alert if daily cost > $35)
- [ ] **Implement batch processing** for verifyPlaces (if re-enabled)

---

## 🚨 Alert Thresholds

Set up monitoring for:
- **Daily cost > $35** → Investigate immediately
- **Text Search calls > 1000/day** → Review usage patterns
- **verifyPlaces invocations > 0** → Function should be disabled
- **Autocomplete without session token > 10%** → Check token implementation

---

## 📞 Support Resources

- **Google Maps Platform Pricing**: https://developers.google.com/maps/billing-and-pricing/pricing
- **Cost Management Tools**: https://console.cloud.google.com/billing
- **Firebase Functions Logs**: https://console.firebase.google.com/project/mundo1-1/functions/logs
- **Client-Side Logger**: `window.placesApiLogger.getStats()` in browser console

---

## ✅ Investigation Checklist

- [ ] Reviewed Firebase Functions logs for Feb 9
- [ ] Counted Text Search API calls by function
- [ ] Checked if verifyPlaces is still running
- [ ] Compared itinerary generation volume Feb 8 vs Feb 9
- [ ] Verified session tokens are working in PlacesAutocomplete
- [ ] Calculated estimated cost breakdown
- [ ] Identified primary cost driver
- [ ] Documented root cause
- [ ] Implemented fix
- [ ] Monitored cost for 48 hours post-fix
- [ ] Updated this document with findings

---

**Document Created**: February 16, 2026  
**Last Updated**: February 16, 2026  
**Status**: Investigation in progress ⏳
