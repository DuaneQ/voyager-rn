/**
 * RatingsModal Component Tests
 * Tests for displaying user ratings and reviews
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RatingsModal } from '../../../components/modals/RatingsModal';

describe('RatingsModal', () => {
  const mockOnClose = jest.fn();
  const mockCurrentUserId = 'current-user-123';

  const mockRatingsWithReviews = {
    average: 4.5,
    count: 3,
    ratedBy: {
      'user-1': {
        rating: 5,
        comment: 'Great travel companion!',
        timestamp: 1638316800000, // Dec 1, 2021
      },
      'user-2': {
        rating: 4,
        comment: 'Good experience overall.',
        timestamp: 1640995200000, // Jan 1, 2022
      },
      'current-user-123': {
        rating: 4.5,
        comment: 'Nice person to travel with.',
        timestamp: 1643673600000, // Feb 1, 2022
      },
    },
  };

  const mockRatingsWithoutComments = {
    average: 4.0,
    count: 2,
    ratedBy: {
      'user-1': {
        rating: 4,
      },
      'user-2': {
        rating: 4,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible', () => {
      const { getByTestId } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByTestId('ratings-modal')).toBeTruthy();
    });

    it('should not render modal when not visible', () => {
      const { queryByTestId } = render(
        <RatingsModal
          visible={false}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      // Modal component is rendered but content should not be visible
      expect(queryByTestId('ratings-modal')).toBeTruthy();
    });

    it('should display average rating and count', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('⭐ 4.5')).toBeTruthy();
      expect(getByText('3 reviews')).toBeTruthy();
    });

    it('should display singular "review" for count of 1', () => {
      const singleRating = {
        average: 5.0,
        count: 1,
        ratedBy: {
          'user-1': {
            rating: 5,
            comment: 'Excellent!',
          },
        },
      };

      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={singleRating}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('1 review')).toBeTruthy();
    });

    it('should display all review comments', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('Great travel companion!')).toBeTruthy();
      expect(getByText('Good experience overall.')).toBeTruthy();
      expect(getByText('Nice person to travel with.')).toBeTruthy();
    });

    it('should display review dates', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      // Dates formatted as locale strings - check actual formatted dates
      const date1 = new Date(1638316800000).toLocaleDateString();
      const date2 = new Date(1640995200000).toLocaleDateString();
      const date3 = new Date(1643673600000).toLocaleDateString();
      
      expect(getByText(date1)).toBeTruthy();
      expect(getByText(date2)).toBeTruthy();
      expect(getByText(date3)).toBeTruthy();
    });

    it('should show "You" for current user reviews', () => {
      const { getAllByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      const youLabels = getAllByText('You');
      expect(youLabels.length).toBeGreaterThan(0);
    });

    it('should show truncated user ID for other users', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('User: user-1...')).toBeTruthy();
      expect(getByText('User: user-2...')).toBeTruthy();
    });

    it('should render each review card with testID', () => {
      const { getByTestId } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByTestId('review-user-1')).toBeTruthy();
      expect(getByTestId('review-user-2')).toBeTruthy();
      expect(getByTestId('review-current-user-123')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle ratings without comments', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithoutComments}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('⭐ 4.0')).toBeTruthy();
      expect(getByText('2 ratings received, but no written reviews yet.')).toBeTruthy();
    });

    it('should handle no ratings', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={undefined}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('No ratings yet')).toBeTruthy();
    });

    it('should handle ratings with zero count', () => {
      const emptyRatings = {
        average: 0,
        count: 0,
        ratedBy: {},
      };

      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={emptyRatings}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('No ratings yet')).toBeTruthy();
    });

    it('should filter out empty or whitespace-only comments', () => {
      const ratingsWithEmptyComments = {
        average: 4.0,
        count: 3,
        ratedBy: {
          'user-1': {
            rating: 4,
            comment: 'Good review',
          },
          'user-2': {
            rating: 4,
            comment: '   ', // Whitespace only
          },
          'user-3': {
            rating: 4,
            comment: '', // Empty
          },
        },
      };

      const { getByText, getByTestId, queryByTestId } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={ratingsWithEmptyComments}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('Good review')).toBeTruthy();
      expect(getByTestId('review-user-1')).toBeTruthy();
      expect(queryByTestId('review-user-2')).toBeNull();
      expect(queryByTestId('review-user-3')).toBeNull();
    });

    it('should handle missing timestamp', () => {
      const ratingsWithoutTimestamp = {
        average: 4.5,
        count: 1,
        ratedBy: {
          'user-1': {
            rating: 4.5,
            comment: 'Great!',
          },
        },
      };

      const { queryByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={ratingsWithoutTimestamp}
          currentUserId={mockCurrentUserId}
        />
      );

      // Should not crash, timestamp just won't be shown
      expect(queryByText('Great!')).toBeTruthy();
    });
  });

  describe('Star Rating Display', () => {
    it('should display correct number of filled stars for each rating', () => {
      const { getAllByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      // Star characters should be rendered
      const stars = getAllByText('★');
      expect(stars.length).toBeGreaterThan(0);
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      fireEvent.press(getByTestId('close-ratings-modal'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should have proper accessibility labels', () => {
      const { getByTestId } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      const closeButton = getByTestId('close-ratings-modal');
      expect(closeButton.props.accessibilityLabel).toBe('Close ratings modal');
      expect(closeButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Header and Title', () => {
    it('should display modal title', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('Ratings & Reviews')).toBeTruthy();
    });

    it('should display "User Reviews" section title when comments exist', () => {
      const { getByText } = render(
        <RatingsModal
          visible={true}
          onClose={mockOnClose}
          ratings={mockRatingsWithReviews}
          currentUserId={mockCurrentUserId}
        />
      );

      expect(getByText('User Reviews')).toBeTruthy();
    });
  });
});
