/**
 * AirportSelector Edge Case Tests - React Native
 * Tests for network failures, race conditions, and edge cases
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AirportSelector from '../../components/common/AirportSelector';
import ReactNativeAirportService from '../../services/ReactNativeAirportService';

// Mock the airport service
jest.mock('../../services/ReactNativeAirportService');

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('AirportSelector - Edge Cases', () => {
  const mockAirportService = ReactNativeAirportService as jest.MockedClass<typeof ReactNativeAirportService>;
  const mockOnAirportSelect = jest.fn();
  const mockOnClear = jest.fn();

  const mockAirports = [
    {
      iataCode: 'LAX',
      name: 'Los Angeles International Airport',
      city: 'Los Angeles',
      country: 'USA',
      latitude: 33.9416,
      longitude: -118.4085,
    },
    {
      iataCode: 'JFK',
      name: 'John F. Kennedy International Airport',
      city: 'New York',
      country: 'USA',
      latitude: 40.6413,
      longitude: -73.7781,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockAirportService.mockClear();
  });

  describe('Network Error Handling', () => {
    it('handles network failure during search', async () => {
      const networkError = new Error('Network request failed');
      mockAirportService.prototype.searchAirportsByQuery = jest.fn().mockRejectedValueOnce(networkError);

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByText, getByPlaceholderText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          placeholder="Select airport"
        />
      );

      // Open modal and search
      const selector = getByText('Select airport');
      fireEvent.press(selector);

      const searchInput = getByPlaceholderText('Search airports by name, code, or city...');
      fireEvent.changeText(searchInput, 'LAX');

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to search airports. Please try again.');
      });

      alertSpy.mockRestore();
    });

    it('handles empty search results gracefully', async () => {
      mockAirportService.prototype.searchAirportsByQuery = jest.fn().mockResolvedValueOnce([]);

      const { getByText, getByPlaceholderText, queryByText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          placeholder="Select airport"
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      const searchInput = getByPlaceholderText('Search airports by name, code, or city...');
      fireEvent.changeText(searchInput, 'INVALID');

      await waitFor(() => {
        // Should show no results message or empty list
        expect(queryByText(/no airports found/i)).toBeTruthy();
      });
    });

    it('handles timeout during airport code lookup', async () => {
      const timeoutError = new Error('Request timeout');
      mockAirportService.prototype.getAirportByIataCode = jest.fn().mockRejectedValueOnce(timeoutError);

      const { rerender } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode={undefined}
        />
      );

      // Update with selected code that will fail to load
      rerender(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode="XYZ"
        />
      );

      await waitFor(() => {
        // Should handle silently without crashing
        expect(mockAirportService.prototype.getAirportByIataCode).toHaveBeenCalledWith('XYZ');
      });
    });
  });

  describe('Race Condition Handling', () => {
    it('prevents multiple simultaneous airport code lookups', async () => {
      let resolveCount = 0;
      mockAirportService.prototype.getAirportByIataCode = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve(mockAirports[0]);
          }, 100);
        })
      );

      const { rerender } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode={undefined}
        />
      );

      // Rapid updates (simulate race condition)
      rerender(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode="LAX"
        />
      );

      rerender(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode="JFK"
        />
      );

      await waitFor(() => {
        // Race condition guard should prevent multiple calls - only first call should go through
        // since isLoadingInitial guard blocks subsequent calls
        expect(mockAirportService.prototype.getAirportByIataCode).toHaveBeenCalledTimes(1);
        expect(mockAirportService.prototype.getAirportByIataCode).toHaveBeenCalledWith('LAX');
      }, { timeout: 1000 });
    });

    it('handles modal opening while search is in progress', async () => {
      mockAirportService.prototype.searchAirportsNearLocation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ airports: mockAirports, totalCount: 3 }), 500))
      );

      const { getByText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          location="Los Angeles"
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      // Search starts automatically when modal opens with location context

      await waitFor(() => {
        // Should handle gracefully - search with location context
        expect(mockAirportService.prototype.searchAirportsNearLocation).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('cancels previous search when new search is initiated', async () => {
      mockAirportService.prototype.searchAirportsByQuery = jest.fn()
        .mockResolvedValue([mockAirports[1]]);

      const { getByText, getByPlaceholderText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      const searchInput = getByPlaceholderText('Search airports by name, code, or city...');
      
      // First search
      fireEvent.changeText(searchInput, 'Los');
      
      // Immediately start second search (within debounce window)
      fireEvent.changeText(searchInput, 'New');

      // Wait for debounce (300ms) + execution
      await waitFor(() => {
        // Debouncing should cancel the first search - only 'New' should be called
        expect(mockAirportService.prototype.searchAirportsByQuery).toHaveBeenCalledTimes(1);
        expect(mockAirportService.prototype.searchAirportsByQuery).toHaveBeenCalledWith('New');
        expect(mockAirportService.prototype.searchAirportsByQuery).not.toHaveBeenCalledWith('Los');
      }, { timeout: 1000 });
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('handles extremely short search queries', async () => {
      const { getByText, getByPlaceholderText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      const searchInput = getByPlaceholderText('Search airports by name, code, or city...');
      fireEvent.changeText(searchInput, 'A');

      // Should not trigger search for 1 character
      await waitFor(() => {
        expect(mockAirportService.prototype.searchAirportsByQuery).not.toHaveBeenCalled();
      });
    });

    it('handles special characters in search query', async () => {
      mockAirportService.prototype.searchAirportsByQuery = jest.fn().mockResolvedValueOnce([]);

      const { getByText, getByPlaceholderText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      const searchInput = getByPlaceholderText('Search airports by name, code, or city...');
      fireEvent.changeText(searchInput, 'L@X! #$%');

      await waitFor(() => {
        // Should handle special characters without crashing
        expect(mockAirportService.prototype.searchAirportsByQuery).toHaveBeenCalledWith('L@X! #$%');
      });
    });

    it('handles empty/whitespace search query', async () => {
      const { getByText, getByPlaceholderText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      const searchInput = getByPlaceholderText('Search airports by name, code, or city...');
      fireEvent.changeText(searchInput, '   ');

      // Should not trigger search for whitespace-only
      await waitFor(() => {
        expect(mockAirportService.prototype.searchAirportsByQuery).not.toHaveBeenCalled();
      });
    });
  });

  describe('Selection and Clear Edge Cases', () => {
    it('handles clearing selection', () => {
      const { getByText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          onClear={mockOnClear}
          selectedAirportCode="LAX"
        />
      );

      const clearButton = getByText('×');
      fireEvent.press(clearButton);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it('handles selection without onClear callback', () => {
      const { queryByText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode="LAX"
        />
      );

      // Should render without onClear prop, but clear button won't show or won't do anything
      expect(queryByText('×')).toBeTruthy();
    });

    it('handles invalid airport code selection', async () => {
      mockAirportService.prototype.getAirportByIataCode = jest.fn().mockRejectedValueOnce(
        new Error('Airport not found')
      );

      const { rerender } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode={undefined}
        />
      );

      rerender(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          selectedAirportCode="INVALID"
        />
      );

      await waitFor(() => {
        // Should handle gracefully without crashing
        expect(mockAirportService.prototype.getAirportByIataCode).toHaveBeenCalledWith('INVALID');
      });
    });
  });

  describe('Location Context Edge Cases', () => {
    it('searches near location when provided', async () => {
      mockAirportService.prototype.searchAirportsNearLocation = jest.fn().mockResolvedValueOnce({
        airports: mockAirports,
        center: { lat: 34.05, lng: -118.25 }
      });

      const { getByText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          location="Los Angeles"
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      await waitFor(() => {
        expect(mockAirportService.prototype.searchAirportsNearLocation).toHaveBeenCalledWith(
          'Los Angeles',
          undefined,
          200,
          10
        );
      });
    });

    it('handles location geocoding failure', async () => {
      mockAirportService.prototype.searchAirportsNearLocation = jest.fn().mockRejectedValueOnce(
        new Error('Geocoding failed')
      );

      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByText } = render(
        <AirportSelector
          onAirportSelect={mockOnAirportSelect}
          location="Invalid Location XYZ123"
        />
      );

      const selector = getByText('Select airport');
      fireEvent.press(selector);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Error', 'Failed to search airports. Please try again.');
      });

      alertSpy.mockRestore();
    });
  });
});
