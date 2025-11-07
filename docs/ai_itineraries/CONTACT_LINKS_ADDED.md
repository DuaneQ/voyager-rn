# Contact Links Added to Daily Activities

## Enhancement
Added clickable phone numbers and website links to both activities and restaurants in the Daily Activities section.

## Changes Made

### Activities Section (Lines 477-497)
Added after rating display:
```typescript
{activity.phone && (
  <TouchableOpacity onPress={() => Linking.openURL(`tel:${activity.phone}`)}>
    <Text style={styles.activityLink}>
      📞 {activity.phone}
    </Text>
  </TouchableOpacity>
)}
{activity.website && (
  <TouchableOpacity onPress={() => Linking.openURL(activity.website)}>
    <Text style={styles.activityLink}>
      🌐 {activity.website}
    </Text>
  </TouchableOpacity>
)}
```

### Restaurants Section (Lines 538-553)
Added after rating display:
```typescript
{meal.restaurant.phone && (
  <TouchableOpacity onPress={() => Linking.openURL(`tel:${meal.restaurant.phone}`)}>
    <Text style={styles.activityLink}>
      📞 {meal.restaurant.phone}
    </Text>
  </TouchableOpacity>
)}
{meal.restaurant.website && (
  <TouchableOpacity onPress={() => Linking.openURL(meal.restaurant.website)}>
    <Text style={styles.activityLink}>
      🌐 {meal.restaurant.website}
    </Text>
  </TouchableOpacity>
)}
```

### New Style Added (Lines 1090-1095)
```typescript
activityLink: {
  fontSize: 13,
  color: '#007AFF',
  marginTop: 4,
  textDecorationLine: 'underline',
}
```

## Features
- ✅ **Phone Links**: Tapping phone number opens native phone dialer
- ✅ **Website Links**: Tapping website URL opens in browser
- ✅ **Visual Styling**: Blue underlined text matching iOS convention
- ✅ **Icons**: 📞 for phone, 🌐 for website for quick recognition
- ✅ **Conditional Display**: Only shows if data exists

## Display Order
For each activity/restaurant card:
1. Name (bold, large)
2. Time
3. Description
4. Location (📍)
5. Rating with review count (⭐)
6. **Phone number (📞)** ← NEW
7. **Website (🌐)** ← NEW
8. Estimated cost (💰)

## Example Output
```
Marston House
⏰ 10:00 - 16:00
Marston House located in 3525 7th Ave, San Diego, CA 92103, United States
📍 Marston House
⭐ 4.8 (201 reviews)
📞 (619) 297-9327
🌐 https://www.balboapark.org/museums/marston-house
💰 $20
```

## Files Modified
- `/src/components/ai/AIItineraryDisplay.tsx`
  - Lines 477-497: Added phone & website links to activities
  - Lines 538-553: Added phone & website links to restaurants
  - Lines 1090-1095: Added `activityLink` style

## Verification
- ✅ All 712 tests pass (100% pass rate maintained)
- ✅ Links properly formatted with icons
- ✅ Conditional rendering (only shows if data exists)
- ✅ Native functionality (tel: for phone, http/https for web)

## Impact
- ✅ Users can now directly call venues or visit websites
- ✅ Matches PWA functionality for contact information
- ✅ Improves user experience with actionable links
- ✅ Maintains clean, organized card layout
