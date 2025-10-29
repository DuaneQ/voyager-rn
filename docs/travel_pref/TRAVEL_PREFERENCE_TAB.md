rst)

Role:
You are a senior React Native engineer tasked with implementing the Travel Preferences Tab for the TravalPass mobile app.
This feature already exists in the PWA version and uses the same Firebase Firestore and Storage backend.
You must preserve the data structure and object shape from the PWA, but you may simplify or refactor the front-end logic for maintainability and better mobile UX.

The React Native implementation should be mobile-first, follow S.O.L.I.D. principles, maintain strong TypeScript typing, and achieve 90% unit test coverage.

Functional Requirements
1️⃣ Overview

The Travel Preferences Tab allows users to select and save their travel style, activities, accommodations, dining, and transportation preferences.

The stored preferences personalize the AI itinerary generation feature.

The data must stay in sync with the PWA — updates to preferences in one environment should reflect in the other.

2️⃣ Categories (same as PWA)
Category	Example Options	Notes
Travel Style	Adventure, Relaxation, Cultural, Nightlife, Luxury	Multi-select chips
Activities	Hiking, Food Tours, Museums, Shopping, Beach	Multi-select chips
Accommodations	Hotels, Airbnbs, Hostels, Resorts	Multi-select chips
Dining Preferences	Local Cuisine, Fine Dining, Vegan Options, Street Food	Multi-select chips
Transportation	Plane, Train, Car Rental, Ferry	Radio buttons (single select)

Architecture

The Travel Preferences Tab lives under /components/profile/TravelPreferencesTab.tsx.

Use UserProfileContext for user data access and updates.

UI Behavior

Each category displays in a collapsible card (accordion).

Use multi-select chips for categories allowing multiple values, and radio buttons for single-select.

Selected chips visually change color (accent = brand blue #1A73E8).

Each accordion displays a summary of selected values when collapsed.

Include a “Save Preferences” button at the bottom (sticky on mobile).

Disable save button until a change is detected.

Show success or error snackbar/toast upon save.

Testing Requirements

Framework: Jest + React Native Testing Library.

Coverage target: ≥ 90%.

Test cases:

Render all preference categories correctly.

Multi-select chips toggle state properly.

Radio selection updates state.

“Save Preferences” button enables only after change.

Firestore update succeeds (mocked).

Error handling when Firestore update fails.

Summary text updates after save.

Deliverables

Fully functional TravelPreferencesTab integrated with UserProfileContext.

Firestore synchronization with existing PWA schema.

Unit tests with ≥ 90% coverage.

Clean, reusable components following S.O.L.I.D.

Documentation snippet in README describing data flow and shared schema.