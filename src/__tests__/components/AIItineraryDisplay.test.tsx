import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, Alert } from 'react-native';

// Mock firestore and use centralized firebaseConfig mock
jest.mock('../../config/firebaseConfig');
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ path: 'itineraries/test-id' })),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'TIMESTAMP'),
}));

// Mock ShareAIItineraryModal to avoid heavy implementation
jest.mock('../../components/modals/ShareAIItineraryModal', () => ({
  ShareAIItineraryModal: ({ visible }: any) => {
    const React = require('react');
    return visible ? React.createElement('Text', { testID: 'share-modal-visible' }, 'shared') : null;
  },
}));

// Mock visual libs used by the component
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

import { AIItineraryDisplay } from '../../components/ai/AIItineraryDisplay';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';
import { setDoc } from 'firebase/firestore';

describe('AIItineraryDisplay', () => {
  it('shows no-data placeholder when itinerary is null', () => {
    const { getByText } = render(<AIItineraryDisplay itinerary={null as any} />);
    expect(getByText('No itinerary data available')).toBeTruthy();
  });

  it('renders header and handles share flow', async () => {
    const itinerary: any = {
      id: 'ai-1',
      destination: 'Tokyo',
      description: 'Amazing Tokyo Adventure',
      startDate: '2025-12-01',
      endDate: '2025-12-07',
      response: { data: {} },
    };

    const { getByTestId, getByText, queryByTestId } = render(<AIItineraryDisplay itinerary={itinerary} />);

    // header content
    expect(getByText('Tokyo')).toBeTruthy();
    expect(getByText('Amazing Tokyo Adventure')).toBeTruthy();

    // press share button
    const shareButton = getByTestId('share-button');
    fireEvent.press(shareButton);

    await waitFor(() => expect(setDoc).toHaveBeenCalled());

    // share modal should become visible (our mock renders testID)
    await waitFor(() => expect(queryByTestId('share-modal-visible')).toBeTruthy());
  });

  it('renders flights accordion and expands to show flight details', async () => {
    const itinerary: any = {
      id: 'ai-2',
      destination: 'Paris',
      startDate: '2025-10-01',
      endDate: '2025-10-07',
      response: { data: {} },
      flights: [
        { 
          airline: 'AirTest',
          flightNumber: 'AT123',
          route: 'JFK → CDG',
          departure: { date: '2025-10-01', time: '08:00', iata: 'JFK' },
          arrival: { date: '2025-10-01', time: '15:00', iata: 'CDG' },
          duration: '7h', 
          stops: 0, 
          cabin: 'economy',
          price: { amount: 500, currency: 'USD' }
        }
      ],
    };

    const { getByText } = render(<AIItineraryDisplay itinerary={itinerary} />);

    // Flight header exists
    expect(getByText(/Flight Options/)).toBeTruthy();

    // Expand flights by pressing header
    const header = getByText(/Flight Options/);
    fireEvent.press(header);

    // After expansion, flight details should appear
    await waitFor(() => expect(getByText(/08:00/)).toBeTruthy());
    expect(getByText('7h')).toBeTruthy();
    expect(getByText(/AirTest/)).toBeTruthy();
    expect(getByText(/\$500/)).toBeTruthy();
    expect(getByText(/JFK → CDG/)).toBeTruthy();
  });
});
/** Edge case tests continue below (imports/mocks consolidated at top) */

