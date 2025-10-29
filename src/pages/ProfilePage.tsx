import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Alert,
} from 'react-native';
import { auth } from '../config/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useAlert } from '../context/AlertContext';
import { useUserProfile } from '../context/UserProfileContext';
import { usePhotoUpload } from '../hooks/photo/usePhotoUpload';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { EditProfileModal, ProfileData } from '../components/profile/EditProfileModal';
import { PhotoGrid } from '../components/profile/PhotoGrid';
import { ProfileTab } from '../components/profile/ProfileTab';
import { VideoGrid } from '../components/video/VideoGrid';
import { AIItinerarySection } from '../components/profile/AIItinerarySection';
import type { PhotoSlot } from '../types/Photo';

type TabType = 'profile' | 'photos' | 'videos' | 'itinerary';

const ProfilePage: React.FC = () => {
  const { showAlert } = useAlert();
  const { userProfile, updateProfile, loading: profileLoading } = useUserProfile();
  const { selectAndUploadPhoto, deletePhoto, uploadState } = usePhotoUpload();
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Calculate profile completeness based on PWA fields
  const calculateCompleteness = (): number => {
    if (!userProfile) return 0;
    
    let score = 0;
    const weights = {
      username: 15,
      bio: 10,
      dob: 15,
      gender: 15,
      sexualOrientation: 15,
      status: 15,
      photoURL: 15,
    };

    if (userProfile.username) score += weights.username;
    if (userProfile.bio) score += weights.bio;
    if (userProfile.dob) score += weights.dob;
    if (userProfile.gender) score += weights.gender;
    if (userProfile.sexualOrientation) score += weights.sexualOrientation;
    if (userProfile.status) score += weights.status;
    if (userProfile.photoURL || userProfile.photos?.profile) score += weights.photoURL;

    return score;
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  /**
   * Handle when user taps camera icon on profile photo
   * Directly triggers photo upload
   */
  const handleChangeProfilePhoto = async () => {
    try {
      const result = await selectAndUploadPhoto('profile' as PhotoSlot);
      if (result?.url) {
        showAlert('Profile photo updated successfully', 'success');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      showAlert(`Failed to update profile photo: ${err.message}`, 'error');
    }
  };

  /**
   * Handle profile photo delete
   */
  const handleDeleteProfilePhoto = async () => {
    try {
      await deletePhoto('profile' as PhotoSlot);
      showAlert('Profile photo removed', 'success');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Delete failed');
      showAlert(`Failed to delete profile photo: ${err.message}`, 'error');
    }
  };

  const handleSaveProfile = async (data: ProfileData) => {
    try {
      await updateProfile(data);
      showAlert('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Failed to update profile', 'error');
      throw error;
    }
  };

  /**
   * Handle gallery photo upload success
   */
  const handleGalleryPhotoUploadSuccess = (slot: PhotoSlot, url: string) => {
    showAlert(`Photo uploaded to ${slot}`, 'success');
  };

  /**
   * Handle gallery photo delete success
   */
  const handleGalleryPhotoDeleteSuccess = (slot: PhotoSlot) => {
    showAlert(`Photo removed from ${slot}`, 'success');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // Navigation happens automatically via AuthContext
    } catch (error) {
      showAlert('Error signing out', 'error');
    }
  };

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const profileData: ProfileData = {
    username: userProfile.username || '',
    bio: userProfile.bio || '',
    dob: userProfile.dob || '',
    gender: userProfile.gender || '',
    sexualOrientation: userProfile.sexualOrientation || '',
    status: userProfile.status || '',
    edu: userProfile.edu || '',
    drinking: userProfile.drinking || '',
    smoking: userProfile.smoking || '',
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      
      case 'photos':
        return (
          <PhotoGrid
            isOwnProfile={true}
            onUploadSuccess={handleGalleryPhotoUploadSuccess}
            onDeleteSuccess={handleGalleryPhotoDeleteSuccess}
          />
        );
      
      case 'videos':
        return <VideoGrid />;
      
      case 'itinerary':
        return <AIItinerarySection />;
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <ProfileHeader
          displayName={userProfile.username || userProfile.displayName || ''}
          email={userProfile.email}
          photoURL={userProfile.photoURL || userProfile.photos?.profile}
          bio={userProfile.bio}
          location={userProfile.location}
          profileCompleteness={calculateCompleteness()}
          onEditPress={handleEditProfile}
          onPhotoPress={handleChangeProfilePhoto}
          onPhotoDelete={handleDeleteProfilePhoto}
          hasPhoto={!!(userProfile.photoURL || userProfile.photos?.profile)}
          uploadProgress={uploadState.progress}
          isUploading={uploadState.loading}
        />

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
              Profile
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
            onPress={() => setActiveTab('photos')}
          >
            <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
              Photos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
              Videos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'itinerary' && styles.activeTab]}
            onPress={() => setActiveTab('itinerary')}
          >
            <Text style={[styles.tabText, activeTab === 'itinerary' && styles.activeTabText]}>
              AI Itinerary
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {renderTabContent()}
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveProfile}
        initialData={profileData}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#1976d2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  placeholderContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  signOutButton: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#f44336',
  },
});

export default ProfilePage;