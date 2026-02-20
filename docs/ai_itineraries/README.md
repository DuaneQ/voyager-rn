# AI Itineraries Documentation

> **Source of Truth** for AI-powered itinerary generation in the Voyager app.
> 
> Consolidated from PWA documentation (January 2025) and updated to reflect actual implementation.

## 📚 Core Documentation

### Architecture & Contracts

| Document | Description |
|----------|-------------|
| [AI_SYSTEM_ARCHITECTURE.md](AI_SYSTEM_ARCHITECTURE.md) | **Complete system architecture**, callable function contracts, database schema, and API reference |
| [DATA_CONTRACT_BACKWARDS_COMPATIBILITY.md](DATA_CONTRACT_BACKWARDS_COMPATIBILITY.md) | **⚠️ CRITICAL**: Production data structure requirements and transformation layer |
| [AI_ENRICHMENT_ROADMAP.md](AI_ENRICHMENT_ROADMAP.md) | **4-phase improvement plan** with cost analysis and effort estimates |
| (Current issues summarized in `AI_ENRICHMENT_ROADMAP.md`) | **Quick reference** for current issues and gaps |

### Implementation Docs

| Document | Description |
|----------|-------------|
| [useAIGeneration.md](useAIGeneration.md) | Hook implementation details |
| [RN_AI.md](RN_AI.md) | React Native specific implementation |
| [RN_PWA_PARITY_FIX.md](RN_PWA_PARITY_FIX.md) | PWA parity fixes applied to RN |

### Bug Fixes & Features

| Document | Description |
|----------|-------------|
| [AI_ITINERARY_FIX.md](AI_ITINERARY_FIX.md) | General itinerary fixes |
| [AI_ITINERARY_SAVE_FIX.md](AI_ITINERARY_SAVE_FIX.md) | Save functionality fixes |
| [AI_ITINERARY_EDITING.md](AI_ITINERARY_EDITING.md) | Editing feature implementation |
| [AI_ITINERARY_SHARING_FEATURE.md](AI_ITINERARY_SHARING_FEATURE.md) | Sharing feature implementation |
| (Share fix details integrated into `AI_ITINERARY_SHARING_FEATURE.md`) | Share feature bug fixes |

---

## 🔧 Quick Reference

### Callable Functions (Production)

| Function | Purpose | Provider |
|----------|---------|----------|
| `searchFlights` | Flight search | SerpAPI Google Flights |
| `searchAccommodations` | Hotel search | Google Places API |
| `searchActivities` | Activities & restaurants | Google Places API |
| `generateItineraryWithAI` | Transportation (non-flight) | OpenAI GPT-4o-mini |

### Non-Existent Functions

These are documented in older specs but **do NOT exist**:
- ❌ `estimateItineraryCost`
- ❌ `getGenerationStatus`

### Required API Keys

```bash
OPENAI_API_KEY="sk-..."
GOOGLE_PLACES_API_KEY="..."
SERPAPI_API_KEY="..."
```

---

## 🐛 Known Issues

### Naples Bug (Location Disambiguation)

**Problem**: When generating an itinerary for "Naples, Italy", the system may return results for Naples, Florida.

**Root Cause**: `destinationLatLng` is often undefined in the payload, causing Google Places to rely on text search only.

**Fix Status**: Documented in [AI_ENRICHMENT_ROADMAP.md](AI_ENRICHMENT_ROADMAP.md) - Phase 1

### Preference Utilization

User preferences (travel style, dietary restrictions) are collected but minimally utilized in search queries.

**Fix Status**: Documented in [AI_ENRICHMENT_ROADMAP.md](AI_ENRICHMENT_ROADMAP.md) - Phase 2

---

## 📊 Cost Per Generation

| Component | Cost |
|-----------|------|
| Google Places (TextSearch) | ~$0.032 |
| Google Places (Details) | ~$0.017/place |
| SerpAPI (Flights) | ~$0.05 |
| OpenAI GPT-4o-mini | ~$0.15-0.60/1M tokens |
| **Total Estimated** | **~$0.29** |

---

## 🚀 Development

### Start Firebase Emulators

```bash
cd functions && npm run build
firebase emulators:start --only functions,firestore,auth
```

### Run Tests

```bash
# Unit tests
npm test

# Integration tests (RN)
npm run test:integration
```

### Deploy Functions

```bash
firebase deploy --only functions:searchFlights
firebase deploy --only functions:searchAccommodations
firebase deploy --only functions:searchActivities
firebase deploy --only functions:generateItineraryWithAI
```

---

## 📁 File Index

### Active Documentation
- `AI_SYSTEM_ARCHITECTURE.md` - **Main architecture doc**
- `AI_ENRICHMENT_ROADMAP.md` - Improvement plan
- `CURRENT_STATE_ASSESSMENT.md` - Current issues
- `useAIGeneration.md` - Hook docs
- `RN_AI.md` - RN implementation

### Bug Fix Logs
- `AI_ITINERARY_FIX.md`
- `AI_ITINERARY_SAVE_FIX.md`
- `DAILY_ACTIVITIES_FIX.md`
- `PAYLOAD_PARITY_FIX.md`
- `useAIGeneration_BUG_FIX.md`
- `useAIGeneration_BUG_FIXES_FINAL.md`

### Feature Implementation
- `AI_ITINERARY_EDITING.md`
- `AI_ITINERARY_SHARING_FEATURE.md`
- `MY_AI_ITINERARIES_IMPLEMENTATION.md`
- `PROFILE_VALIDATION_FOR_AI_ITINERARY.md`

### Legacy (Reference Only)
- `LEGACY_AI.md` - Old implementation reference
- `AI.md` - Original AI notes
- `AI_DISPLAY.md` - Display implementation
- `OUTPUT.md` - Output format reference

---

## 📝 Update History

| Date | Change |
|------|--------|
| Jan 2025 | Consolidated PWA docs, corrected Amadeus→SerpAPI, removed non-existent functions |
| Oct 2025 | Original PWA documentation created |
