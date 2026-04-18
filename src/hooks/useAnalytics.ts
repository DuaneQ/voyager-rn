/**
 * useAnalytics — React hook for logging conversion-funnel events.
 *
 * Usage:
 *   const { logEvent } = useAnalytics();
 *   logEvent('landing_cta_click', { cta: 'hero' });
 */

import { useCallback } from 'react';
import {
  analyticsService,
  type AnalyticsEvent,
  type AnalyticsEventParams,
} from '../services/analytics/AnalyticsService';

export const useAnalytics = () => {
  const logEvent = useCallback(
    (event: AnalyticsEvent, params?: AnalyticsEventParams) => {
      analyticsService.logEvent(event, params);
    },
    [],
  );

  return { logEvent };
};
