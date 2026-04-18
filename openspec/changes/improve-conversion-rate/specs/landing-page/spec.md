## ADDED Requirements
_These are new sections to add to the existing `src/pages/LandingPage.web.tsx`. Existing sections (hero, trust strip, demo videos, Problem→Solution comparison, feature highlights, itinerary cards, footer CTA, sticky bottom bar, legal modals) are retained._

### Requirement: Hero CTA Refinement (MODIFIED)
The existing hero section SHALL be updated to use "Match My Trip" as the primary CTA and "Free forever · No card required · Just your email" as trust microcopy, and the CTA SHALL open the signup modal instead of navigating to AuthPage.

#### Scenario: CTA opens signup modal
- **WHEN** the user clicks "Match My Trip" CTA
- **THEN** the signup modal opens at Step 1 (Email + Social auth)

### Requirement: Social Proof Ticker
The system SHALL display a proof ticker bar above the hero section showing traveler match count, active destinations, and average match time.

#### Scenario: Ticker displays on landing page
- **WHEN** the landing page loads
- **THEN** a ticker bar shows "80+ travelers matched", active destination names, and "Avg match time: under 1 hr"

### Requirement: Active Traveler Cards
The system SHALL display a horizontally scrollable strip of traveler cards showing name initial, destination, travel dates, and last-active timestamp.

#### Scenario: Traveler cards render
- **WHEN** the landing page loads
- **THEN** at least 5 traveler cards are shown with a "+N more travelers waiting" overflow card

#### Scenario: Overflow card opens signup
- **WHEN** the user clicks the overflow "+N more" card
- **THEN** the signup modal opens

### Requirement: CRO Promo Video (MODIFIED — replaces existing demo videos)
The existing demo videos section (3 separate videos: Matching, AI Itinerary, Manual Itinerary) SHALL be replaced with the CRO expert's promo video (`public/MatchingPromo.mov`), compressed to a web-optimized .mp4. The video SHALL autoplay muted with loop, displayed inline or in a phone-frame mockup.

#### Scenario: Promo video plays on landing page
- **WHEN** the user scrolls to the video section
- **THEN** the CRO promo video autoplays muted in a loop
- **AND** the compressed .mp4 version is served (target <5 MB)

#### Scenario: Video has manual controls
- **WHEN** the user interacts with the video
- **THEN** play/pause and unmute controls are available

### Requirement: Testimonial Section
The system SHALL display at least one verified traveler testimonial with star rating, quote, author name, destination, and "Verified match" badge.

#### Scenario: Testimonial renders
- **WHEN** the landing page loads
- **THEN** a testimonial card is displayed with 5-star rating, traveler quote, and author details

### Requirement: FAQ Accordion (MODIFIED — replaces existing card FAQ)
The existing FAQ section SHALL be converted from static cards to an accordion pattern. At least 5 questions covering: pricing, profile verification, safety, no-match scenario, and app availability. Existing FAQ content should be preserved.

#### Scenario: FAQ accordion interaction
- **WHEN** the user clicks a FAQ question
- **THEN** the answer expands and any previously open answer collapses

### Requirement: CTA Rewiring (MODIFIED)
All existing CTAs (hero CTA, footer CTA, sticky bottom bar, "Get Started Free") SHALL open the signup modal instead of navigating to AuthPage.

#### Scenario: Footer CTA opens signup
- **WHEN** the user clicks the footer CTA button
- **THEN** the signup modal opens

#### Scenario: Sticky bar CTA opens signup
- **WHEN** the user clicks the sticky bottom bar CTA
- **THEN** the signup modal opens