describe('AIItineraryDisplay - Edge Cases', () => {
  const mockItinerary: AIGeneratedItinerary = {
    id: 'test-123',
    userId: 'user-123',
    destination: 'Tokyo, Japan',
    startDate: '2025-09-01',
    endDate: '2025-09-07',
    startDay: 1,
    endDay: 7,
    ai_status: 'completed',
    createdAt: '2025-10-31T00:00:00Z',
    updatedAt: '2025-10-31T00:00:00Z',
    response: {
      success: true,
      data: {
        itinerary: {
          id: 'test-123',
          destination: 'Tokyo, Japan',
          startDate: '2025-09-01',
          endDate: '2025-09-07',
          description: 'Amazing Tokyo adventure',
          days: [
            {
              day: 1,
              date: '2025-09-01',
              activities: [
                {
                  name: 'Visit Senso-ji Temple',
                  startTime: '10:00',
                  endTime: '12:00',
                  description: 'Ancient Buddhist temple'
                }
              ],
              meals: []
            }
          ]
        },
        metadata: {
          generationId: 'gen-123',
          confidence: 0.95
        },
        recommendations: {
          accommodations: [],
          alternativeActivities: [],
          alternativeRestaurants: []
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Share Functionality Edge Cases', () => {
    it('prevents multiple simultaneous shares (debouncing)', async () => {
      (setDoc as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      const { getByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      const shareButton = getByTestId('share-button');

      // Rapid clicks
      fireEvent.press(shareButton);
      fireEvent.press(shareButton);
      fireEvent.press(shareButton);

      // Wait for first share to complete
      await waitFor(() => {
        // Should only call setDoc once despite multiple clicks
        expect(setDoc).toHaveBeenCalledTimes(1);
      });
    });

    it('handles Firestore write failure gracefully', async () => {
      const firestoreError = new Error('Permission denied');
      (setDoc as jest.Mock).mockRejectedValueOnce(firestoreError);

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      const shareButton = getByTestId('share-button');

      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Share Error',
          'Unable to create a shareable link right now. Please try again.',
          [{ text: 'OK' }]
        );
      });

      alertSpy.mockRestore();
    });

    it('disables share button while sharing is in progress', async () => {
      (setDoc as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 500)));

      const { getByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      const shareButton = getByTestId('share-button');

      fireEvent.press(shareButton);

      // Wait for state update - button should be disabled (check accessibilityState)
      await waitFor(() => {
        expect(shareButton.props.accessibilityState?.disabled).toBe(true);
      });

      // Wait for completion - button should be enabled again
      await waitFor(() => {
        expect(shareButton.props.accessibilityState?.disabled).toBe(false);
      }, { timeout: 1000 });
    });

    it('handles missing itinerary data during share', async () => {
      const { getByTestId } = render(<AIItineraryDisplay itinerary={null as any} />);
      
      // Should not render or crash
      expect(() => getByTestId('share-button')).toThrow();
    });

    it('preserves full itinerary structure during share', async () => {
      const complexItinerary = {
        ...mockItinerary,
        response: {
          ...mockItinerary.response!,
          data: {
            ...mockItinerary.response!.data!,
            recommendations: {
              accommodations: [{ name: 'Hotel Test' }],
              alternativeActivities: [{ name: 'Alternative 1' }],
              alternativeRestaurants: [{ name: 'Restaurant 1' }]
            },
            metadata: {
              generationId: 'gen-456',
              confidence: 0.88,
              filtering: {
                userMustInclude: ['temples'],
                userMustAvoid: ['crowds']
              }
            }
          }
        }
      };

      const { getByTestId } = render(<AIItineraryDisplay itinerary={complexItinerary} />);
      const shareButton = getByTestId('share-button');

      fireEvent.press(shareButton);

      await waitFor(() => {
        expect(setDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            id: 'test-123',
            response: expect.objectContaining({
              data: expect.objectContaining({
                recommendations: expect.any(Object),
                metadata: expect.objectContaining({
                  filtering: expect.any(Object)
                })
              })
            })
          }),
          { merge: false }
        );
      });
    });
  });

  describe('Data Extraction Edge Cases', () => {
    it('handles missing response.data.assistant without crashing', () => {
      const noAssistantData = {
        ...mockItinerary,
        response: {
          success: true,
          data: {
            itinerary: mockItinerary.response!.data!.itinerary
          }
        }
      };

      const { getByText } = render(<AIItineraryDisplay itinerary={noAssistantData} />);
      expect(getByText('Tokyo, Japan')).toBeTruthy();
    });

    it('handles corrupted assistant JSON data', () => {
      const corruptedJson = {
        ...mockItinerary,
        response: {
          success: true,
          data: {
            assistant: '{ invalid json',
            itinerary: mockItinerary.response!.data!.itinerary
          }
        }
      };

      // Should not crash
      const { getByText } = render(<AIItineraryDisplay itinerary={corruptedJson} />);
      expect(getByText('Tokyo, Japan')).toBeTruthy();
    });

    it('handles missing dailyPlans/days data', () => {
      const noDays = {
        ...mockItinerary,
        response: {
          success: true,
          data: {
            itinerary: {
              ...mockItinerary.response!.data!.itinerary,
              days: undefined,
              dailyPlans: undefined
            }
          }
        }
      };

      const { queryByText } = render(<AIItineraryDisplay itinerary={noDays} />);
      
      // Should not show daily activities section
      expect(queryByText('📅 Daily Activities')).toBeFalsy();
    });

    it('handles empty arrays for recommendations', () => {
      const emptyRecommendations = {
        ...mockItinerary,
        response: {
          ...mockItinerary.response!,
          data: {
            ...mockItinerary.response!.data!,
            recommendations: {
              accommodations: [],
              alternativeActivities: [],
              alternativeRestaurants: []
            }
          }
        }
      };

      const { queryByText } = render(<AIItineraryDisplay itinerary={emptyRecommendations} />);
      
      // Should not show empty sections
      expect(queryByText('🏨 Accommodation Recommendations')).toBeFalsy();
      expect(queryByText('🎯 Alternative Activities')).toBeFalsy();
      expect(queryByText('🍽️ Alternative Restaurants')).toBeFalsy();
    });

    it('handles null/undefined in transportation data', () => {
      const noTransport = {
        ...mockItinerary,
        response: {
          ...mockItinerary.response!,
          data: {
            ...mockItinerary.response!.data!,
            transportation: null
          }
        }
      };

      // Should not crash
      const { getByText } = render(<AIItineraryDisplay itinerary={noTransport} />);
      expect(getByText('Tokyo, Japan')).toBeTruthy();
    });
  });

  describe('Date Formatting Edge Cases', () => {
    it('handles invalid date strings gracefully', () => {
      const invalidDates = {
        ...mockItinerary,
        startDate: 'invalid-date',
        endDate: '2025-13-45'
      };

      // Should not crash, will show original string
      const { getByText } = render(<AIItineraryDisplay itinerary={invalidDates} />);
      expect(getByText(/invalid-date/)).toBeTruthy();
    });

    it('handles missing dates', () => {
      const noDates = {
        ...mockItinerary,
        startDate: '',
        endDate: ''
      };

      const { getByText } = render(<AIItineraryDisplay itinerary={noDates} />);
      expect(getByText('Tokyo, Japan')).toBeTruthy();
    });
  });
});
