/**
 * Profile Screen - Exact replica of voyager-pwa Profile.tsx
 * Main user profile with tabs for profile info, photos, videos, and travel preferences
 * 
 * Features:
 * - Tabbed interface (Profile, Photos, Videos, Travel Preferences)
 * - Background image matching PWA
 * - Profile photo and user information display
 * - Edit profile functionality
 * - Logout menu
 * - Scrollable content areas
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebaseConfig';
import { useAlert } from '../context/AlertContext';
import { doc, getDoc } from 'firebase/firestore';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// User profile type (matching PWA)
interface UserProfile {
  username?: string;
  email?: string;
  bio?: string;
  dob?: string;
  gender?: string;
  sexualOrientation?: string;
  edu?: string;
  drinking?: string;
  smoking?: string;
  photos?: string[];
  subscriptionType?: string;
}

const ProfileScreen: React.FC = () => {
  const { showAlert } = useAlert();
  const [currentTab, setCurrentTab] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const userId = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email;

  // Fetch user profile (same logic as PWA useGetUserProfile)
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;
      
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // Create default profile if none exists
          setUserProfile({
            username: userEmail?.split('@')[0] || 'User',
            email: userEmail || '',
            bio: '',
            subscriptionType: 'free'
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        showAlert('error', 'Failed to load profile');
      }
    };

    fetchUserProfile();
  }, [userId, userEmail, showAlert]);

  // Calculate age (same logic as PWA)
  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Handle logout (same logic as PWA)
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              // Note: In RN, we'd navigate instead of setting window.location
              showAlert('success', 'Logged out successfully');
            } catch (error) {
              showAlert('error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  // Tab names (matching PWA)
  const tabs = ['Profile', 'Photos', 'Videos', 'Travel Preferences'];

  // Profile field component (matching PWA ProfileField)
  const ProfileField = ({ label, value, required = false }: { 
    label: string; 
    value: string | number | null | undefined; 
    required?: boolean;
  }) => (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabel}>
        {label}{required && ' *'}
      </Text>
      <Text style={styles.fieldValue}>
        {value || 'Not specified'}
      </Text>
    </View>
  );

  // Render tab content
  const renderTabContent = () => {
    switch (currentTab) {
      case 0: // Profile Tab
        return (
          <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <ProfileField label="Email" value={userProfile?.email} required />
            <ProfileField label="Bio" value={userProfile?.bio} />
            <ProfileField 
              label="Age" 
              value={userProfile?.dob ? calculateAge(userProfile.dob) : null} 
            />
            <ProfileField label="Gender" value={userProfile?.gender} />
            <ProfileField label="Sexual Orientation" value={userProfile?.sexualOrientation} />
            <ProfileField label="Education" value={userProfile?.edu} />
            <ProfileField label="Drinking" value={userProfile?.drinking} />
            <ProfileField label="Smoking" value={userProfile?.smoking} />
            <ProfileField 
              label="Subscription" 
              value={userProfile?.subscriptionType?.toUpperCase()} 
            />
          </ScrollView>
        );
      
      case 1: // Photos Tab
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Photo Grid</Text>
            <Text style={styles.subPlaceholderText}>Photo management coming soon</Text>
          </View>
        );
      
      case 2: // Videos Tab
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Video Grid</Text>
            <Text style={styles.subPlaceholderText}>Video management coming soon</Text>
          </View>
        );
      
      case 3: // Travel Preferences Tab
        return (
          <View style={styles.tabContent}>
            <Text style={styles.placeholderText}>Travel Preferences</Text>
            <Text style={styles.subPlaceholderText}>Travel preferences coming soon</Text>
          </View>
        );
      
      default:
        return null;
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

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2340&q=80' }}
      style={styles.backgroundImage}
    >
      <SafeAreaView style={styles.container}>
        {/* Fixed Header: Profile Photo + Username + Tabs (matching PWA) */}
        <View style={styles.header}>
          {/* Profile Photo and Username */}
          <View style={styles.profileHeader}>
            <View style={styles.profilePhotoContainer}>
              <View style={styles.profilePhoto}>
                <Text style={styles.profilePhotoText}>
                  {(userProfile.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.username}>{userProfile.username || 'User'}</Text>
              <Text style={styles.userEmail}>{userProfile.email}</Text>
            </View>
            
            {/* Menu Button */}
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={styles.menuButtonText}>⋮</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs (matching PWA Tabs) */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
          >
            {tabs.map((tab, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.tab, currentTab === index && styles.activeTab]}
                onPress={() => setCurrentTab(index)}
              >
                <Text style={[styles.tabText, currentTab === index && styles.activeTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Scrollable Content Area (matching PWA structure) */}
        <View style={styles.contentArea}>
          {renderTabContent()}
        </View>

        {/* Menu Modal */}
        <Modal
          visible={menuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity 
            style={styles.menuOverlay}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  setEditModalVisible(true);
                }}
              >
                <Text style={styles.menuItemText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  handleLogout();
                }}
              >
                <Text style={[styles.menuItemText, styles.logoutText]}>🚪 Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Edit Profile Modal (placeholder) */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseButton}>← Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalSaveButton}>Save</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.placeholderText}>Edit Profile Form</Text>
              <Text style={styles.subPlaceholderText}>
                Profile editing functionality will be implemented next.
              </Text>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark overlay like PWA
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
  },

  // Header Section (matching PWA fixed header)
  header: {
    backgroundColor: 'transparent',
    paddingTop: 32, // Account for status bar
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  
  // Profile Header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profilePhotoContainer: {
    marginRight: 16,
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  profilePhotoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },

  // Tabs (matching PWA Material-UI Tabs)
  tabsContainer: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: 'white',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },

  // Content Area (matching PWA scrollable content)
  contentArea: {
    flex: 1,
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  tabContent: {
    flex: 1,
  },

  // Profile Fields (matching PWA ProfileField)
  profileField: {
    padding: screenWidth < 600 ? 8 : 16,
    marginVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  fieldLabel: {
    fontSize: screenWidth < 600 ? 10.4 : 12, // caption fontSize
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    marginBottom: screenWidth < 600 ? 2 : 4,
  },
  fieldValue: {
    fontSize: screenWidth < 600 ? 12 : 14, // body2 fontSize
    color: 'white',
    fontWeight: '400',
  },

  // Placeholder content
  placeholderText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
    marginTop: 40,
    fontWeight: 'bold',
  },
  subPlaceholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 8,
  },

  // Menu Modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  logoutText: {
    color: '#f44336',
  },

  // Edit Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    marginTop: 40,
  },
  modalCloseButton: {
    fontSize: 16,
    color: '#1976d2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#1976d2',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});

export default ProfileScreen;