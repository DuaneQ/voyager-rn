/**
 * VideoUploadModal Component
 * Modal for configuring video metadata and privacy before upload
 * 
 * React Native replica of PWA VideoUploadModal
 * Follows Single Responsibility Principle: handles only upload form UI
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VideoUploadData } from '../../types/Video';
import { validateVideoMetadata } from '../../utils/videoValidation';
import { sanitizeString } from '../../utils/sanitizeInput';

interface VideoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (videoData: VideoUploadData) => Promise<void>;
  videoUri: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
  processingStatus?: string | null;
}

/**
 * VideoUploadModal Component
 * 
 * Dependency Inversion: Depends on videoData abstraction, not specific upload implementation
 * Interface Segregation: Props are minimal and focused on this component's needs
 */
export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  visible,
  onClose,
  onUpload,
  videoUri,
  isUploading = false,
  uploadProgress = 0,
  processingStatus = null,
}) => {
  // Form state (Single Responsibility: manage form data only)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  // Reset form when modal opens with new video
  useEffect(() => {
    if (visible && videoUri) {
      setTitle('');
      setDescription('');
      setIsPublic(true);
      setErrors([]);
    }
  }, [visible, videoUri]);

  /**
   * Handle form submission
   * Validates metadata before calling upload callback
   */
  const handleSubmit = async () => {
    if (!videoUri) {
      setErrors(['No video selected']);
      return;
    }

    setErrors([]);

    // Sanitize inputs first (security: remove HTML, scripts, control chars)
    const sanitizedTitle = sanitizeString(title.trim());
    const sanitizedDescription = sanitizeString(description.trim());

    // Validate metadata - only if values are provided (Open/Closed: validation logic is separate)
    const metadataValidation = validateVideoMetadata(
      sanitizedTitle || undefined,
      sanitizedDescription || undefined
    );

    if (!metadataValidation.isValid) {
      setErrors(metadataValidation.errors);
      return;
    }

    try {
      // Generate default title if none provided (matches PWA behavior)
      const defaultTitle = sanitizedTitle || `Video ${new Date().toLocaleDateString()}`;
      const defaultDescription = sanitizedDescription || `Uploaded on ${new Date().toLocaleDateString()}`;

      await onUpload({
        uri: videoUri,
        title: defaultTitle,
        description: defaultDescription,
        isPublic,
      });

      // Reset form after successful upload
      setTitle('');
      setDescription('');
      setIsPublic(true);
      setErrors([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setErrors([errorMessage]);
    }
  };

  /**
   * Handle modal close
   * Prevents closing during upload
   */
  const handleClose = () => {
    if (!isUploading) {
      setTitle('');
      setDescription('');
      setIsPublic(true);
      setErrors([]);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
      testID="video-upload-modal"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Upload Video</Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isUploading}
                style={styles.closeButton}
                testID="close-button"
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={isUploading ? '#999' : '#333'}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Error Messages */}
              {errors.length > 0 && (
                <View style={styles.errorContainer} testID="error-messages">
                  {errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>
                      {error}
                    </Text>
                  ))}
                </View>
              )}

              {/* Video Info */}
              {videoUri && (
                <View style={styles.infoContainer}>
                  <Ionicons name="videocam" size={20} color="#1976d2" />
                  <Text style={styles.infoText}>Video selected and ready to upload</Text>
                </View>
              )}

              {/* Title Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Title (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Paris Travel Adventure"
                  placeholderTextColor="#999"
                  maxLength={100}
                  editable={!isUploading}
                  testID="title-input"
                />
                <Text style={styles.helperText}>{title.length}/100 characters</Text>
              </View>

              {/* Description Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your video..."
                  placeholderTextColor="#999"
                  maxLength={200}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  editable={!isUploading}
                  testID="description-input"
                />
                <Text style={styles.helperText}>{description.length}/200 characters</Text>
              </View>

              {/* Privacy Toggle */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={styles.label}>Make Video Public</Text>
                    <Text style={styles.switchHelperText}>
                      {isPublic
                        ? 'Everyone can see this video'
                        : 'Only your connections can see this video'}
                    </Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    disabled={isUploading}
                    trackColor={{ false: '#767577', true: '#1976d2' }}
                    thumbColor={isPublic ? '#fff' : '#f4f3f4'}
                    testID="public-switch"
                  />
                </View>
              </View>

              {/* Upload Progress */}
              {isUploading && (
                <View style={styles.uploadProgress} testID="upload-progress">
                  <View style={styles.progressHeader}>
                    <ActivityIndicator size="small" color="#1976d2" />
                    <Text style={styles.progressStatus}>
                      {processingStatus || 'Processing...'}
                    </Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[styles.progressBar, { width: `${uploadProgress}%` }]}
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
                  {processingStatus?.includes('thumbnail') && (
                    <Text style={styles.progressNote}>
                      This may take longer for large files. Please wait...
                    </Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                  disabled={isUploading}
                  testID="cancel-button"
                >
                  <Text
                    style={[
                      styles.buttonText,
                      styles.cancelButtonText,
                      isUploading && styles.disabledText,
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.uploadButton,
                    (isUploading || !videoUri) && styles.disabledButton,
                  ]}
                  onPress={handleSubmit}
                  disabled={isUploading || !videoUri}
                  testID="upload-button"
                >
                  <Text style={[styles.buttonText, styles.uploadButtonText]}>
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    marginBottom: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 8,
    color: '#1976d2',
    fontSize: 14,
    flex: 1,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchHelperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  uploadProgress: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressStatus: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    marginRight: 8,
  },
  uploadButton: {
    backgroundColor: '#1976d2',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333',
  },
  uploadButtonText: {
    color: '#fff',
  },
  disabledText: {
    color: '#999',
  },
});
