/**
 * ProfileHeader Component
 * Displays user profile photo, name, bio, and profile completeness
 * Phase 1: Core profile display with edit capability
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProfileHeaderProps {
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  profileCompleteness: number;
  onEditPress: () => void;
  onPhotoPress?: () => void | Promise<void>; // Optional - triggers photo change
  onPhotoDelete?: () => void; // Optional - triggers photo delete
  hasPhoto?: boolean; // Whether user has a profile photo
  uploadProgress?: number; // Upload progress (0-100)
  isUploading?: boolean; // Whether photo is currently uploading
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  displayName,
  email,
  photoURL,
  bio,
  location,
  profileCompleteness,
  onEditPress,
  onPhotoPress,
  onPhotoDelete,
  hasPhoto = false,
  uploadProgress = 0,
  isUploading = false,
}) => {
  const insets = useSafeAreaInsets();
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState(false);
  const [isPickerLoading, setIsPickerLoading] = useState(false);

  const getProfileImage = () => {
    if (photoURL) {
      return { uri: photoURL };
    }
    // Default avatar placeholder
    return require('../../../assets/images/DEFAULT_AVATAR.png');
  };

  const handlePhotoTap = () => {
    if (hasPhoto) {
      setShowPhotoMenu(true);
    }
  };

  const handleViewPhoto = () => {
    setShowPhotoMenu(false);
    setEnlargedPhoto(true);
  };

  const handleDeletePhoto = () => {
    setShowPhotoMenu(false);
    Alert.alert(
      'Delete Profile Photo',
      'Are you sure you want to delete your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onPhotoDelete) {
              onPhotoDelete();
            }
          },
        },
      ]
    );
  };

  const handleCloseMenu = () => {
    setShowPhotoMenu(false);
  };

  const handleCloseEnlarged = () => {
    setEnlargedPhoto(false);
  };

  const handleCameraPress = async () => {
    console.debug('[ProfileHeader] handleCameraPress invoked');
    if (onPhotoPress) {
      setIsPickerLoading(true);
      try {
        console.debug('[ProfileHeader] calling onPhotoPress()');
        await onPhotoPress();
        console.debug('[ProfileHeader] onPhotoPress resolved');
      } catch (err) {
        console.debug('[ProfileHeader] onPhotoPress threw', err);
        throw err;
      } finally {
        setIsPickerLoading(false);
      }
    } else if (onEditPress) {
      onEditPress();
    }
  };

  const getCompletenessColor = () => {
    if (profileCompleteness >= 80) return '#4CAF50'; // Green
    if (profileCompleteness >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getCompletenessLabel = () => {
    if (profileCompleteness >= 80) return 'Complete';
    if (profileCompleteness >= 50) return 'Almost there';
    return 'Incomplete';
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top + 12, 20) },
      ]}
      testID="profile-header"
    >
      {/* Profile Photo */}
      <View style={styles.photoContainer}>
        <TouchableOpacity onPress={handlePhotoTap} activeOpacity={0.8} disabled={isPickerLoading || isUploading}>
          <Image
            source={getProfileImage()}
            style={styles.photo}
            accessibilityLabel="Profile photo"
          />
          {(isPickerLoading || isUploading) && (
            <View style={styles.photoLoadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>
                {isPickerLoading ? 'Opening...' : `Uploading ${uploadProgress}%`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editPhotoButton}
          onPress={handleCameraPress}
          accessibilityLabel="Edit profile photo"
          testID="edit-photo-button"
          disabled={isPickerLoading || isUploading}
        >
          {(isPickerLoading || isUploading) ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="camera" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* User Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.displayName} testID="user-display-name">{displayName || email}</Text>
        {location && (
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.location}>{location}</Text>
          </View>
        )}
        {bio && <Text style={styles.bio} testID="user-bio">{bio}</Text>}
      </View>

      {/* Profile Completeness Badge */}
      <View style={styles.completenessContainer}>
        <View
          style={[
            styles.completenessBadge,
            { backgroundColor: getCompletenessColor() },
          ]}
        >
          <Ionicons
            name={profileCompleteness >= 80 ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color="#fff"
          />
          <Text style={styles.completenessText}>
            {profileCompleteness}% {getCompletenessLabel()}
          </Text>
        </View>
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={onEditPress}
        accessibilityLabel="Edit profile"
        testID="edit-profile-button"
      >
        <Ionicons name="create-outline" size={20} color="#1976d2" />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </TouchableOpacity>

      {/* Photo Menu Modal */}
      <Modal
        visible={showPhotoMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <View style={styles.menuModalOverlay}>
            <View style={styles.menuContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={handleViewPhoto}>
                <Ionicons name="eye-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>View Photo</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.menuItemDelete]} 
                onPress={handleDeletePhoto}
              >
                <Ionicons name="trash-outline" size={24} color="#f44336" />
                <Text style={[styles.menuItemText, styles.menuItemDeleteText]}>Delete Photo</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity style={styles.menuItem} onPress={handleCloseMenu}>
                <Text style={styles.menuItemText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Enlarged Photo Modal */}
      <Modal
        visible={enlargedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEnlarged}
      >
        <TouchableWithoutFeedback onPress={handleCloseEnlarged}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseEnlarged}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
              <Image
                source={getProfileImage()}
                style={styles.enlargedPhoto}
                resizeMode="contain"
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
  },
  photoLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1976d2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  completenessContainer: {
    marginBottom: 16,
  },
  completenessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completenessText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  editButtonText: {
    color: '#1976d2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Menu Modal Styles
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemDelete: {
    // Additional styling for delete button if needed
  },
  menuItemDeleteText: {
    color: '#f44336',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  // Enlarged Photo Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedPhoto: {
    width: '90%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
});
