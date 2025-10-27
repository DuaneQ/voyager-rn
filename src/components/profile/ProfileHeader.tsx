/**
 * ProfileHeader Component
 * Displays user profile photo, name, bio, and profile completeness
 * Phase 1: Core profile display with edit capability
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileHeaderProps {
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  location?: string;
  profileCompleteness: number;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  displayName,
  email,
  photoURL,
  bio,
  location,
  profileCompleteness,
  onEditPress,
}) => {
  const getProfileImage = () => {
    if (photoURL) {
      return { uri: photoURL };
    }
    // Default avatar placeholder
    return require('../../../assets/images/login-image.jpeg');
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
    <View style={styles.container} testID="profile-header">
      {/* Profile Photo */}
      <View style={styles.photoContainer}>
        <Image
          source={getProfileImage()}
          style={styles.photo}
          accessibilityLabel="Profile photo"
        />
        <TouchableOpacity
          style={styles.editPhotoButton}
          onPress={onEditPress}
          accessibilityLabel="Edit profile photo"
          testID="edit-photo-button"
        >
          <Ionicons name="camera" size={20} color="#fff" />
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
});
