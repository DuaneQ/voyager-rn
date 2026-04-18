import { renderHook, act } from '@testing-library/react-native';
import { useAnalytics } from '../../hooks/useAnalytics';

// Mock the analytics service
jest.mock('../../services/analytics/AnalyticsService', () => {
  const mockLogEvent = jest.fn();
  return {
    analyticsService: { logEvent: mockLogEvent },
    __mockLogEvent: mockLogEvent,
  };
});

const getMockLogEvent = () =>
  require('../../services/analytics/AnalyticsService').__mockLogEvent as jest.Mock;

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a logEvent function', () => {
    const { result } = renderHook(() => useAnalytics());
    expect(result.current.logEvent).toBeDefined();
    expect(typeof result.current.logEvent).toBe('function');
  });

  it('calls analyticsService.logEvent with event name', () => {
    const mockLogEvent = getMockLogEvent();
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.logEvent('landing_page_view');
    });

    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith('landing_page_view', undefined);
  });

  it('forwards params to analyticsService.logEvent', () => {
    const mockLogEvent = getMockLogEvent();
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.logEvent('landing_cta_click', { cta: 'hero' });
    });

    expect(mockLogEvent).toHaveBeenCalledWith('landing_cta_click', { cta: 'hero' });
  });

  it('returns a stable logEvent reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useAnalytics());
    const first = result.current.logEvent;
    rerender({});
    const second = result.current.logEvent;
    expect(first).toBe(second);
  });

  it('can log multiple events', () => {
    const mockLogEvent = getMockLogEvent();
    const { result } = renderHook(() => useAnalytics());

    act(() => {
      result.current.logEvent('landing_page_view');
      result.current.logEvent('landing_cta_click', { cta: 'footer_cta' });
      result.current.logEvent('landing_faq_toggle', { question: 'Is this a dating app?' });
    });

    expect(mockLogEvent).toHaveBeenCalledTimes(3);
  });
});
