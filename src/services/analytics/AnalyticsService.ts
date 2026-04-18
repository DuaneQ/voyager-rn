/**
 * AnalyticsService — Lightweight abstraction over Firebase Analytics.
 *
 * Wraps `logEvent` so the rest of the app depends on an interface, not Firebase
 * directly. Platform-safe: no-ops on native (where Firebase Analytics SDK is
 * separate) and in SSR/test environments where `window` is unavailable.
 *
 * Event naming convention: snake_case, prefixed by funnel stage.
 *   landing_*  — landing page interactions
 *   signup_*   — auth / registration funnel
 *   onboard_*  — post-signup onboarding
 *   match_*    — matching interactions
 */

import { Platform } from 'react-native';

// ── Event catalogue ──────────────────────────────────────────────────────

export type LandingEvent =
  | 'landing_page_view'
  | 'landing_cta_click'
  | 'landing_social_proof_interaction'
  | 'landing_video_play'
  | 'landing_faq_toggle'
  | 'landing_testimonial_view';

export type SignupEvent =
  | 'signup_start'
  | 'signup_email_entered'
  | 'signup_verification_sent'
  | 'signup_verification_complete'
  | 'signup_password_set'
  | 'signup_complete';

export type OnboardEvent =
  | 'onboard_start'
  | 'onboard_first_itinerary_start'
  | 'onboard_first_itinerary_complete'
  | 'onboard_first_match_view';

export type AnalyticsEvent = LandingEvent | SignupEvent | OnboardEvent;

export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | undefined;
}

// ── Interface ────────────────────────────────────────────────────────────

export interface IAnalyticsService {
  logEvent(event: AnalyticsEvent, params?: AnalyticsEventParams): void;
}

// ── Firebase implementation (web only) ───────────────────────────────────

let firebaseAnalytics: ReturnType<typeof import('firebase/analytics').getAnalytics> | null = null;
let firebaseLogEvent: typeof import('firebase/analytics').logEvent | null = null;

/**
 * Lazily initialise Firebase Analytics on first use (web only).
 * Returns true if analytics is available.
 */
async function ensureAnalytics(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  if (firebaseAnalytics) return true;

  try {
    const { getAnalytics, logEvent, isSupported } = await import('firebase/analytics');
    const supported = await isSupported();
    if (!supported) return false;

    const { app } = await import('../../config/firebaseConfig');
    firebaseAnalytics = getAnalytics(app);
    firebaseLogEvent = logEvent;
    return true;
  } catch {
    // Analytics unavailable (blocked by extension, SSR, etc.) — degrade silently
    return false;
  }
}

class FirebaseAnalyticsService implements IAnalyticsService {
  private ready: Promise<boolean>;

  constructor() {
    this.ready = ensureAnalytics();
  }

  logEvent(event: AnalyticsEvent, params?: AnalyticsEventParams): void {
    this.ready.then((ok) => {
      if (ok && firebaseAnalytics && firebaseLogEvent) {
        firebaseLogEvent(firebaseAnalytics, event, params);
      }
    });
  }
}

// ── No-op implementation (native / tests) ────────────────────────────────

class NoopAnalyticsService implements IAnalyticsService {
  logEvent(_event: AnalyticsEvent, _params?: AnalyticsEventParams): void {
    // intentional no-op
  }
}

// ── Singleton export ─────────────────────────────────────────────────────

export const analyticsService: IAnalyticsService =
  Platform.OS === 'web' ? new FirebaseAnalyticsService() : new NoopAnalyticsService();

// Export class for testing
export { FirebaseAnalyticsService, NoopAnalyticsService };
