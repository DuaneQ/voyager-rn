/**
 * ProfilePhotoUploader Component
 * Displays and manages the user's profile photo upload
 * 
 * Features:
 * - Circular avatar display
 * - Upload button overlay
 * - Real-time progress indicator during upload
 * - Error handling with user feedback
 * - Integrates with usePhotoUpload hook
 * 
 * S.O.L.I.D:
 * - Single Responsibility: Only handles profile photo UI
 * - Open/Closed: Extensible through props
 * - Dependency Inversion: Depends on usePhotoUpload abstraction
 */

import React, { useState, useContext, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { usePhotoUpload } from '../../hooks/photo/usePhotoUpload';
import { UserProfileContext } from '../../context/UserProfileContext';
import type { PhotoSlot } from '../../types/Photo';

/**
 * Component props
 */
interface ProfilePhotoUploaderProps {
  /** Override user ID (defaults to current user) */
  userId?: string;

  /** Avatar size in pixels */
  size?: number;

  /** Show upload button */
  showUploadButton?: boolean;

  /** Disabled state */
  disabled?: boolean;

  /** Callback on upload success */
  onUploadSuccess?: (url: string) => void;

  /** Callback on upload error */
  onUploadError?: (error: Error) => void;
}

/**
 * ProfilePhotoUploader Component
 */
export const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  userId,
  size = 120,
  showUploadButton = true,
  disabled = false,
  onUploadSuccess,
  onUploadError,
}) => {
  const { userProfile } = useContext(UserProfileContext);
  const {
    uploadState,
    selectAndUploadPhoto,
    deletePhoto,
  } = usePhotoUpload(userId);

  const [showActions, setShowActions] = useState(false);

  /**
   * Get current profile photo URL
   * Priority: uploadState.uploadedUrl (just uploaded) > userProfile.photos.profile (existing)
   */
  const currentPhotoUrl = useMemo(() => {
    return uploadState.uploadedUrl || userProfile?.photos?.profile || null;
  }, [uploadState.uploadedUrl, userProfile?.photos?.profile]);

  /**
   * Handle photo selection and upload
   */
  const handleUpload = async () => {
    try {
      const result = await selectAndUploadPhoto('profile' as PhotoSlot);
      
      if (result?.url) {
        onUploadSuccess?.(result.url);
        Alert.alert('Success', 'Profile photo uploaded successfully');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      onUploadError?.(error);
      Alert.alert('Upload Failed', error.message);
    }
  };

  /**
   * Handle photo deletion
   */
  const handleDelete = async () => {
    try {
      await deletePhoto('profile' as PhotoSlot);
      Alert.alert('Success', 'Profile photo removed');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Delete failed');
      Alert.alert('Delete Failed', error.message);
    }
  };

  /**
   * Show action menu (upload/delete)
   */
  const handleLongPress = () => {
    if (disabled || uploadState.loading) return;

    const options = currentPhotoUrl
      ? ['Upload New Photo', 'Remove Photo', 'Cancel']
      : ['Upload Photo', 'Cancel'];

    const destructiveIndex = currentPhotoUrl ? 1 : undefined;
    const cancelIndex = options.length - 1;

    Alert.alert(
      'Profile Photo',
      'Choose an action',
      options.map((option, index) => ({
        text: option,
        style: index === cancelIndex ? 'cancel' : index === destructiveIndex ? 'destructive' : 'default',
        onPress: () => {
          if (option === 'Upload New Photo' || option === 'Upload Photo') {
            handleUpload();
          } else if (option === 'Remove Photo') {
            handleDelete();
          }
        },
      }))
    );
  };

  /**
   * Get avatar styles
   */
  const avatarStyles = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
    }),
    [size]
  );

  /**
   * Get upload button size
   */
  const uploadButtonSize = useMemo(() => size * 0.3, [size]);

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <TouchableOpacity
        onPress={handleUpload}
        onLongPress={handleLongPress}
        disabled={disabled || uploadState.loading}
        activeOpacity={0.7}
        style={[styles.avatarContainer, avatarStyles]}
      >
        {currentPhotoUrl ? (
          <Image
            source={{ uri: currentPhotoUrl }}
            style={[styles.avatar, avatarStyles]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholder, avatarStyles]}>
            <MaterialIcons name="person" size={size * 0.5} color="#ccc" />
          </View>
        )}

        {/* Loading Overlay */}
        {uploadState.loading && (
          <View style={[styles.loadingOverlay, avatarStyles]}>
            <ActivityIndicator size="large" color="#fff" />
            {uploadState.progress > 0 && (
              <Text style={styles.progressText}>
                {Math.round(uploadState.progress)}%
              </Text>
            )}
          </View>
        )}

        {/* Upload Button */}
        {showUploadButton && !uploadState.loading && (
          <View
            style={[
              styles.uploadButton,
              {
                width: uploadButtonSize,
                height: uploadButtonSize,
                borderRadius: uploadButtonSize / 2,
              },
            ]}
          >
            <MaterialIcons
              name={currentPhotoUrl ? 'edit' : 'add-a-photo'}
              size={uploadButtonSize * 0.6}
              color="#fff"
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Error Message */}
      {uploadState.error && (
        <Text style={styles.errorText} numberOfLines={2}>
          {uploadState.error}
        </Text>
      )}
    </View>
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  uploadButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#ff3b30',
    textAlign: 'center',
    maxWidth: 200,
  },
});

export default ProfilePhotoUploader;
