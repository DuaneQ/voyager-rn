/**
 * ProfileStats Component Tests
 * Tests for the stats row displaying Connections, Trips, and Rating
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileStats } from '../../../components/profile/ProfileStats';

describe('ProfileStats', () => {
  describe('Rendering', () => {
    it('should render all three stats', () => {
      const { getByTestId } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      expect(getByTestId('stat-connections')).toBeTruthy();
      expect(getByTestId('stat-trips')).toBeTruthy();
      expect(getByTestId('stat-rating')).toBeTruthy();
    });

    it('should display connections count', () => {
      const { getByText } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      expect(getByText('5')).toBeTruthy();
      expect(getByText('Connections')).toBeTruthy();
    });

    it('should display trips count', () => {
      const { getByText } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      expect(getByText('3')).toBeTruthy();
      expect(getByText('Trips')).toBeTruthy();
    });

    it('should display rating with star emoji', () => {
      const { getByText } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      expect(getByText('⭐4.5')).toBeTruthy();
      expect(getByText('(10 reviews)')).toBeTruthy();
    });

    it('should display placeholder values (zeros)', () => {
      const { getAllByText, getByText } = render(
        <ProfileStats connections={0} trips={0} rating={0} ratingCount={0} />
      );
      
      // Should have two "0" texts (connections and trips)
      const zeros = getAllByText('0');
      expect(zeros.length).toBe(2);
      
      expect(getByText('⭐0.0')).toBeTruthy();
      expect(getByText('(0 reviews)')).toBeTruthy();
    });

    it('should format rating to one decimal place', () => {
      const { getByText } = render(
        <ProfileStats connections={0} trips={0} rating={4.567} ratingCount={10} />
      );
      
      expect(getByText('⭐4.6')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for connections', () => {
      const { getByTestId } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      const connectionsButton = getByTestId('stat-connections');
      expect(connectionsButton.props.accessibilityLabel).toBe('5 Connections');
      expect(connectionsButton.props.accessibilityRole).toBe('button');
    });

    it('should have proper accessibility labels for trips', () => {
      const { getByTestId } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      const tripsButton = getByTestId('stat-trips');
      expect(tripsButton.props.accessibilityLabel).toBe('3 Trips');
      expect(tripsButton.props.accessibilityRole).toBe('button');
    });

    it('should have proper accessibility labels for rating', () => {
      const { getByTestId } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      const ratingButton = getByTestId('stat-rating');
      expect(ratingButton.props.accessibilityLabel).toBe('Rating 4.5 stars with 10 reviews');
      expect(ratingButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Interactions', () => {
    it('should call onConnectionsPress when connections stat is pressed', () => {
      const onConnectionsPress = jest.fn();
      const { getByTestId } = render(
        <ProfileStats 
          connections={5} 
          trips={3} 
          rating={4.5} 
          ratingCount={10}
          onConnectionsPress={onConnectionsPress}
        />
      );
      
      fireEvent.press(getByTestId('stat-connections'));
      expect(onConnectionsPress).toHaveBeenCalledTimes(1);
    });

    it('should call onTripsPress when trips stat is pressed', () => {
      const onTripsPress = jest.fn();
      const { getByTestId } = render(
        <ProfileStats 
          connections={5} 
          trips={3} 
          rating={4.5} 
          ratingCount={10}
          onTripsPress={onTripsPress}
        />
      );
      
      fireEvent.press(getByTestId('stat-trips'));
      expect(onTripsPress).toHaveBeenCalledTimes(1);
    });

    it('should call onRatingPress when rating stat is pressed', () => {
      const onRatingPress = jest.fn();
      const { getByTestId } = render(
        <ProfileStats 
          connections={5} 
          trips={3} 
          rating={4.5} 
          ratingCount={10}
          onRatingPress={onRatingPress}
        />
      );
      
      fireEvent.press(getByTestId('stat-rating'));
      expect(onRatingPress).toHaveBeenCalledTimes(1);
    });

    it('should not crash if press handlers are not provided', () => {
      const { getByTestId } = render(
        <ProfileStats connections={5} trips={3} rating={4.5} ratingCount={10} />
      );
      
      // Should not crash when pressing without handlers
      expect(() => {
        fireEvent.press(getByTestId('stat-connections'));
        fireEvent.press(getByTestId('stat-trips'));
        fireEvent.press(getByTestId('stat-rating'));
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle large numbers', () => {
      const { getByText } = render(
        <ProfileStats connections={1234} trips={567} rating={5.0} ratingCount={9999} />
      );
      
      expect(getByText('1234')).toBeTruthy();
      expect(getByText('567')).toBeTruthy();
      expect(getByText('(9999 reviews)')).toBeTruthy();
    });

    it('should handle minimum rating (0)', () => {
      const { getByText } = render(
        <ProfileStats connections={0} trips={0} rating={0} ratingCount={0} />
      );
      
      expect(getByText('⭐0.0')).toBeTruthy();
    });

    it('should handle maximum rating (5)', () => {
      const { getByText } = render(
        <ProfileStats connections={0} trips={0} rating={5.0} ratingCount={100} />
      );
      
      expect(getByText('⭐5.0')).toBeTruthy();
    });
  });
});
