import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../config/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useAlert } from '../context/AlertContext';
import { useUserProfile } from '../context/UserProfileContext';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { EditProfileModal, ProfileData } from '../components/profile/EditProfileModal';
import { PhotoGrid } from '../components/profile/PhotoGrid';
import { ProfileTab } from '../components/profile/ProfileTab';

interface Photo {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: Date;
}

type TabType = 'profile' | 'photos' | 'videos' | 'itinerary';

const ProfilePage: React.FC = () => {
  const { showAlert } = useAlert();
  const { userProfile, updateProfile, loading: profileLoading } = useUserProfile();
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);

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
    if (userProfile.photoURL) score += weights.photoURL;

    return score;
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
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

  const handleAddPhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showAlert('Permission required', 'error');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // TODO: Upload to Firebase Storage and save URL to Firestore
        const newPhoto: Photo = {
          id: Date.now().toString(),
          url: result.assets[0].uri,
          uploadedAt: new Date(),
        };
        
        setPhotos((prev) => [...prev, newPhoto]);
        showAlert('Photo added successfully', 'success');
      }
    } catch (error) {
      console.error('Error adding photo:', error);
      showAlert('Failed to add photo', 'error');
    }
  };

  const handlePhotoPress = (photo: Photo) => {
    // TODO: Open photo viewer/lightbox
    if (Platform.OS === 'web') {
      Alert.alert('Photo', photo.caption || 'Travel photo');
    } else {
      Alert.alert('Photo', photo.caption || 'Travel photo', [
        { text: 'Delete', style: 'destructive', onPress: () => handleDeletePhoto(photo.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    showAlert('Photo deleted', 'success');
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
            photos={photos}
            onPhotoPress={handlePhotoPress}
            onAddPhoto={handleAddPhoto}
            isOwnProfile={true}
          />
        );
      
      case 'videos':
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Videos feature coming soon</Text>
          </View>
        );
      
      case 'itinerary':
        return (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>AI Itinerary feature coming soon</Text>
          </View>
        );
      
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
          photoURL={userProfile.photoURL}
          bio={userProfile.bio}
          location={userProfile.location}
          profileCompleteness={calculateCompleteness()}
          onEditPress={handleEditProfile}
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