# AddItineraryModal Implementation Plan

## Overview
This document outlines the React Native implementation of the AddItineraryModal feature for creating, editing, and deleting manual itineraries.

## ✅ Completed Components

### 1. Type Definitions
**File**: `src/types/ManualItinerary.ts`
- `ManualItineraryFormData` - Form input structure
- `ManualItineraryData` - Complete itinerary data matching PostgreSQL
- Validation error types
- Form state management types
- Constants for gender, status, and sexual orientation options

### 2. Hooks
**File**: `src/hooks/useCreateItinerary.ts`
- Creates and updates itineraries via `createItinerary` RPC
- Comprehensive form validation
- Handles date conversion to timestamps
- Returns loading/error states

**File**: `src/hooks/useDeleteItinerary.ts`
- Deletes itineraries via `deleteItinerary` RPC
- Error handling and loading states

## 🚧 Remaining Implementation

### 3. AddItineraryModal Component
**File**: `src/components/search/AddItineraryModal.tsx`

**Required Features**:
1. **Modal Shell** - React Native Modal with ScrollView
2. **Form Section**:
   - Destination input (text input with autocomplete suggestions)
   - Start/End date pickers
   - Description textarea
   - Activities list (add/remove)
   - Gender preference picker
   - Status preference picker
   - Sexual orientation preference picker
   - Age range sliders (18-100)

3. **Itinerary List Section**:
   - Display all user itineraries
   - Show AI indicator (🤖) vs manual (✈️)
   - Edit and Delete buttons for each
   - Separate AI itineraries (read-only edit)

4. **Validation**:
   - Profile completeness check (DOB + gender required)
   - All required fields
   - Date logic (start < end, no past dates)
   - Age range logic

5. **State Management**:
   - Form state (creating vs editing)
   - Selected itinerary for edit
   - Delete confirmation dialog

**Key Differences from PWA**:
- Use React Native components (Modal, TextInput, ScrollView, Picker)
- Platform-specific date pickers (DateTimePicker from @react-native-community)
- Touch-optimized UI
- No react-select (use custom autocomplete or TextInput)

### 4. ItineraryListItem Component
**File**: `src/components/search/ItineraryListItem.tsx`

**Props**:
```typescript
interface ItineraryListItemProps {
  itinerary: Itinerary;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
```

**Features**:
- Display destination, dates, description preview
- AI indicator emoji
- Edit/Delete action buttons
- Styling for touch targets

### 5. SearchPage Integration
**Modifications to**: `src/pages/SearchPage.tsx`

```typescript
const [modalVisible, setModalVisible] = useState(false);

const handleAddItinerary = () => {
  // Check profile completion first
  if (!userProfile?.dob || !userProfile?.gender) {
    showAlert('Please complete your profile first', 'warning');
    return;
  }
  setModalVisible(true);
};

const handleItineraryAdded = () => {
  refreshItineraries(); // Refresh the dropdown list
  setModalVisible(false);
};

// In render:
<AddItineraryModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onItineraryAdded={handleItineraryAdded}
  itineraries={itineraries}
  userProfile={userProfile}
/>
```

## Testing Requirements

### Unit Tests

#### 1. Hook Tests
**File**: `src/__tests__/hooks/useCreateItinerary.test.ts`
- ✅ Validates required fields
- ✅ Validates profile completeness
- ✅ Validates date logic
- ✅ Validates age ranges
- ✅ Creates itinerary successfully
- ✅ Updates existing itinerary
- ✅ Handles API errors
- ✅ Handles authentication errors

**File**: `src/__tests__/hooks/useDeleteItinerary.test.ts`
- ✅ Deletes itinerary successfully
- ✅ Handles API errors
- ✅ Requires authentication
- ✅ Requires itinerary ID

#### 2. Component Tests
**File**: `src/__tests__/components/AddItineraryModal.test.tsx`
- Renders form fields
- Shows validation errors
- Submits form successfully
- Edits existing itinerary
- Deletes itinerary with confirmation
- Shows itinerary list
- Filters AI vs manual itineraries
- Checks profile completion before showing form

**File**: `src/__tests__/components/ItineraryListItem.test.tsx`
- Displays itinerary details
- Shows AI indicator
- Calls onEdit when edit button pressed
- Calls onDelete when delete button pressed

### E2E Test (Appium)
**File**: `automation/tests/mobile/create-itinerary.test.ts`

