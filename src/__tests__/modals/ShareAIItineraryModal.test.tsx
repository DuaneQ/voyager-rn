/**
 * ShareAIItineraryModal Tests - React Native
 * Comprehensive test coverage matching PWA test patterns
 */

// Mock dependencies (hoisted so mocks are applied before modules are imported)
// We use the root project manual mock for 'react-native' (configured in
// jest.config.js) so the component and tests share the same mocked surface.
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  dismissedAction: 'dismissedAction',
  sharedAction: 'sharedAction',
}));

jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  setString: jest.fn(),
  getString: jest.fn(() => Promise.resolve('')),
}));

jest.mock('../../config/firebaseConfig', () => {
  // Replicate actual implementation logic for testing branded domains
  const APP_DOMAIN = 'https://mundo1-dev.web.app'; // __DEV__ === true in tests
  const SHAREABLE_FUNCTIONS = new Set(['videoShare', 'itineraryShare']);
  
  return {
    db: {},
    APP_DOMAIN,
    getCloudFunctionUrl: (functionName: string) => {
      if (SHAREABLE_FUNCTIONS.has(functionName)) {
        return APP_DOMAIN;
      }
      return `https://us-central1-mundo1-dev.cloudfunctions.net/${functionName}`;
    },
  };
});
// Note: @expo/vector-icons is mocked in jest.setup.js to a functional stub

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';
// Static import (ensure jest.mock hoists above this import)
import ShareAIItineraryModal from '../../components/modals/ShareAIItineraryModal';

