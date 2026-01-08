/**
 * Tests for inline activity editing functionality in AIItineraryDisplay
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

describe('AIItineraryDisplay - Inline Activity Editing', () => {
  const mockItinerary = {
    id: 'test-itinerary-123',
    userId: 'user-456',
    destination: 'Paris, France',
    description: 'A wonderful trip to Paris',
    startDate: '2025-07-31',
    endDate: '2025-08-06',
    startDay: 19204,
    endDay: 19210,
    ai_status: 'completed',
    response: {
      success: true,
      data: {
        itinerary: {
          destination: 'Paris, France',
          startDate: '2025-07-31',
          endDate: '2025-08-06',
          days: [
            {
              day: 1,
              date: '2025-07-31',
              activities: [
                {
                  name: 'Visit Eiffel Tower',
                  description: 'Iconic iron tower',
                  startTime: '10:00',
                  endTime: '12:00',
                  location: 'Champ de Mars',
                  estimatedCost: '$25'
                },
                {
                  name: 'Louvre Museum',
                  description: 'World-famous art museum',
                  startTime: '14:00',
                  endTime: '17:00',
                  location: { name: 'Rue de Rivoli' },
                  estimatedCost: '$20'
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

  describe('Activity Edit Mode Toggle', () => {
    it('should show edit icon for each activity in edit mode', () => {
      const { getByTestId, getByText, getAllByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Expand daily activities
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Should show edit icons (create icon = pencil)
      const editIcons = getAllByTestId('create');
      expect(editIcons.length).toBeGreaterThan(0);
    });

    it('should toggle activity into inline edit mode when edit icon is pressed', () => {
      const { getByTestId, getByText, getAllByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Press edit icon for first activity
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      // Should show checkmark icon (done editing)
      waitFor(() => {
        expect(getAllByTestId('checkmark-circle').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Inline Field Editing', () => {
    it('should allow editing activity name', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Enter inline edit mode for first activity
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      // Find and edit the name input
      waitFor(() => {
        const nameInput = getByDisplayValue('Visit Eiffel Tower');
        fireEvent.changeText(nameInput, 'Tour Eiffel Visit');
        expect(nameInput.props.value).toBe('Tour Eiffel Visit');
      });
    });

    it('should allow editing activity description', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Enter inline edit mode
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      // Find and edit the description input
      waitFor(() => {
        const descInput = getByDisplayValue('Iconic iron tower');
        fireEvent.changeText(descInput, 'The famous iron lattice tower');
        expect(descInput.props.value).toBe('The famous iron lattice tower');
      });
    });

    it('should allow editing activity times', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Enter inline edit mode
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      // Find and edit time inputs
      waitFor(() => {
        const startTimeInput = getByDisplayValue('10:00');
        const endTimeInput = getByDisplayValue('12:00');
        
        fireEvent.changeText(startTimeInput, '09:30');
        fireEvent.changeText(endTimeInput, '13:00');
        
        expect(startTimeInput.props.value).toBe('09:30');
        expect(endTimeInput.props.value).toBe('13:00');
      });
    });

    it('should allow editing activity location', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Enter inline edit mode
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      // Find and edit location input
      waitFor(() => {
        const locationInput = getByDisplayValue('Champ de Mars');
        fireEvent.changeText(locationInput, 'Champ de Mars, 5 Avenue Anatole');
        expect(locationInput.props.value).toBe('Champ de Mars, 5 Avenue Anatole');
      });
    });
  });

  describe('Edit Mode Persistence', () => {
    it('should maintain edits when switching between activities', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Edit first activity
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const nameInput = getByDisplayValue('Visit Eiffel Tower');
        fireEvent.changeText(nameInput, 'Modified Tower Visit');
      });
      
      // Exit inline edit mode
      waitFor(() => {
        const doneIcons = getAllByTestId('checkmark-circle');
        fireEvent.press(doneIcons[0]);
      });
      
      // Re-enter inline edit mode
      waitFor(() => {
        const editIconsAgain = getAllByTestId('create');
        fireEvent.press(editIconsAgain[0]);
      });
      
      // Verify edit was maintained
      waitFor(() => {
        const nameInput = getByDisplayValue('Modified Tower Visit');
        expect(nameInput).toBeTruthy();
      });
    });
  });

  describe('Save with Inline Edits', () => {
    it('should save inline edits when save button is pressed', async () => {
      const mockUpdateItinerary = jest.fn().mockResolvedValue({ success: true });
      jest.mock('../../../hooks/useUpdateItinerary', () => ({
        useUpdateItinerary: () => ({
          updateItinerary: mockUpdateItinerary,
          loading: false,
          error: null
        })
      }));

      const { getByTestId, getByText, getAllByTestId, getByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Edit activity name
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const nameInput = getByDisplayValue('Visit Eiffel Tower');
        fireEvent.changeText(nameInput, 'Eiffel Tower Tour');
      });
      
      // Save changes
      fireEvent.press(getByTestId('save-button'));
      
      // Should show success alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Changes saved successfully!');
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when saving', async () => {
      const { getByTestId, getByText } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      // Press save
      fireEvent.press(getByTestId('save-button'));
      
      // Should show "Saving..." text
      await waitFor(() => {
        expect(getByText('Saving...')).toBeTruthy();
      }, { timeout: 100 });
    });

    it('should disable save button while saving', async () => {
      const { getByTestId } = render(<AIItineraryDisplay itinerary={mockItinerary} />);
      
      // Enter edit mode
      fireEvent.press(getByTestId('edit-button'));
      
      const saveButton = getByTestId('save-button');
      
      // Press save
      fireEvent.press(saveButton);
      
      // Button should be disabled
      await waitFor(() => {
        expect(saveButton.props.accessibilityState?.disabled).toBe(true);
      }, { timeout: 100 });
    });
  });

  describe('Cancel with Inline Edits', () => {
    it('should discard inline edits when cancel is pressed', () => {
      const { getByTestId, getByText, getAllByTestId, getByDisplayValue, queryByDisplayValue } = render(
        <AIItineraryDisplay itinerary={mockItinerary} />
      );
      
      // Verify original count
      expect(getByText('📅 Daily Activities (1)')).toBeTruthy();
      
      // Enter edit mode and expand activities
      fireEvent.press(getByTestId('edit-button'));
      fireEvent.press(getByText('📅 Daily Activities (1)'));
      
      // Edit activity
      const editIcons = getAllByTestId('create');
      fireEvent.press(editIcons[0]);
      
      waitFor(() => {
        const nameInput = getByDisplayValue('Visit Eiffel Tower');
        fireEvent.changeText(nameInput, 'Changed Name');
      });
      
      // Cancel without saving
      fireEvent.press(getByTestId('cancel-button'));
      
      // Original data should be restored (count stays at 1 day)
      expect(getByText('📅 Daily Activities (1)')).toBeTruthy();
    });
  });
});
