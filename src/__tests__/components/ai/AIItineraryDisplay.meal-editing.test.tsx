/**
 * Tests for inline meal editing functionality in AIItineraryDisplay
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { AIItineraryDisplay } from '../../../components/ai/AIItineraryDisplay';
import { Alert } from 'react-native';

// Mock dependencies
jest.mock('../../../hooks/useAIGeneratedItineraries', () => ({
  useAIGeneratedItineraries: () => ({
    itineraries: [],
    loading: false,
    error: null,
    refreshItineraries: jest.fn(() => Promise.resolve())
  })
}));

jest.mock('../../../hooks/useUpdateItinerary', () => ({
  useUpdateItinerary: () => ({
    updateItinerary: jest.fn(() => Promise.resolve({ success: true })),
    loading: false,
    error: null
  })
}));

jest.mock('../../../config/firebaseConfig', () => ({
  db: {},
  functions: {}
}));

jest.spyOn(Alert, 'alert');

describe('AIItineraryDisplay - Inline Meal Editing', () => {
  const mockItinerary = {
    id: 'test-itinerary-123',
    userId: 'user-456',
    destination: 'Paris, France',
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
          days: [
            {
              day: 1,
              date: '2025-08-01',
              meals: [
                {
                  name: 'Breakfast',
                  type: 'Breakfast',
                  time: '08:00',
                  restaurant: {
                    name: 'Café de Flore',
                    description: 'Historic Left Bank café',
                    location: '172 Boulevard Saint-Germain',
                    rating: 4.5,
                    userRatingsTotal: 2500,
                    phone: '+33 1 45 48 55 26',
                    website: 'https://cafedeflore.fr',
                    estimatedCost: '$30'
                  }
                },
                {
                  name: 'Lunch',
                  type: 'Lunch',
                  time: '13:00',
                  restaurant: {
                    name: 'Le Jules Verne',
                    description: 'Michelin-starred restaurant in Eiffel Tower',
                    location: {
                      name: 'Eiffel Tower',
                      address: 'Avenue Gustave Eiffel'
                    }
                  },
                  cost: '$150'
                }
              ]
            }
          ]
        },
        recommendations: {
          accommodations: []
        }
      }
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z'
  };

  describe('Meal Edit Mode Toggle', () => {
    it('should show edit icon for each meal in edit mode', () => {
      const { getByTestId, getByText, getAllByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Expand meals section
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Should show edit icons for meals
      waitFor(() => {
        const editIcons = getAllByTestId('create');
        expect(editIcons.length).toBeGreaterThan(0);
      });
    });

    it('should toggle meal into inline edit mode when edit icon is pressed', () => {
      const { getByTestId, getByText, getAllByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Press edit icon for first meal
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      // Should show checkmark icon (done editing)
      waitFor(() => {
        expect(getAllByTestId('checkmark-circle').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Inline Meal Field Editing', () => {
    it('should allow editing meal name', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Enter inline edit mode for first meal
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      // Find and edit the name input
      waitFor(() => {
        const nameInput = getByDisplayValue('Breakfast');
        fireEvent.changeText(nameInput, 'Continental Breakfast');
        expect(nameInput.props.value).toBe('Continental Breakfast');
      });
    });

    it('should allow editing meal time', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Enter inline edit mode
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const timeInput = getByDisplayValue('08:00');
        fireEvent.changeText(timeInput, '09:00');
        expect(timeInput.props.value).toBe('09:00');
      });
    });

    it('should allow editing restaurant name', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Enter inline edit mode
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const restaurantInput = getByDisplayValue('Café de Flore');
        fireEvent.changeText(restaurantInput, 'Café Les Deux Magots');
        expect(restaurantInput.props.value).toBe('Café Les Deux Magots');
      });
    });

    it('should allow editing restaurant description', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Enter inline edit mode
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const descInput = getByDisplayValue('Historic Left Bank café');
        fireEvent.changeText(descInput, 'Legendary literary café');
        expect(descInput.props.value).toBe('Legendary literary café');
      });
    });

    it('should allow editing restaurant location', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Enter inline edit mode
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const locationInput = getByDisplayValue('172 Boulevard Saint-Germain');
        fireEvent.changeText(locationInput, '173 Boulevard Saint-Germain');
        expect(locationInput.props.value).toBe('173 Boulevard Saint-Germain');
      });
    });
  });

  describe('Edit Mode Persistence', () => {
    it('should maintain edits when switching between meals', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Edit first meal
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const nameInput = getByDisplayValue('Breakfast');
        fireEvent.changeText(nameInput, 'Brunch');
      });
      
      // Switch to second meal
      fireEvent.press(editIcons[1]);
      
      // Switch back to first meal
      fireEvent.press(editIcons[0]);
      
      // First meal should still have the edited value
      waitFor(() => {
        const nameInput = getByDisplayValue('Brunch');
        expect(nameInput).toBeTruthy();
      });
    });
  });

  describe('Cancel with Meal Edits', () => {
    it('should discard meal edits when cancel is pressed', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand meals
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('🍽️ Meals'));
      
      // Edit first meal
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const nameInput = getByDisplayValue('Breakfast');
        fireEvent.changeText(nameInput, 'Brunch');
      });
      
      // Cancel edit mode
      fireEvent.press(getByTestId('cancel-button'));
      
      // Should show original values
      waitFor(() => {
        expect(getByText('Breakfast')).toBeTruthy();
      });
    });
  });
});