describe('ShareAIItineraryModal', () => {
  const mockItinerary: AIGeneratedItinerary = {
    id: 'test-itinerary-123',
    userId: 'user-123',
    destination: 'Paris, France',
    startDate: '2025-08-15',
    endDate: '2025-08-22',
    startDay: 1,
    endDay: 8,
    ai_status: 'completed',
    createdAt: '2025-10-31T00:00:00Z',
    updatedAt: '2025-10-31T00:00:00Z',
    response: {
      success: true,
      data: {
        itinerary: {
          id: 'test-itinerary-123',
          destination: 'Paris, France',
          startDate: '2025-08-15',
          endDate: '2025-08-22',
          description: 'A wonderful AI-generated trip to the City of Light',
          days: []
        },
        metadata: {
          generationId: 'gen-123',
          confidence: 0.95,
          processingTime: 45000,
          aiModel: 'gpt-4o-mini',
          version: '1.0'
        },
        costBreakdown: {
          total: 2500,
          perPerson: 1250,
          byCategory: {
            accommodation: 800,
            food: 600,
            activities: 400,
            transportation: 500,
            misc: 200
          }
        }
      }
    }
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    itinerary: mockItinerary
  };

  // Helper to render the modal after resetting modules so hoisted
  // mocks for internal react-native paths are applied. This prevents
  // import-time races where the component imports RN internals before
  // the test's jest.mock calls are registered.
  const renderShareModal = (props: any = {}) => {
    const merged = { ...defaultProps, ...props };
    return render(<ShareAIItineraryModal {...merged} />);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders share modal with itinerary information', () => {
    const { getByText } = renderShareModal();

    expect(getByText('Share Itinerary')).toBeTruthy();
    expect(getByText('Paris, France')).toBeTruthy();
    expect(getByText('Aug 15, 2025 - Aug 22, 2025')).toBeTruthy();
    expect(getByText(/"A wonderful AI-generated trip to the City of Light"/)).toBeTruthy();
  });

  it('displays the correct share URL', () => {
    const { getByDisplayValue } = renderShareModal();

    const shareUrlInput = getByDisplayValue('https://mundo1-dev.web.app/share-itinerary/test-itinerary-123');
    expect(shareUrlInput).toBeTruthy();
    expect(shareUrlInput.props.editable).toBe(false);
  });

  it('copies link to clipboard when copy button is pressed', async () => {
    const { getByTestId } = renderShareModal();

    const copyButton = getByTestId('copy-button');
    
    fireEvent.press(copyButton);

    await waitFor(() => {
      const RN = require('react-native');
      expect(RN.Clipboard.setString).toHaveBeenCalledWith('https://mundo1-dev.web.app/share-itinerary/test-itinerary-123');
    });
  });

  it('calls onClose when close button is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = renderShareModal({ onClose: mockOnClose });

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows info alert about public sharing', () => {
    const { getByText } = renderShareModal();

    expect(getByText('Anyone with this link can view your itinerary. No login required!')).toBeTruthy();
  });

  it('handles missing itinerary data gracefully', () => {
    const itineraryWithoutData = {
      ...mockItinerary,
      response: undefined
    };

    const { getByText } = renderShareModal({ itinerary: itineraryWithoutData as any });

    expect(getByText('Paris, France')).toBeTruthy(); // Falls back to top-level destination
  });

  it('formats dates correctly', () => {
    const { getByText } = renderShareModal();

    expect(getByText('Aug 15, 2025 - Aug 22, 2025')).toBeTruthy();
  });

  it('truncates long descriptions for preview', () => {
    const longDescriptionItinerary = {
      ...mockItinerary,
      response: {
        ...mockItinerary.response!,
        data: {
          ...mockItinerary.response!.data!,
          itinerary: {
            ...mockItinerary.response!.data!.itinerary,
            description: 'This is a very long description that should be truncated when displayed in the share modal preview because it exceeds the character limit that we want to show for the preview text'
          }
        }
      }
    };

    const { getByText } = renderShareModal({ itinerary: longDescriptionItinerary });

    // Check for truncated text (React Native renders "..." as three dots)
    expect(getByText(/"This is a very long description that should be truncated when displayed in the share modal previe\.\.\."/)).toBeTruthy();
  });

  it('calls Share API when share button is pressed', async () => {
    const { getByTestId } = renderShareModal();

    const shareButton = getByTestId('share-button');
    fireEvent.press(shareButton);

    await waitFor(() => {
      const RN = require('react-native');
      expect(RN.Share.share).toHaveBeenCalled();
    });
  });

  it('handles share cancellation gracefully', async () => {
    const InternalShare = require('react-native').Share;
    (InternalShare.share as jest.Mock).mockResolvedValueOnce({ action: InternalShare.dismissedAction });

    const { getByTestId } = renderShareModal();

    const shareButton = getByTestId('share-button');
    fireEvent.press(shareButton);

    await waitFor(() => {
      expect(InternalShare.share).toHaveBeenCalled();
    });
    
    // Should not crash or show any errors - just silently handles dismissal
  });

  it('calls onClose when Close button in actions is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = renderShareModal({ onClose: mockOnClose });

    const closeButton = getByTestId('close-action-button');
    fireEvent.press(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('extracts and displays filtering metadata when present', () => {
    const itineraryWithFiltering = {
      ...mockItinerary,
      response: {
        ...mockItinerary.response!,
        data: {
          ...mockItinerary.response!.data!,
          metadata: {
            ...(mockItinerary.response!.data as any).metadata,
            filtering: {
              userMustInclude: ['museums', 'cafes', 'parks'],
              userMustAvoid: ['crowds', 'expensive restaurants']
            }
          }
        }
      }
    };

    const { getByDisplayValue } = renderShareModal({ itinerary: itineraryWithFiltering });
    
    // The share URL should still be present
    expect(getByDisplayValue(/share-itinerary/)).toBeTruthy();
  });

  // ==================== EDGE CASE TESTS ====================

  describe('Edge Cases', () => {
    it('handles missing itinerary data gracefully', () => {
      const incompleteItinerary = {
        ...mockItinerary,
        destination: '',
        response: undefined
      };

      const { getByTestId } = renderShareModal({ itinerary: incompleteItinerary as any });

      // Should still render without crashing
      expect(getByTestId('share-url-input')).toBeTruthy();
    });

    it('handles corrupted response data', () => {
      const corruptedItinerary = {
        ...mockItinerary,
        response: {
          success: false,
          data: null as any
        }
      };

      const { getByTestId } = renderShareModal({ itinerary: corruptedItinerary });

      // Should fallback to top-level destination and dates
      expect(getByTestId('share-url-input')).toBeTruthy();
    });

    it('handles Share API failure by falling back to clipboard', async () => {
      const shareError = new Error('Share API not available');
      const InternalShare = require('react-native').Share;
      (InternalShare.share as jest.Mock).mockRejectedValueOnce(shareError);

  const { getByTestId } = renderShareModal();

      const shareButton = getByTestId('share-button');
      fireEvent.press(shareButton);

      await waitFor(() => {
        // Should fallback to clipboard
        const RN = require('react-native');
        expect(RN.Clipboard.setString).toHaveBeenCalled();
      });
    });

    it('handles clipboard failure gracefully', async () => {
      const clipboardError = new Error('Clipboard not available');
      const InternalClipboard = require('react-native').Clipboard;
      (InternalClipboard.setString as jest.Mock).mockImplementationOnce(() => {
        throw clipboardError;
      });

      // Spy on Alert
      const alertSpy = jest.spyOn(Alert, 'alert');

  const { getByTestId } = renderShareModal();

      const copyButton = getByTestId('copy-button');
      fireEvent.press(copyButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to copy link to clipboard');
      });

      alertSpy.mockRestore();
    });

    it('handles invalid date formats without crashing', () => {
      const invalidDatesItinerary = {
        ...mockItinerary,
        startDate: 'invalid-date',
        endDate: '2025-13-45' // Invalid month/day
      };

      const { getByTestId } = renderShareModal({ itinerary: invalidDatesItinerary });

      // Should still render
      expect(getByTestId('share-url-input')).toBeTruthy();
    });

    it('handles extremely long destination names', () => {
      const longDestination = 'A'.repeat(500);
      const longDestItinerary = {
        ...mockItinerary,
        destination: longDestination,
        response: {
          ...mockItinerary.response!,
          data: {
            ...mockItinerary.response!.data!,
            itinerary: {
              ...mockItinerary.response!.data!.itinerary,
              destination: longDestination
            }
          }
        }
      };

      const { getByTestId } = renderShareModal({ itinerary: longDestItinerary });

      // Should render without layout issues
      expect(getByTestId('share-url-input')).toBeTruthy();
    });

    it('handles userMustInclude/userMustAvoid with non-string values', () => {
      const mixedTypeFiltering = {
        ...mockItinerary,
        response: {
          ...mockItinerary.response!,
          data: {
            ...mockItinerary.response!.data!,
            metadata: {
              ...(mockItinerary.response!.data as any).metadata,
              filtering: {
                userMustInclude: ['museums', { name: 'Eiffel Tower' }, 42, null, undefined],
                userMustAvoid: [{ term: 'crowds' }, 'expensive', true]
              }
            }
          }
        }
      };

      const { getByTestId } = renderShareModal({ itinerary: mixedTypeFiltering });

      // Should extract labels without crashing
      expect(getByTestId('share-url-input')).toBeTruthy();
    });

    it('handles rapid copy button clicks', async () => {
  const { getByTestId } = renderShareModal();

      const copyButton = getByTestId('copy-button');
      
      // Rapid clicks
      fireEvent.press(copyButton);
      fireEvent.press(copyButton);
      fireEvent.press(copyButton);

      await waitFor(() => {
        // Should handle gracefully without errors
        const RN = require('react-native');
        expect(RN.Clipboard.setString).toHaveBeenCalled();
      });
    });

    it('shows copy success indicator and auto-hides', async () => {
  const { getByTestId, queryByText } = renderShareModal();

      const copyButton = getByTestId('copy-button');
      fireEvent.press(copyButton);

      await waitFor(() => {
        // Success indicator should appear
        expect(queryByText(/copied/i)).toBeTruthy();
      });

      // Wait for 3 seconds using real timers
      await new Promise(resolve => setTimeout(resolve, 3100));

      await waitFor(() => {
        // Success indicator should disappear after 3 seconds
        expect(queryByText(/copied/i)).toBeFalsy();
      });
    });
  });
});
