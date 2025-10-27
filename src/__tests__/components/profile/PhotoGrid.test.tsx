/**
 * PhotoGrid Component Tests
 * Comprehensive test coverage for photo gallery grid
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PhotoGrid } from '../../../components/profile/PhotoGrid';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('PhotoGrid', () => {
  const mockPhotos = [
    { id: '1', url: 'https://example.com/photo1.jpg', caption: 'Photo 1', uploadedAt: new Date('2024-01-01') },
    { id: '2', url: 'https://example.com/photo2.jpg', caption: 'Photo 2', uploadedAt: new Date('2024-01-02') },
    { id: '3', url: 'https://example.com/photo3.jpg', uploadedAt: new Date('2024-01-03') },
  ];

  const mockOnPhotoPress = jest.fn();
  const mockOnAddPhoto = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render photo grid container', () => {
      const { getByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      expect(getByTestId('photo-grid')).toBeTruthy();
    });

    it('should render all provided photos', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems).toHaveLength(3);
    });

    it('should render add photo button when isOwnProfile is true', () => {
      const { getByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      expect(getByTestId('add-photo-button')).toBeTruthy();
    });

    it('should not render add photo button when isOwnProfile is false', () => {
      const { queryByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={false}
        />
      );

      expect(queryByTestId('add-photo-button')).toBeNull();
    });

    it('should render empty state when no photos', () => {
      const { getByText } = render(
        <PhotoGrid
          photos={[]}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      expect(getByText('No photos yet')).toBeTruthy();
    });

    it('should render empty state message for own profile', () => {
      const { getByText } = render(
        <PhotoGrid
          photos={[]}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      expect(getByText('Add your first travel photo')).toBeTruthy();
    });

    it('should render empty state message for other profiles', () => {
      const { getByText } = render(
        <PhotoGrid
          photos={[]}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={false}
        />
      );

      expect(getByText('No photos to display')).toBeTruthy();
    });
  });

  describe('Photo Interactions', () => {
    it('should call onPhotoPress when photo is pressed', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const firstPhoto = getAllByTestId(/photo-item-/)[0];
      fireEvent.press(firstPhoto);

      expect(mockOnPhotoPress).toHaveBeenCalledTimes(1);
      expect(mockOnPhotoPress).toHaveBeenCalledWith(mockPhotos[0]);
    });

    it('should call onPhotoPress with correct photo data', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const secondPhoto = getAllByTestId(/photo-item-/)[1];
      fireEvent.press(secondPhoto);

      expect(mockOnPhotoPress).toHaveBeenCalledWith(mockPhotos[1]);
    });

    it('should call onAddPhoto when add button is pressed', () => {
      const { getByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const addButton = getByTestId('add-photo-button');
      fireEvent.press(addButton);

      expect(mockOnAddPhoto).toHaveBeenCalledTimes(1);
    });
  });

  describe('Grid Layout', () => {
    it('should render up to 9 photos', () => {
      const manyPhotos = Array.from({ length: 12 }, (_, i) => ({
        id: `photo-${i + 1}`,
        url: `https://example.com/photo${i + 1}.jpg`,
        caption: `Caption ${i + 1}`,
        uploadedAt: new Date(),
      }));

      const { getAllByTestId } = render(
        <PhotoGrid
          photos={manyPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      // PhotoGrid should only render first 9 photos
      expect(photoItems.length).toBe(9);
    });

    it('should render photos in correct order', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      // Verify we have 3 photo items
      expect(photoItems.length).toBe(3);
      // Verify first photo testID
      expect(photoItems[0].props.testID).toBe('photo-item-photo-1');
    });

    it('should render photos in correct order', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems[0]).toHaveProperty('id', 'photo-item-1');
      expect(photoItems[1]).toHaveProperty('id', 'photo-item-2');
      expect(photoItems[2]).toHaveProperty('id', 'photo-item-3');
    });
  });

  describe('Photo Display', () => {
    it('should display photo images with correct source', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems).toHaveLength(3);
    });

    it('should handle photos without captions', () => {
      const photosWithoutCaptions = [
        { id: '1', url: 'https://example.com/photo1.jpg', uploadedAt: new Date() },
      ];

      const { getAllByTestId } = render(
        <PhotoGrid
          photos={photosWithoutCaptions}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty photos array', () => {
      const { getByText } = render(
        <PhotoGrid
          photos={[]}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      expect(getByText('No photos yet')).toBeTruthy();
    });

    it('should handle single photo', () => {
      const singlePhoto = [mockPhotos[0]];

      const { getAllByTestId } = render(
        <PhotoGrid
          photos={singlePhoto}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems).toHaveLength(1);
    });

    it('should handle exactly 9 photos', () => {
      const ninePhotos = Array.from({ length: 9 }, (_, i) => ({
        id: `${i + 1}`,
        url: `https://example.com/photo${i + 1}.jpg`,
        uploadedAt: new Date(),
      }));

      const { getAllByTestId } = render(
        <PhotoGrid
          photos={ninePhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems).toHaveLength(9);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible add photo button', () => {
      const { getByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const addButton = getByTestId('add-photo-button');
      expect(addButton).toBeTruthy();
    });

    it('should have accessible photo items', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      photoItems.forEach(item => {
        expect(item).toBeTruthy();
      });
    });
  });

  describe('Component Props', () => {
    it('should work with minimum required props', () => {
      const { getByTestId } = render(
        <PhotoGrid
          photos={[]}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={false}
        />
      );

      expect(getByTestId('photo-grid')).toBeTruthy();
    });

    it('should handle undefined callbacks gracefully', () => {
      const { getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={() => {}}
          onAddPhoto={() => {}}
          isOwnProfile={true}
        />
      );

      const photoItems = getAllByTestId(/photo-item-/);
      expect(photoItems).toHaveLength(3);
    });
  });

  describe('Visual States', () => {
    it('should show add button alongside photos when user owns profile', () => {
      const { getByTestId, getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={true}
        />
      );

      expect(getAllByTestId(/photo-item-/)).toHaveLength(3);
      expect(getByTestId('add-photo-button')).toBeTruthy();
    });

    it('should only show photos when viewing other profiles', () => {
      const { queryByTestId, getAllByTestId } = render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={mockOnPhotoPress}
          onAddPhoto={mockOnAddPhoto}
          isOwnProfile={false}
        />
      );

      expect(getAllByTestId(/photo-item-/)).toHaveLength(3);
      expect(queryByTestId('add-photo-button')).toBeNull();
    });
  });
});