**Test Flow**:
1. Navigate to SearchPage
2. Click "+ Add Itinerary" button
3. Fill in destination: "Austin, TX"
4. Select start date (tomorrow)
5. Select end date (7 days from tomorrow)
6. Add description: "Test trip"
7. Add activity: "Live music"
8. Select preferences (gender, status, orientation)
9. Set age range: 25-45
10. Click "Save Itinerary"
11. Verify itinerary appears in dropdown
12. Verify itinerary appears in modal list
13. Click Edit, modify destination
14. Save changes
15. Verify updated
16. Delete itinerary
17. Confirm deletion
18. Verify removed from list

## PostgreSQL Schema Reference

From `itinerariesRpc.ts` and database export:

```typescript
{
  id: string;                    // UUID
  userId: string;                // Firebase Auth UID
  destination: string;           // "Austin, TX, USA"
  title?: string;                // Optional title
  description: string;           // User description
  startDate: Date;               // ISO date
  endDate: Date;                 // ISO date
  startDay: bigint;              // Unix timestamp ms
  endDay: bigint;                // Unix timestamp ms
  lowerRange: string;            // Age min (stored as string)
  upperRange: string;            // Age max (stored as string)
  gender: string;                // "Male", "Female", "No Preference", etc.
  sexualOrientation: string;     // "heterosexual", "No Preference", etc.
  status: string;                // "single", "married", "No Preference", etc.
  likes: string;                 // JSON array string
  activities: string;            // JSON array string
  userInfo: string;              // JSON object string
  ai_status?: string;            // "completed" for AI, null for manual
  response?: string;             // JSON for AI itineraries
  createdAt: Date;
  updatedAt: Date;
}
```

**Key Differences**:
- Manual itineraries have `ai_status: null` or undefined
- AI itineraries have `ai_status: "completed"` and `response` field
- `startDay`/`endDay` are BigInt but returned as numbers after sanitization
- `lowerRange`/`upperRange` stored as strings (need to convert)

## Implementation Checklist

- [x] Create type definitions
- [x] Create useCreateItinerary hook
- [x] Create useDeleteItinerary hook
- [ ] Create AddItineraryModal component (~500 lines)
- [ ] Create ItineraryListItem component (~100 lines)
- [ ] Integrate with SearchPage
- [ ] Unit tests for hooks
- [ ] Unit tests for components
- [ ] Appium E2E test
- [ ] Update SEARCHPAGE_DROPDOWN_IMPLEMENTATION.md

## Key Design Decisions

### 1. Profile Validation
- Check `userProfile.dob` and `userProfile.gender` before allowing itinerary creation
- Show error alert if incomplete
- Match PWA behavior exactly

### 2. Date Handling
- Use `@react-native-community/datetimepicker` for native pickers
- Store dates as ISO strings (YYYY-MM-DD)
- Convert to Unix timestamps (noon UTC) before sending to backend
- Validate: no past dates, end > start

### 3. AI vs Manual Itineraries
- Allow editing both AI and manual itineraries
- AI itineraries: Can edit metadata (description, preferences) but not generated content
- Manual itineraries: Full edit capability
- Show indicator: 🤖 for AI, ✈️ for manual

### 4. Activities Management
- Simple TextInput + "Add" button
- Display as chips/tags with remove button
- Stored as array of strings

### 5. Error Handling
- Show validation errors inline (near fields)
- Show API errors as alerts
- Loading states on Save/Delete buttons
- Confirmation dialog for delete

## Dependencies to Install

```bash
npm install @react-native-community/datetimepicker
```

## S.O.L.I.D Compliance

✅ **Single Responsibility**:
- Hooks handle data operations only
- Components handle UI rendering only
- Validation logic separated into hook

✅ **Open/Closed**:
- Easy to add new preference types
- Extensible validation rules

✅ **Liskov Substitution**:
- Itinerary interface works for both AI and manual

✅ **Interface Segregation**:
- Separate form data from full itinerary data
- Focused props for each component

✅ **Dependency Inversion**:
- Depends on Firebase abstraction (httpsCallable)
- Uses UserProfile from context (interface)

## Next Steps

1. Implement AddItineraryModal component (large file)
2. Implement ItineraryListItem component
3. Update SearchPage integration
4. Write comprehensive unit tests
5. Write Appium E2E test
6. Update documentation

The implementation is ready for the modal component development. Would you like me to continue with the AddItineraryModal component, or would you prefer to review the hooks and types first?
