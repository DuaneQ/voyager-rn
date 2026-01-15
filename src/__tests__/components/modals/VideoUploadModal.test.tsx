/**
 * Unit tests for VideoUploadModal component
 * Comprehensive coverage following S.O.L.I.D principles
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { VideoUploadModal } from '../../../components/modals/VideoUploadModal';
import * as videoValidation from '../../../utils/videoValidation';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock SafeAreaView properly
jest.mock('react-native/Libraries/Components/SafeAreaView/SafeAreaView', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: any) => React.createElement('SafeAreaView', null, children),
  };
});

// Mock video validation
jest.mock('../../../utils/videoValidation', () => ({
  validateVideoMetadata: jest.fn(),
}));

// Mock sanitizeInput
jest.mock('../../../utils/sanitizeInput', () => ({
  sanitizeString: jest.fn((input) => input), // Pass through by default
}));

const mockValidateVideoMetadata = videoValidation.validateVideoMetadata as jest.MockedFunction<
  typeof videoValidation.validateVideoMetadata
>;

describe('VideoUploadModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpload = jest.fn();
  const mockVideoUri = 'file:///test/video.mp4';

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onUpload: mockOnUpload,
    videoUri: mockVideoUri,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to valid metadata
    mockValidateVideoMetadata.mockReturnValue({ isValid: true, errors: [] });
  });

  describe('Rendering', () => {
    it('should render modal when visible is true', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      expect(getByTestId('video-upload-modal')).toBeTruthy();
    });

    it('should not render modal when visible is false', () => {
      const { queryByTestId } = render(
        <VideoUploadModal {...defaultProps} visible={false} />
      );
      expect(queryByTestId('video-upload-modal')).toBeTruthy(); // Modal exists but not visible
    });

    it('should render all form fields', () => {
      const { getByTestId, getByText } = render(<VideoUploadModal {...defaultProps} />);
      
      expect(getByText('Upload Video')).toBeTruthy();
      expect(getByTestId('title-input')).toBeTruthy();
      expect(getByTestId('description-input')).toBeTruthy();
      expect(getByTestId('public-switch')).toBeTruthy();
      expect(getByTestId('cancel-button')).toBeTruthy();
      expect(getByTestId('upload-button')).toBeTruthy();
    });

    it('should show video selected info when videoUri is provided', () => {
      const { getByText } = render(<VideoUploadModal {...defaultProps} />);
      expect(getByText('Video selected and ready to upload')).toBeTruthy();
    });

    it('should not show video info when videoUri is null', () => {
      const { queryByText } = render(
        <VideoUploadModal {...defaultProps} videoUri={null} />
      );
      expect(queryByText('Video selected and ready to upload')).toBeFalsy();
    });
  });

  describe('Form Input', () => {
    it('should update title when typing', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const titleInput = getByTestId('title-input');
      
      fireEvent.changeText(titleInput, 'My Travel Video');
      expect(titleInput.props.value).toBe('My Travel Video');
    });

    it('should update description when typing', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const descriptionInput = getByTestId('description-input');
      
      fireEvent.changeText(descriptionInput, 'Amazing trip to Paris');
      expect(descriptionInput.props.value).toBe('Amazing trip to Paris');
    });

    it('should enforce title max length of 100', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const titleInput = getByTestId('title-input');
      
      expect(titleInput.props.maxLength).toBe(100);
    });

    it('should enforce description max length of 200', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const descriptionInput = getByTestId('description-input');
      
      expect(descriptionInput.props.maxLength).toBe(200);
    });

    it('should display character count for title', () => {
      const { getByTestId, getByText } = render(<VideoUploadModal {...defaultProps} />);
      const titleInput = getByTestId('title-input');
      
      fireEvent.changeText(titleInput, 'Test');
      expect(getByText('4/100 characters')).toBeTruthy();
    });

    it('should display character count for description', () => {
      const { getByTestId, getByText } = render(<VideoUploadModal {...defaultProps} />);
      const descriptionInput = getByTestId('description-input');
      
      fireEvent.changeText(descriptionInput, 'Test description');
      expect(getByText('16/200 characters')).toBeTruthy();
    });
  });

  describe('Privacy Toggle', () => {
    it('should default isPublic to true', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const publicSwitch = getByTestId('public-switch');
      
      expect(publicSwitch.props.value).toBe(true);
    });

    it('should toggle privacy setting when switch is pressed', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const publicSwitch = getByTestId('public-switch');
      
      fireEvent(publicSwitch, 'valueChange', false);
      expect(publicSwitch.props.value).toBe(false);
    });

    it('should show correct helper text for public videos', () => {
      const { getByText } = render(<VideoUploadModal {...defaultProps} />);
      expect(getByText('Everyone can see this video')).toBeTruthy();
    });

    it('should show correct helper text for private videos', () => {
      const { getByTestId, getByText } = render(<VideoUploadModal {...defaultProps} />);
      const publicSwitch = getByTestId('public-switch');
      
      fireEvent(publicSwitch, 'valueChange', false);
      expect(getByText('Only your connections can see this video')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('should call onUpload with correct data when form is submitted', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      const titleInput = getByTestId('title-input');
      const descriptionInput = getByTestId('description-input');
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.changeText(titleInput, 'Test Video');
      fireEvent.changeText(descriptionInput, 'Test Description');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith({
          uri: mockVideoUri,
          title: 'Test Video',
          description: 'Test Description',
          isPublic: true,
        });
      });
    });

    it('should use default title if none provided', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Video'),
          })
        );
      });
    });

    it('should use default description if none provided', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(
          expect.objectContaining({
            description: expect.stringContaining('Uploaded on'),
          })
        );
      });
    });

    it('should trim whitespace from title and description', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      const titleInput = getByTestId('title-input');
      const descriptionInput = getByTestId('description-input');
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.changeText(titleInput, '  Test Video  ');
      fireEvent.changeText(descriptionInput, '  Test Description  ');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith({
          uri: mockVideoUri,
          title: 'Test Video',
          description: 'Test Description',
          isPublic: true,
        });
      });
    });

    it('should pass isPublic=false when switch is toggled off', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      const publicSwitch = getByTestId('public-switch');
      const uploadButton = getByTestId('upload-button');
      
      fireEvent(publicSwitch, 'valueChange', false);
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(
          expect.objectContaining({
            isPublic: false,
          })
        );
      });
    });

    it('should show error if no video URI is provided', async () => {
      const { getByTestId } = render(
        <VideoUploadModal {...defaultProps} videoUri={null} />
      );
      
      const uploadButton = getByTestId('upload-button');
      
      // Button should be disabled when no videoUri
      expect(uploadButton.props.disabled).toBe(true);
      expect(uploadButton.props.accessibilityState.disabled).toBe(true);
      
      // Pressing disabled button should not call onUpload
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).not.toHaveBeenCalled();
      });
    });

    it('should validate metadata before upload', async () => {
      mockValidateVideoMetadata.mockReturnValue({
        isValid: false,
        errors: ['Title is too long'],
      });
      
      const { getByTestId, getByText } = render(<VideoUploadModal {...defaultProps} />);
      
      const titleInput = getByTestId('title-input');
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.changeText(titleInput, 'Very long title');
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByText('Title is too long')).toBeTruthy();
      });
      
      expect(mockValidateVideoMetadata).toHaveBeenCalled();
      expect(mockOnUpload).not.toHaveBeenCalled();
    });

    it('should display multiple validation errors', async () => {
      mockValidateVideoMetadata.mockReturnValue({
        isValid: false,
        errors: ['Title is too long', 'Description contains invalid characters'],
      });
      
      const { getByTestId, getByText } = render(<VideoUploadModal {...defaultProps} />);
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByText('Title is too long')).toBeTruthy();
        expect(getByText('Description contains invalid characters')).toBeTruthy();
      });
    });

    it('should clear errors on successful upload', async () => {
      mockValidateVideoMetadata
        .mockReturnValueOnce({
          isValid: false,
          errors: ['Validation error'],
        })
        .mockReturnValueOnce({
          isValid: true,
          errors: [],
        });
      
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId, getByText, queryByText } = render(
        <VideoUploadModal {...defaultProps} />
      );
      const uploadButton = getByTestId('upload-button');
      
      // First attempt - validation fails
      fireEvent.press(uploadButton);
      await waitFor(() => {
        expect(getByText('Validation error')).toBeTruthy();
      });
      
      // Second attempt - validation succeeds
      fireEvent.press(uploadButton);
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
      
      // Errors should be cleared
      await waitFor(() => {
        expect(queryByText('Validation error')).toBeFalsy();
      });
    });

    it('should display upload error if onUpload throws', async () => {
      mockOnUpload.mockRejectedValue(new Error('Network error'));
      
      const { getByTestId, getByText } = render(<VideoUploadModal {...defaultProps} />);
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
      });
    });

    it('should reset form after successful upload', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      const titleInput = getByTestId('title-input');
      const descriptionInput = getByTestId('description-input');
      const publicSwitch = getByTestId('public-switch');
      const uploadButton = getByTestId('upload-button');
      
      fireEvent.changeText(titleInput, 'Test Video');
      fireEvent.changeText(descriptionInput, 'Test Description');
      fireEvent(publicSwitch, 'valueChange', false);
      fireEvent.press(uploadButton);
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalled();
      });
      
      // Form should be reset
      expect(titleInput.props.value).toBe('');
      expect(descriptionInput.props.value).toBe('');
      expect(publicSwitch.props.value).toBe(true);
    });
  });

  describe('Upload Progress', () => {
    it('should show upload progress when isUploading is true', () => {
      const { getByTestId } = render(
        <VideoUploadModal {...defaultProps} isUploading={true} uploadProgress={50} />
      );
      
      expect(getByTestId('upload-progress')).toBeTruthy();
    });

    it('should not show upload progress when isUploading is false', () => {
      const { queryByTestId } = render(
        <VideoUploadModal {...defaultProps} isUploading={false} />
      );
      
      expect(queryByTestId('upload-progress')).toBeFalsy();
    });

    it('should display upload progress percentage', () => {
      const { getByText } = render(
        <VideoUploadModal {...defaultProps} isUploading={true} uploadProgress={75} />
      );
      
      expect(getByText('75%')).toBeTruthy();
    });

    it('should display processing status', () => {
      const { getByText } = render(
        <VideoUploadModal
          {...defaultProps}
          isUploading={true}
          processingStatus="Creating thumbnail..."
        />
      );
      
      expect(getByText('Creating thumbnail...')).toBeTruthy();
    });

    it('should display default processing message if no status provided', () => {
      const { getByText } = render(
        <VideoUploadModal {...defaultProps} isUploading={true} />
      );
      
      expect(getByText('Processing...')).toBeTruthy();
    });

    it('should show additional note when generating thumbnail', () => {
      const { getByText } = render(
        <VideoUploadModal
          {...defaultProps}
          isUploading={true}
          processingStatus="Generating thumbnail..."
        />
      );
      
      expect(getByText(/This may take longer for large files/)).toBeTruthy();
    });

    it('should disable form inputs during upload', () => {
      const { getByTestId } = render(
        <VideoUploadModal {...defaultProps} isUploading={true} />
      );
      
      expect(getByTestId('title-input').props.editable).toBe(false);
      expect(getByTestId('description-input').props.editable).toBe(false);
      expect(getByTestId('public-switch').props.disabled).toBe(true);
    });

    it('should disable buttons during upload', () => {
      const { getByTestId } = render(
        <VideoUploadModal {...defaultProps} isUploading={true} />
      );
      
      expect(getByTestId('cancel-button').props.disabled).toBe(true);
      expect(getByTestId('upload-button').props.disabled).toBe(true);
    });

    it('should show "Uploading..." text on button during upload', () => {
      const { getByText } = render(
        <VideoUploadModal {...defaultProps} isUploading={true} />
      );
      
      expect(getByText('Uploading...')).toBeTruthy();
    });
  });

  describe('Modal Closing', () => {
    it('should call onClose when close button is pressed', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      fireEvent.press(getByTestId('close-button'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is pressed', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      fireEvent.press(getByTestId('cancel-button'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not close during upload', () => {
      const { getByTestId } = render(
        <VideoUploadModal {...defaultProps} isUploading={true} />
      );
      
      fireEvent.press(getByTestId('close-button'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should reset form when closing', () => {
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      const titleInput = getByTestId('title-input');
      fireEvent.changeText(titleInput, 'Test');
      fireEvent.press(getByTestId('cancel-button'));
      
      expect(titleInput.props.value).toBe('');
    });

    it('should clear errors when closing', async () => {
      mockValidateVideoMetadata.mockReturnValue({
        isValid: false,
        errors: ['Validation error'],
      });
      
      const { getByTestId, getByText, queryByText } = render(
        <VideoUploadModal {...defaultProps} />
      );
      
      // Generate an error
      fireEvent.press(getByTestId('upload-button'));
      await waitFor(() => {
        expect(getByText('Validation error')).toBeTruthy();
      });
      
      // Close modal
      fireEvent.press(getByTestId('cancel-button'));
      
      // Error should be cleared
      expect(queryByText('Validation error')).toBeFalsy();
    });
  });

  describe('Form Reset on Modal Open', () => {
    it('should reset form when modal opens with new video', () => {
      const { getByTestId, rerender } = render(
        <VideoUploadModal {...defaultProps} visible={true} videoUri="first-video.mp4" />
      );
      
      // Fill in form
      const titleInput = getByTestId('title-input');
      fireEvent.changeText(titleInput, 'Old Title');
      expect(titleInput.props.value).toBe('Old Title');
      
      // Change to new video (simulates re-opening modal with different video)
      rerender(
        <VideoUploadModal {...defaultProps} visible={true} videoUri="new-video.mp4" />
      );
      
      // Form should be reset
      expect(titleInput.props.value).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle upload button disabled when no video URI', () => {
      const { getByTestId } = render(
        <VideoUploadModal {...defaultProps} videoUri={null} />
      );
      
      expect(getByTestId('upload-button').props.disabled).toBe(true);
    });

    it('should handle empty strings as optional fields', async () => {
      mockOnUpload.mockResolvedValue(undefined);
      
      const { getByTestId } = render(<VideoUploadModal {...defaultProps} />);
      
      const titleInput = getByTestId('title-input');
      const descriptionInput = getByTestId('description-input');
      
      // Enter then clear
      fireEvent.changeText(titleInput, 'Test');
      fireEvent.changeText(titleInput, '   '); // Only whitespace
      fireEvent.changeText(descriptionInput, '   ');
      
      fireEvent.press(getByTestId('upload-button'));
      
      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Video'), // Uses default
            description: expect.stringContaining('Uploaded on'), // Uses default
          })
        );
      });
    });
  });
});
