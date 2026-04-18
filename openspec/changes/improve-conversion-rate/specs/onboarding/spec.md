## ADDED Requirements

### Requirement: Guided First Itinerary Creation
The system SHALL guide new users from signup completion to creating their first itinerary via the "Add My Trip" CTA in signup Step 4.

#### Scenario: Add My Trip from signup
- **WHEN** a newly signed-up user clicks "Add My Trip" in the signup completion step
- **THEN** the itinerary creation modal opens with destination and date fields pre-focused

### Requirement: Profile Completion Progress Indicator
The system SHALL display a visual progress indicator showing profile completeness percentage on the Profile tab for users with incomplete profiles.

#### Scenario: Incomplete profile shows progress
- **WHEN** a user with missing profile fields (DOB, gender, photos, bio) visits the Profile tab
- **THEN** a progress bar or percentage indicator is displayed showing how complete their profile is

#### Scenario: Complete profile hides indicator
- **WHEN** a user has filled all profile fields
- **THEN** the progress indicator is no longer displayed

### Requirement: Profile Completion Nudge
The system SHALL display a non-blocking nudge to complete profile when a user with an incomplete profile takes a core action (create itinerary, view matches).

#### Scenario: Nudge on itinerary creation
- **WHEN** a user with missing DOB or gender attempts to create an itinerary
- **THEN** a friendly prompt explains why these fields are needed and links to the profile editor
