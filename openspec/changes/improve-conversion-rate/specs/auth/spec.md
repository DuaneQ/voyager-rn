## ADDED Requirements

### Requirement: Multi-Step Signup Modal
The system SHALL present signup as a multi-step modal with progress indicator: Step 1 (Email + Social Auth), Step 2 (Verification), Step 3 (Optional Password), Step 4 (Value Preview + Add Trip CTA).

#### Scenario: Step 1 — Email entry
- **WHEN** the signup modal opens
- **THEN** the user sees an email input field, "Continue with Google" button, "Continue with Apple" button (iOS only), and step indicator showing step 1 of 3

#### Scenario: Step 1 — Social auth shortcut
- **WHEN** the user clicks "Continue with Google"
- **THEN** the Google sign-in flow executes and on success the modal advances to Step 4 (skipping verification and password)

#### Scenario: Step 2 — Email verification via Magic Link
- **WHEN** the user submits a valid email in Step 1
- **THEN** a Firebase Email Link (Magic Link) is sent to the email and the modal advances to Step 2 showing "Check your inbox" with the submitted email displayed and "Check spam" guidance

#### Scenario: Step 3 — Optional password
- **WHEN** verification succeeds
- **THEN** the modal advances to Step 3 showing a checkbox "Yes, I'd like to set a password" with password fields hidden by default

#### Scenario: Step 3 — Skip password
- **WHEN** the user clicks "Enter TravalPass" without checking the password checkbox
- **THEN** the account is created without a password (passwordless/social-only) and the modal advances to Step 4

#### Scenario: Step 4 — Value preview
- **WHEN** the user completes signup (any path)
- **THEN** Step 4 shows a blurred preview of matching travelers, "Add your destination to unlock your matches" copy, and an "Add My Trip" CTA button

### Requirement: Deferred Username Collection
The system SHALL NOT require a username during signup. Username SHALL be collected during profile completion or first profile edit.

#### Scenario: Signup without username
- **WHEN** a new user completes the signup flow
- **THEN** their display name is set from the social provider name or email prefix, and no username prompt is shown during signup

#### Scenario: Username prompt on first profile visit
- **WHEN** a new user without a username visits the Profile tab
- **THEN** the system prompts them to set a username

### Requirement: Existing Login Flow Preserved
The system SHALL maintain the current email+password sign-in flow for existing users via a "Sign in" link.

#### Scenario: Existing user signs in
- **WHEN** a user clicks "Sign in" from the landing page or signup modal
- **THEN** the login form is displayed with email and password fields and social sign-in options
