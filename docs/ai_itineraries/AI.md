🧠 Prompt for Copilot (Refactor useAIGeneration Hook for React Native)

You are refactoring the existing useAIGeneration React hook for the React Native version of the app.
This hook must preserve all current functionality while improving maintainability, mobile compatibility, and security through input sanitization.

🎯 Objectives

Maintain identical API payload structures when calling Firebase Cloud Functions:

searchFlights

searchActivities

searchAccommodations

generateItineraryWithAI

createItinerary (for PostgreSQL persistence)

The hook should:

Sanitize all user-provided text inputs (e.g., specialRequests, mustInclude, mustAvoid, airport/city names) to prevent injection or malformed JSON.

Provide mobile-friendly progress updates (e.g., stage, percent, and message values).

Gracefully handle retries (with exponential backoff up to 3 times) when network errors occur.

Support cancellation using an AbortController.

Keep all setProgress, setError, and isGenerating state transitions safe for concurrent invocations.

Preserve the same object shape for responses and saved itineraries as in the PWA implementation.

🧱 Implementation Details

Create a small sanitizeInput() helper that:

Trims strings.

Escapes or removes any HTML/JS fragments (<, >, script, etc.).

Removes double spaces and control characters.

Caps free-form field length to:

specialRequests: 500 chars

mustInclude / mustAvoid tags: 80 chars each

Returns a fully cleaned version of the AIGenerationRequest object.

Call sanitizeInput() immediately before buildAIPayload(request, userProfile).

Wrap all Firebase calls in a helper callWithRetry(fn, payload) that:

Retries up to 3 times with exponential delays (500 → 1000 → 2000 ms).

Breaks early on HTTP 400+ responses.

Returns the successful result or throws a descriptive error.

Add try/catch blocks around all remote calls, logging context-specific warnings (logger.warn('[useAIGeneration]', error)).

Update progress at these stages:

"initializing" (5 %)

"searching" (20 %)

"activities" (40 %)

"ai_generation" (70 %)

"saving" (90 %)

"done" (100 %)

On success:

Automatically save the generated itinerary using the existing createItinerary callable.

Return { id, success, savedDocId } exactly as before.

On failure:

Set error with a clean, user-friendly message.

Do not leave the component in a loading state (setIsGenerating(false) in finally).

🧪 Testing

Add Jest unit tests for:

Sanitization edge cases (HTML, emoji, long text).

Retry logic on simulated 503 / network errors.

Correct progress sequencing.

Mock Firebase callables and ensure payloads match the PWA format.

✅ Deliverables

/hooks/useAIGeneration.ts (fully refactored)

/utils/sanitizeInput.ts (helper used by hook)

/__tests__/useAIGeneration.test.ts

Key Rule:
Do not change the payload or response object shape sent to or received from Cloud Functions or PostgreSQL storage—only improve the internal logic and sanitization layer.