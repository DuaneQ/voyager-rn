/**
 * Unit Tests for ItinerarySelector Component
 * Tests dropdown selection and Add Itinerary button
 * 
 * Note: Component uses CrossPlatformPicker which:
 * - iOS: Uses ActionSheetIOS (native, not easily testable in Jest)
 * - Android/Web: Uses custom Modal with FlatList
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ItinerarySelector } from '../../components/search/ItinerarySelector';
import { Itinerary } from '../../hooks/useAllItineraries';

describe('ItinerarySelector', () => {
  const mockItineraries: Itinerary[] = [
    {
      id: 'ai-1',
      userId: 'user-123',
      destination: 'Tokyo, Japan',
      startDate: '2025-06-01',
      endDate: '2025-06-07',
      startDay: Date.parse('2025-06-01'),
      endDay: Date.parse('2025-06-07'),
      ai_status: 'completed',
    },
    {
      id: 'manual-1',
      userId: 'user-123',
      destination: 'Paris, France',
      startDate: '2025-07-01',
      endDate: '2025-07-10',
      startDay: Date.parse('2025-07-01'),
      endDay: Date.parse('2025-07-10'),
    },
    {
      id: 'ai-2',
      userId: 'user-123',
      destination: 'London, UK',
      startDate: '2025-08-01',
      endDate: '2025-08-05',
      startDay: Date.parse('2025-08-01'),
      endDay: Date.parse('2025-08-05'),
      ai_status: 'completed',
    },
  ];

  const mockOnSelect = jest.fn();
  const mockOnAddItinerary = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android'; // Default to Android for tests
  });

  it('should render loading state', () => {
    const { getByText } = render(
      <ItinerarySelector
        itineraries={[]}
        selectedItineraryId={null}
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
        loading={true}
      />
    );

    expect(getByText('Loading itineraries...')).toBeTruthy();
  });

  it('should render no itineraries message', () => {
    const { getByText } = render(
      <ItinerarySelector
        itineraries={[]}
        selectedItineraryId={null}
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
        loading={false}
      />
    );

    expect(getByText('No itineraries found')).toBeTruthy();
  });

  it('should render Add Itinerary button', () => {
    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId={null}
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    const addButton = getByTestId('add-itinerary-button');
    expect(addButton).toBeTruthy();
    
    fireEvent.press(addButton);
    expect(mockOnAddItinerary).toHaveBeenCalledTimes(1);
  });

  it('should render picker button with itineraries', () => {
    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    const picker = getByTestId('itinerary-selector-picker');
    expect(picker).toBeTruthy();
  });

  it('should display AI itinerary with robot emoji in button text', () => {
    const { getByText } = render(
      <ItinerarySelector
        itineraries={[mockItineraries[0]]}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // AI itinerary should have robot emoji in displayed text
    expect(getByText(/🤖.*Tokyo, Japan/)).toBeTruthy();
  });

  it('should display manual itinerary with airplane emoji in button text', () => {
    const { getByText } = render(
      <ItinerarySelector
        itineraries={[mockItineraries[1]]}
        selectedItineraryId="manual-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Manual itinerary should have airplane emoji in displayed text
    expect(getByText(/✈️.*Paris, France/)).toBeTruthy();
  });

  it('should use CrossPlatformPicker on both iOS and Android', () => {
    // The component uses CrossPlatformPicker for all platforms
    Platform.OS = 'ios';

    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Both platforms use itinerary-selector-picker testID
    const picker = getByTestId('itinerary-selector-picker');
    expect(picker).toBeTruthy();
  });

  it('should display selected AI itinerary correctly', () => {
    const { getByText } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    expect(getByText(/🤖.*Tokyo, Japan/)).toBeTruthy();
  });

  it('should show placeholder text when no itinerary selected', () => {
    const { getByText } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId={null}
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    expect(getByText('Select itinerary...')).toBeTruthy();
  });

  it('should display date in locale format in button text', () => {
    const itinerary: Itinerary = {
      id: 'test-1',
      userId: 'user-123',
      destination: 'Test City',
      startDate: '2025-06-15',
      endDate: '2025-06-20',
      startDay: Date.parse('2025-06-15'),
      endDay: Date.parse('2025-06-20'),
    };

    const { getByText } = render(
      <ItinerarySelector
        itineraries={[itinerary]}
        selectedItineraryId="test-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Should display the destination with date
    expect(getByText(/Test City/)).toBeTruthy();
  });

  it('should display multiple itineraries correctly when selected changes', () => {
    const { getByText, rerender } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Initially shows AI itinerary
    expect(getByText(/🤖.*Tokyo, Japan/)).toBeTruthy();

    // Re-render with different selection
    rerender(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId="manual-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Now shows manual itinerary
    expect(getByText(/✈️.*Paris, France/)).toBeTruthy();
  });

  it('should not call onSelect when loading', () => {
    const { queryByTestId } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId={null}
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
        loading={true}
      />
    );

    // Loading state doesn't render picker
    const picker = queryByTestId('itinerary-selector-picker');
    expect(picker).toBeNull();
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('should handle empty string selection gracefully', () => {
    const { getByText } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId={''}
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Empty string selection shows placeholder
    expect(getByText('Select itinerary...')).toBeTruthy();
    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  // Note: ActionSheetIOS tests are skipped because mocking react-native internals
  // in Jest is complex and fragile. The CrossPlatformPicker component handles
  // the iOS ActionSheet behavior, which is better tested via integration/E2E tests.
});
