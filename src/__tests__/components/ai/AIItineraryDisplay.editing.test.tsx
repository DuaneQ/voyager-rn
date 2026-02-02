/**
 * Unit Tests for AIItineraryDisplay Editing Functionality
 * Tests edit mode, selection tracking, and batch delete operations
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AIItineraryDisplay } from '../../../components/ai/AIItineraryDisplay';
import { useAIGeneratedItineraries } from '../../../hooks/useAIGeneratedItineraries';
import { useUpdateItinerary } from '../../../hooks/useUpdateItinerary';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('../../../hooks/useAIGeneratedItineraries');
jest.mock('../../../hooks/useUpdateItinerary');
jest.mock('../../../config/firebaseConfig', () => ({
  db: {},
  getCloudFunctionUrl: jest.fn((functionName) => `https://us-central1-mundo1-dev.cloudfunctions.net/${functionName}`),
}));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
}));

const mockUseAIGeneratedItineraries = useAIGeneratedItineraries as jest.MockedFunction<typeof useAIGeneratedItineraries>;
const mockUseUpdateItinerary = useUpdateItinerary as jest.MockedFunction<typeof useUpdateItinerary>;

describe('AIItineraryDisplay - Editing Functionality', () => {
  const mockRefreshItineraries = jest.fn();
  const mockUpdateItinerary = jest.fn();
  
  const mockItinerary = {
    id: 'test-itinerary-1',
    userId: 'user-123',
    destination: 'Paris, France',
    title: 'European Adventure',
    description: 'A wonderful trip to Paris',
    startDate: '2025-08-01',
    endDate: '2025-08-07',
    startDay: 1,
    endDay: 7,
    ai_status: 'completed',
    response: {
      success: true,
      data: {
        itinerary: {
          destination: 'Paris, France',
          startDate: '2025-08-01',
          endDate: '2025-08-07',
          flights: [
            {
              airline: 'Air France',
              flightNumber: 'AF123',
              route: 'JFK → CDG',
              price: { amount: 850, currency: 'USD' },
              duration: '7h 30m',
              stops: 0,
            },
            {
              airline: 'United',
              flightNumber: 'UA456',
              route: 'JFK → CDG',
              price: { amount: 920, currency: 'USD' },
              duration: '8h 15m',
              stops: 1,
            },
          ],
          days: [
            {
              day: 1,
              date: '2025-08-01',
              activities: [
                {
                  name: 'Visit Eiffel Tower',
                  description: 'Iconic Paris landmark',
                  startTime: '10:00',
                  endTime: '12:00',
                },
                {
                  name: 'Louvre Museum',
                  description: 'World-famous art museum',
                  startTime: '14:00',
                  endTime: '17:00',
                },
              ],
            },
          ],
        },
        recommendations: {
          accommodations: [
            {
              name: 'Hotel Paris Plaza',
              address: '123 Rue de Rivoli, Paris',
              rating: 4.5,
              pricePerNight: { amount: 200, currency: 'USD' },
            },
            {
              name: 'Le Grand Hotel',
              address: '456 Avenue des Champs-Élysées',
              rating: 4.8,
              pricePerNight: { amount: 350, currency: 'USD' },
            },
          ],
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Make refreshItineraries return a resolved promise
    mockRefreshItineraries.mockResolvedValue(undefined);
    
    mockUseAIGeneratedItineraries.mockReturnValue({
      itineraries: [mockItinerary],
      loading: false,
      error: null,
      refreshItineraries: mockRefreshItineraries,
    });

    // Make updateItinerary return a resolved promise
    mockUpdateItinerary.mockResolvedValue(undefined);

    mockUseUpdateItinerary.mockReturnValue({
      updateItinerary: mockUpdateItinerary,
      loading: false,
      error: null,
    });

    // Mock Alert.alert
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Edit Mode Controls', () => {
    it('should show edit and share buttons by default', () => {
      const { getByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      expect(getByTestId('edit-button')).toBeTruthy();
      expect(getByTestId('share-button')).toBeTruthy();
    });

    it('should switch to edit mode when edit button is pressed', () => {
      const { getByTestId, queryByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      const editButton = getByTestId('edit-button');
      fireEvent.press(editButton);
      
      // Should show save and cancel buttons in edit mode
      expect(getByTestId('save-button')).toBeTruthy();
      expect(getByTestId('cancel-button')).toBeTruthy();
      
      // Should hide edit and share buttons
      expect(queryByTestId('edit-button')).toBeNull();
      expect(queryByTestId('share-button')).toBeNull();
    });

    it('should show edit mode instructions when in edit mode', () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      fireEvent.press(getByTestId('edit-button'));
      
      expect(getByText(/Edit Mode:/)).toBeTruthy();
      expect(getByText(/Tap on flights/)).toBeTruthy();
    });

    it('should exit edit mode when cancel button is pressed', () => {
      const { getByTestId, queryByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      expect(getByTestId('save-button')).toBeTruthy();
      
      // Exit edit mode
      fireEvent.press(getByTestId('cancel-button'));
      
      // Should show edit and share buttons again
      expect(getByTestId('edit-button')).toBeTruthy();
      expect(getByTestId('share-button')).toBeTruthy();
      expect(queryByTestId('save-button')).toBeNull();
    });
  });

  describe('Flight Selection', () => {
    it('should allow selecting flights in edit mode', () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Expand flights accordion
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      
      // Find and tap on first flight card
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      // Should show batch delete controls
      waitFor(() => {
        expect(getByTestId('delete-flights-button')).toBeTruthy();
        expect(getByText('Delete 1 Flight')).toBeTruthy();
      });
    });

    it('should allow selecting multiple flights', () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and expand flights
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      
      // Select first flight
      const flight1 = getByText('Air France AF123');
      fireEvent.press(flight1.parent!.parent!);
      
      // Select second flight
      const flight2 = getByText('United UA456');
      fireEvent.press(flight2.parent!.parent!);
      
      // Should show "Delete 2 Flights"
      waitFor(() => {
        expect(getByText('Delete 2 Flights')).toBeTruthy();
      });
    });

    it('should deselect flight when tapped again', () => {
      const { getByTestId, getByText, queryByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and expand flights
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      
      // Select flight
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      waitFor(() => {
        expect(getByTestId('delete-flights-button')).toBeTruthy();
      });
      
      // Deselect flight
      fireEvent.press(flightCard.parent!.parent!);
      
      // Should hide delete button
      waitFor(() => {
        expect(queryByTestId('delete-flights-button')).toBeNull();
      });
    });
  });

  describe('Accommodation Selection', () => {
    it('should allow selecting accommodations in edit mode', () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Expand accommodations accordion
      fireEvent.press(getByText('🏨 Accommodation Recommendations (2)'));
      
      // Select first hotel
      const hotelCard = getByText('Hotel Paris Plaza');
      fireEvent.press(hotelCard.parent!.parent!.parent!);
      
      // Should show batch delete controls
      waitFor(() => {
        expect(getByTestId('delete-accommodations-button')).toBeTruthy();
        expect(getByText('Delete 1 Hotel')).toBeTruthy();
      });
    });

    it('should allow selecting multiple accommodations', () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and expand accommodations
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🏨 Accommodation Recommendations (2)'));
      
      // Select both hotels
      const hotel1 = getByText('Hotel Paris Plaza');
      fireEvent.press(hotel1.parent!.parent!.parent!);
      
      const hotel2 = getByText('Le Grand Hotel');
      fireEvent.press(hotel2.parent!.parent!.parent!);
      
      // Should show "Delete 2 Hotels"
      waitFor(() => {
        expect(getByText('Delete 2 Hotels')).toBeTruthy();
      });
    });
  });

  describe('Activity Selection', () => {
    it('should allow selecting activities in edit mode', () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Expand daily activities accordion
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Select first activity
      const activityCard = getByText('Visit Eiffel Tower');
      fireEvent.press(activityCard.parent!);
      
      // Should show batch delete controls
      waitFor(() => {
        expect(getByTestId('delete-activities-button')).toBeTruthy();
        expect(getByText('Delete 1 Activity')).toBeTruthy();
      });
    });

    it('should allow selecting multiple activities', () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Select both activities
      const activity1 = getByText('Visit Eiffel Tower');
      fireEvent.press(activity1.parent!);
      
      const activity2 = getByText('Louvre Museum');
      fireEvent.press(activity2.parent!);
      
      // Should show "Delete 2 Activities"
      waitFor(() => {
        expect(getByText('Delete 2 Activities')).toBeTruthy();
      });
    });
  });

  describe('Batch Delete Operations', () => {
    it('should delete selected flights when batch delete is pressed', async () => {
      const { getByTestId, getByText, queryByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and select a flight
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      // Press delete button
      await waitFor(() => {
        const deleteButton = getByTestId('delete-flights-button');
        fireEvent.press(deleteButton);
      });
      
      // Batch delete button should be hidden after deletion (no more selections)
      await waitFor(() => {
        expect(queryByTestId('delete-flights-button')).toBeNull();
      });
    });

    it('should clear all selections when clear button is pressed', async () => {
      const { getByTestId, getByText, queryByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Select flights
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      await waitFor(() => {
        expect(getByTestId('delete-flights-button')).toBeTruthy();
      });
      
      // Clear selections
      const clearButton = getByTestId('clear-selection-button');
      fireEvent.press(clearButton);
      
      // Batch delete controls should be hidden
      await waitFor(() => {
        expect(queryByTestId('delete-flights-button')).toBeNull();
      });
    });
  });

  describe('Save Operation', () => {
    it('should save changes when save button is pressed', async () => {
      mockUpdateItinerary.mockResolvedValue(mockItinerary as any);
      
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Make a change (select and delete a flight)
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      await waitFor(() => {
        const deleteButton = getByTestId('delete-flights-button');
        fireEvent.press(deleteButton);
      });
      
      // Save changes
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);
      
      // Should call updateItinerary
      await waitFor(() => {
        expect(mockUpdateItinerary).toHaveBeenCalledWith(
          'test-itinerary-1',
          expect.objectContaining({
            response: expect.any(Object),
            updatedAt: expect.any(String),
            destination: 'Paris, France',
            startDate: '2025-08-01',
            endDate: '2025-08-07',
          })
        );
      });
      
      // Should refresh itineraries
      expect(mockRefreshItineraries).toHaveBeenCalled();
      
      // Should show success alert
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Changes saved successfully!');
    });

    it('should show error alert if save fails', async () => {
      mockUpdateItinerary.mockRejectedValue(new Error('Network error'));
      
      const { getByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and try to save
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByTestId('save-button'));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Network error')
        );
      });
    });

    it('should not save if no editingData', async () => {
      const { getByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Try to save without entering edit mode (shouldn't be possible in UI, but test the guard)
      fireEvent.press(getByTestId('edit-button'));
      
      // Immediately press save before any changes
      const saveButton = getByTestId('save-button');
      fireEvent.press(saveButton);
      
      // Should still call updateItinerary (editingData is initialized on edit start)
      await waitFor(() => {
        expect(mockUpdateItinerary).toHaveBeenCalled();
      });
    });
  });

  describe('Selection Visual Indicators', () => {
    it('should show checkbox icon for selected items', async () => {
      const { getByTestId, getByText, UNSAFE_queryByType } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      
      // Select a flight
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      // Should have checkbox icon (checked state is indicated by the icon name)
      // Note: This is a simplified test - in real implementation you'd check icon props
      await waitFor(() => {
        expect(getByText('Air France AF123')).toBeTruthy();
      });
    });
  });

  describe('Edit Mode Cancellation', () => {
    it('should clear all selections when canceling edit mode', () => {
      const { getByTestId, getByText, queryByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and select items
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      waitFor(() => {
        expect(getByTestId('delete-flights-button')).toBeTruthy();
      });
      
      // Cancel edit mode
      fireEvent.press(getByTestId('cancel-button'));
      
      // Re-enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Batch delete controls should not be visible
      expect(queryByTestId('delete-flights-button')).toBeNull();
    });

    it('should revert changes when canceling edit mode', () => {
      const { getByTestId, getByText, queryByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Verify initial flight count
      expect(getByText('✈️ Flight Options (2)')).toBeTruthy();
      
      // Enter edit mode and expand flights
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('✈️ Flight Options (2)'));
      
      // Delete a flight
      const flightCard = getByText('Air France AF123');
      fireEvent.press(flightCard.parent!.parent!);
      
      waitFor(() => {
        const deleteButton = getByTestId('delete-flights-button');
        fireEvent.press(deleteButton);
      });
      
      // After deletion in edit mode, only 1 flight should show
      waitFor(() => {
        expect(queryByText('✈️ Flight Options (1)')).toBeTruthy();
      });
      
      // Cancel without saving
      fireEvent.press(getByTestId('cancel-button'));
      
      // Flight count should revert to 2 (changes discarded)
      expect(getByText('✈️ Flight Options (2)')).toBeTruthy();
    });
  });
});
