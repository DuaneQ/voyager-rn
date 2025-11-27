# legal Specification

## Purpose
TBD - created by archiving change add-terms-acknowledgement. Update Purpose after archive.
## Requirements
### Requirement: Terms of Service Acknowledgement
The mobile client SHALL ensure that every authenticated user has accepted the current Terms of Service before using the app.

#### Scenario: User has accepted terms
- **GIVEN** an authenticated user with `users/{uid}.termsOfService.accepted = true`
- **WHEN** the user opens the app
- **THEN** the app SHOULD NOT show the Terms of Service modal and SHOULD allow normal use.

#### Scenario: User has not accepted terms
- **GIVEN** an authenticated user where `users/{uid}.termsOfService.accepted` is missing or `false`
- **WHEN** the user opens the app
- **THEN** the app SHALL show a blocking Terms of Service modal with a short summary and link to full terms
- **AND** the modal SHALL provide two actions: `Accept` and `Decline`.

#### Scenario: User accepts terms
- **WHEN** the user taps `Accept` after satisfying required acknowledgements
- **THEN** the client SHALL write the following to `users/{uid}.termsOfService`:
  - `accepted: true`
  - `acceptedAt: <server-timestamp>`
  - `version: <string>` (version of ToS)
- **AND** the app SHALL allow the user to continue using the app.

#### Scenario: User declines terms
- **WHEN** the user taps `Decline` on the Terms of Service modal
- **THEN** the client SHALL sign out the user and redirect to the login screen.

### Requirement: Auditability
The system SHALL allow the client to store `version` and `acceptedAt` to support future auditing and ToS updates.

#### Scenario: Store acceptance metadata
- **GIVEN** a user accepts the Terms of Service
- **WHEN** the acceptance is written to Firestore
- **THEN** the system SHALL record `version` (current terms version) and `acceptedAt` (server timestamp)
- **AND** this metadata SHALL be retrievable for future audits or terms version checks.

The implementation should not interfere with existing checks, like validating the user profile or validating the user has validated their email.  The legal agreement should not collide with those validations

Adhere to S.O.L.I.D.

