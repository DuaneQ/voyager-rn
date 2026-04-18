import { NoopAnalyticsService } from '../../services/analytics/AnalyticsService';
import type { AnalyticsEvent, AnalyticsEventParams, IAnalyticsService } from '../../services/analytics/AnalyticsService';

describe('AnalyticsService', () => {
  describe('NoopAnalyticsService', () => {
    let service: IAnalyticsService;

    beforeEach(() => {
      service = new NoopAnalyticsService();
    });

    it('implements IAnalyticsService interface', () => {
      expect(service.logEvent).toBeDefined();
      expect(typeof service.logEvent).toBe('function');
    });

    it('does not throw when logging events without params', () => {
      expect(() => service.logEvent('landing_page_view')).not.toThrow();
    });

    it('does not throw when logging events with params', () => {
      expect(() =>
        service.logEvent('landing_cta_click', { cta: 'hero' })
      ).not.toThrow();
    });

    it('accepts all landing event types', () => {
      const landingEvents: AnalyticsEvent[] = [
        'landing_page_view',
        'landing_cta_click',
        'landing_social_proof_interaction',
        'landing_video_play',
        'landing_faq_toggle',
        'landing_testimonial_view',
      ];
      landingEvents.forEach((event) => {
        expect(() => service.logEvent(event)).not.toThrow();
      });
    });

    it('accepts all signup event types', () => {
      const signupEvents: AnalyticsEvent[] = [
        'signup_start',
        'signup_email_entered',
        'signup_verification_sent',
        'signup_verification_complete',
        'signup_password_set',
        'signup_complete',
      ];
      signupEvents.forEach((event) => {
        expect(() => service.logEvent(event)).not.toThrow();
      });
    });

    it('accepts all onboard event types', () => {
      const onboardEvents: AnalyticsEvent[] = [
        'onboard_start',
        'onboard_first_itinerary_start',
        'onboard_first_itinerary_complete',
        'onboard_first_match_view',
      ];
      onboardEvents.forEach((event) => {
        expect(() => service.logEvent(event)).not.toThrow();
      });
    });

    it('accepts various param types', () => {
      const params: AnalyticsEventParams = {
        cta: 'hero',
        step: 1,
        completed: true,
        extra: undefined,
      };
      expect(() => service.logEvent('landing_cta_click', params)).not.toThrow();
    });
  });

  describe('analyticsService singleton', () => {
    it('is exported and has logEvent method', () => {
      // In test environment (not web), the singleton should be a NoopAnalyticsService
      const { analyticsService } = require('../../services/analytics/AnalyticsService');
      expect(analyticsService).toBeDefined();
      expect(typeof analyticsService.logEvent).toBe('function');
    });

    it('noop singleton does not throw on any event', () => {
      const { analyticsService } = require('../../services/analytics/AnalyticsService');
      expect(() => analyticsService.logEvent('landing_page_view')).not.toThrow();
      expect(() =>
        analyticsService.logEvent('signup_start', { source: 'test' })
      ).not.toThrow();
    });
  });
});
