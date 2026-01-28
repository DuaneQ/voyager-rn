# AI Itinerary Current State Assessment

**Date**: January 24, 2026  
**Status**: Assessment Complete

---

## Quick Summary

| Area | Status | Priority |
|------|--------|----------|
| Location Accuracy | 🔴 Critical Bug | P0 |
| User Preferences | 🟡 Underutilized | P1 |
| AI Capabilities | 🟡 Limited Scope | P2 |
| Data Completeness | 🟡 Partial | P2 |
| Documentation | 🟡 Outdated | P3 |

---

## Critical Bug: Location Disambiguation

### The Problem
Searching for "Naples, Italy" may return results for Naples, Florida.

### Why It Happens
```
User enters: "Naples, Italy"
     │
     ▼
searchActivities receives: { destination: "Naples, Italy" }
     │
     ▼
Builds query: "things to do in Naples, Italy"
     │
     ▼
destinationLatLng is UNDEFINED (not provided by UI)
     │
     ▼
Google Places TextSearch has NO geographic bias
     │
     ▼
Returns US results first (English query bias)
```

### The Fix (Phase 1)
```
User enters: "Naples, Italy"
     │
     ▼
UI uses Google Places Autocomplete
     │
     ▼
Autocomplete returns: {
  description: "Naples, Metropolitan City of Naples, Italy",
  place_id: "ChIJ...",
  geometry: { lat: 40.8518, lng: 14.2681 }
}
     │
     ▼
searchActivities receives coordinates
     │
     ▼
Search is biased to correct location ✓
```

---

## User Preferences: Current vs Potential

### Currently Used

| Preference | How Used | Effectiveness |
|------------|----------|---------------|
| tripType | Adds keywords to search query | Medium |
| mustInclude | Keyword matching in results | Low |
| mustAvoid | Filters results by keyword | Low |
| starRating (hotels) | Adds hint to search query | Medium |
| accessibility (hotels) | Passed to search | Low |

### NOT Currently Used

| Preference | Potential Use |
|------------|---------------|
| dietaryRestrictions | Filter restaurants |
| budget/priceLevel | Filter by Google price_level |
| accessibility (activities) | Filter all venues |
| activityPreferences | Score/rank results |
| cuisineTypes | Better restaurant matching |

---

## AI Capabilities: Current vs Potential

### Current AI Usage
```
generateItineraryWithAI is called ONLY when:
- transportType !== 'airplane' AND
- transportType !== 'flight' AND
- transportType !== 'air'

It returns ONLY:
- Transportation mode recommendation
- Distance estimate
- Duration estimate
- Cost estimate
- Route steps
- Provider suggestions
- Travel tips
```

### NOT Done by AI (Client-Side Assembly Instead)
- Activity selection and ordering
- Restaurant recommendations
- Day-by-day planning
- Time scheduling
- Cost calculations
- Description generation

### Potential AI Enhancement
AI could:
- Generate complete day-by-day plans
- Optimize activity order by location
- Provide personalized narratives
- Suggest alternatives
- Add cultural context
- Consider weather/seasons
- Balance activity types

---

## Data Completeness

### What We Fetch

| Data Point | Activities | Restaurants | Hotels |
|------------|------------|-------------|--------|
| Name | ✓ | ✓ | ✓ |
| Address | ✓ | ✓ | ✓ |
| Coordinates | ✓ | ✓ | ✓ |
| Rating | ✓ | ✓ | ✓ |
| Phone* | ✓ | ✓ | ✗ |
| Website* | ✓ | ✓ | ✗ |
| Price Level* | ✓ | ✓ | ✗ |
| Photos | ✓ | ✓ | ✓ |

*Only for top N enriched results

### What We Don't Fetch

| Data Point | Impact |
|------------|--------|
| Operating Hours | Can't optimize timing |
| Wheelchair Access (all) | Accessibility incomplete |
| Reviews | No sentiment insight |
| Current Status | May recommend closed places |
| Reservation Info | User must research |

---

## API Cost Baseline

### Per Generation (Current)
- Google Places TextSearch: ~$0.10
- Google Places Details: ~$0.15
- SerpAPI (flights only): ~$0.03
- OpenAI: ~$0.01
- **Total: ~$0.29**

### Monthly Estimate (500 premium users, 3 itineraries each)
- **Current: ~$435/month**

---

## Next Steps

See [AI_ENRICHMENT_ROADMAP.md](./AI_ENRICHMENT_ROADMAP.md) for:
- Detailed implementation plans
- Cost analysis for enhancements
- Phase-by-phase breakdown
- Effort estimates
