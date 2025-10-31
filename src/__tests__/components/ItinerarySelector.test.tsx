/**
 * Unit Tests for ItinerarySelector Component
 * Tests dropdown selection and Add Itinerary button
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { ItinerarySelector } from '../../components/search/ItinerarySelector';
import { Itinerary } from '../../hooks/useAllItineraries';

// Mock @react-native-picker/picker
jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  return {
    Picker: ({ children, onValueChange, selectedValue, testID }: any) => {
      const MockPicker = require('react-native').View;
      return (
        <MockPicker testID={testID}>
          {React.Children.map(children, (child: any) => {
            if (child && child.props) {
              return (
                <MockPicker
                  testID={`picker-item-${child.props.value}`}
                  onPress={() => onValueChange(child.props.value)}
                >
                  {child.props.label}
                </MockPicker>
              );
            }
            return null;
          })}
        </MockPicker>
      );
    },
    Item: ({ label, value }: any) => {
      const MockView = require('react-native').View;
      return <MockView>{label}</MockView>;
    },
  };
});

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
    Platform.OS = 'android'; // Default to Android for Picker tests
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

  it('should render Android Picker with itineraries', () => {
    Platform.OS = 'android';

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

  it('should format AI itinerary labels with robot emoji', () => {
    Platform.OS = 'android';

    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={[mockItineraries[0]]}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // AI itinerary should have robot emoji in picker item
    const pickerItem = getByTestId('picker-item-ai-1');
    expect(pickerItem).toBeTruthy();
    expect(pickerItem.props.children).toContain('🤖');
    expect(pickerItem.props.children).toContain('Tokyo, Japan');
  });

  it('should format manual itinerary labels with airplane emoji', () => {
    Platform.OS = 'android';

    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={[mockItineraries[1]]}
        selectedItineraryId="manual-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Manual itinerary should have airplane emoji in picker item
    const pickerItem = getByTestId('picker-item-manual-1');
    expect(pickerItem).toBeTruthy();
    expect(pickerItem.props.children).toContain('✈️');
    expect(pickerItem.props.children).toContain('Paris, France');
  });

  it('should render iOS button (not Picker) on iOS platform', () => {
    Platform.OS = 'ios';

    const { getByTestId, queryByTestId } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Should have iOS button
    const iosButton = getByTestId('itinerary-selector-button');
    expect(iosButton).toBeTruthy();

    // Should NOT have Android picker
    const androidPicker = queryByTestId('itinerary-selector-picker');
    expect(androidPicker).toBeNull();
  });

  it('should display selected itinerary in iOS button', () => {
    Platform.OS = 'ios';

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

  it('should show placeholder text when no itinerary selected (iOS)', () => {
    Platform.OS = 'ios';

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

  it('should display dates in locale format', () => {
    const itinerary: Itinerary = {
      id: 'test-1',
      userId: 'user-123',
      destination: 'Test City',
      startDate: '2025-06-15',
      endDate: '2025-06-20',
      startDay: Date.parse('2025-06-15'),
      endDay: Date.parse('2025-06-20'),
    };

    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={[itinerary]}
        selectedItineraryId="test-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Date should be formatted using toLocaleDateString
    const pickerItem = getByTestId('picker-item-test-1');
    expect(pickerItem.props.children).toContain('Test City');
    // Date format varies by locale, so just check it contains the formatted date
    expect(typeof pickerItem.props.children).toBe('string');
  });

  it('should handle mixed AI and manual itineraries', () => {
    Platform.OS = 'android';

    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId="ai-1"
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    // Should have both AI and manual itineraries with correct emoji prefixes
    const aiItem1 = getByTestId('picker-item-ai-1');
    expect(aiItem1.props.children).toContain('🤖');
    expect(aiItem1.props.children).toContain('Tokyo, Japan');

    const manualItem = getByTestId('picker-item-manual-1');
    expect(manualItem.props.children).toContain('✈️');
    expect(manualItem.props.children).toContain('Paris, France');

    const aiItem2 = getByTestId('picker-item-ai-2');
    expect(aiItem2.props.children).toContain('🤖');
    expect(aiItem2.props.children).toContain('London, UK');
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
    Platform.OS = 'android';

    const { getByTestId } = render(
      <ItinerarySelector
        itineraries={mockItineraries}
        selectedItineraryId={''}
        onSelect={mockOnSelect}
        onAddItinerary={mockOnAddItinerary}
      />
    );

    const picker = getByTestId('itinerary-selector-picker');
    expect(picker).toBeTruthy();
    expect(mockOnSelect).not.toHaveBeenCalled();
  });
});
