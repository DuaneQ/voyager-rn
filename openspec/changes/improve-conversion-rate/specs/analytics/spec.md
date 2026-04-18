## ADDED Requirements

### Requirement: Conversion Funnel Event Tracking
The system SHALL track the following funnel events via Firebase Analytics: `landing_page_view`, `cta_click`, `signup_start`, `signup_email_entered`, `signup_verification_sent`, `signup_verification_complete`, `signup_password_set`, `signup_complete`, `onboard_first_itinerary_start`, `onboard_first_itinerary_complete`, `onboard_first_match_view`.

#### Scenario: Landing page view tracked
- **WHEN** an unauthenticated user views the landing page
- **THEN** a `landing_page_view` event is logged with properties: `source` (referrer), `platform` (web/ios/android)

#### Scenario: CTA click tracked
- **WHEN** a user clicks any "Match My Trip" CTA button
- **THEN** a `cta_click` event is logged with properties: `location` (hero/footer/traveler_card), `platform`

#### Scenario: Signup step transitions tracked
- **WHEN** a user advances through each signup step
- **THEN** the corresponding event is logged with `step_number` and `method` (email/google/apple)

#### Scenario: Signup completion tracked
- **WHEN** a user completes all signup steps
- **THEN** a `signup_complete` event is logged with `method`, `has_password` (boolean), `time_to_complete` (seconds)

### Requirement: Google Ads Conversion Goals
The system SHALL export Firebase Analytics events as Google Ads conversion goals for: `signup_complete`, `onboard_first_itinerary_complete`.

#### Scenario: Conversion reported to Google Ads
- **WHEN** a `signup_complete` event fires for a user who arrived via Google Ads (gclid present)
- **THEN** the conversion is attributed to the originating ad campaign in Google Ads reporting

### Requirement: Analytics Service Abstraction
The system SHALL provide an `AnalyticsService` interface that abstracts event logging, allowing the underlying provider (Firebase Analytics) to be swapped without changing calling code.

#### Scenario: Event logged through abstraction
- **WHEN** any component or hook calls `analyticsService.logEvent(name, properties)`
- **THEN** the event is forwarded to Firebase Analytics with the correct event name and properties
