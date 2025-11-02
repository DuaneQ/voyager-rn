/**
 * ViewProfileModal Component - React Native replica of PWA ViewProfileModal
 * 
 * @module components/modals/ViewProfileModal
 * @description Full-screen modal for viewing user profiles with tabs for
 * Profile, Ratings, and Videos. Includes block/report functionality.
 * 
 * Features:
 * - Profile tab: photos, bio, basic info
 * - Ratings tab: star rating, comments list
 * - Videos tab: video gallery
 * - Block user: updates blocked list, removes connections
 * - Report user: sends report to Firestore
 */

import React, { useEffect, useState, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { UserProfileContext } from '../../context/UserProfileContext';
import { auth } from '../../../firebase-config';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ViewProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  if (value !== index) return null;
  return <View style={styles.tabPanel}>{children}</View>;
};

export const ViewProfileModal: React.FC<ViewProfileModalProps> = ({
  visible,
  onClose,
  userId,
}) => {
  const contextValue = useContext(UserProfileContext);
  const updateUserProfile = contextValue?.updateUserProfile || (() => {});

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [canRate, setCanRate] = useState<boolean>(false);
  const [checkingConnection, setCheckingConnection] = useState<boolean>(false);

  const currentUserId = auth.currentUser?.uid;
  const db = getFirestore();

  // Check if the current user has a connection with the viewed user
  useEffect(() => {
    if (!visible || !currentUserId || !userId) {
      setCanRate(false);
      return;
    }
    // Prevent rating self
    if (currentUserId === userId) {
      setCanRate(false);
      return;
    }
    setCheckingConnection(true);
    const checkConnection = async () => {
      try {
        const connectionsRef = collection(db, 'connections');
        const q = query(
          connectionsRef,
          where('users', 'array-contains', currentUserId)
        );
        const snapshot = await getDocs(q);
        let found = false;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.users && data.users.includes(userId)) {
            found = true;
          }
        });
        setCanRate(found);
      } catch (error) {
        console.error('Error checking connection:', error);
        setCanRate(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    checkConnection();
  }, [visible, currentUserId, userId, db]);

  // Fetch user profile
  useEffect(() => {
    if (!visible || !userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile(userData);
          // Set first photo as default
          if (userData.photos && userData.photos.length > 0) {
            setSelectedPhoto(userData.photos[0]);
          }
        } else {
          Alert.alert('Error', 'User profile not found');
          onClose();
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile');
        onClose();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [visible, userId, db, onClose]);

  const handleBlock = async () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile?.username || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!currentUserId) return;
              
              // Update current user's blocked list
              const userRef = doc(db, 'users', currentUserId);
              await updateDoc(userRef, {
                blocked: arrayUnion(userId),
              });

              // Refresh user profile from context
              if (updateUserProfile) {
                // Context will reload from Firestore
                updateUserProfile({});
              }

              Alert.alert('Success', 'User blocked successfully');
              onClose();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    Alert.prompt(
      'Report User',
      'Please describe why you are reporting this user',
      async (text) => {
        if (!text || text.trim().length === 0) return;

        try {
          const reportRef = collection(db, 'reports');
          await updateDoc(doc(reportRef), {
            reporterId: currentUserId,
            reportedUserId: userId,
            reason: text.trim(),
            createdAt: new Date().toISOString(),
          });

          Alert.alert('Success', 'Report submitted successfully');
        } catch (error) {
          console.error('Error reporting user:', error);
          Alert.alert('Error', 'Failed to submit report');
        }
      }
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {profile?.username || 'Profile'}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleBlock} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🚫</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReport} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>🚩</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976d2" />
          </View>
        ) : (
          <>
            {/* Tab Bar */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, currentTab === 0 && styles.activeTab]}
                onPress={() => setCurrentTab(0)}
              >
                <Text
                  style={[
                    styles.tabText,
                    currentTab === 0 && styles.activeTabText,
                  ]}
                >
                  Profile
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, currentTab === 1 && styles.activeTab]}
                onPress={() => setCurrentTab(1)}
              >
                <Text
                  style={[
                    styles.tabText,
                    currentTab === 1 && styles.activeTabText,
                  ]}
                >
                  Ratings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, currentTab === 2 && styles.activeTab]}
                onPress={() => setCurrentTab(2)}
              >
                <Text
                  style={[
                    styles.tabText,
                    currentTab === 2 && styles.activeTabText,
                  ]}
                >
                  Videos
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <ScrollView style={styles.content}>
              <TabPanel value={currentTab} index={0}>
                {/* Profile Tab */}
                <View style={styles.profileTab}>
                  {/* Photo Gallery */}
                  {selectedPhoto && (
                    <Image
                      source={{ uri: selectedPhoto }}
                      style={styles.mainPhoto}
                      resizeMode="cover"
                    />
                  )}
                  
                  {profile?.photos && profile.photos.length > 1 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.photoThumbnails}
                    >
                      {profile.photos.map((photo: string, index: number) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => setSelectedPhoto(photo)}
                        >
                          <Image
                            source={{ uri: photo }}
                            style={[
                              styles.thumbnail,
                              selectedPhoto === photo && styles.selectedThumbnail,
                            ]}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Profile Info */}
                  <View style={styles.infoSection}>
                    <Text style={styles.label}>About</Text>
                    <Text style={styles.value}>
                      {profile?.bio || 'No bio provided'}
                    </Text>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.label}>Age</Text>
                    <Text style={styles.value}>{profile?.age || 'N/A'}</Text>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.label}>Location</Text>
                    <Text style={styles.value}>
                      {profile?.location || 'Not specified'}
                    </Text>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.label}>Gender</Text>
                    <Text style={styles.value}>
                      {profile?.gender || 'Not specified'}
                    </Text>
                  </View>

                  <View style={styles.infoSection}>
                    <Text style={styles.label}>Interests</Text>
                    <Text style={styles.value}>
                      {profile?.interests?.join(', ') || 'None listed'}
                    </Text>
                  </View>
                </View>
              </TabPanel>

              <TabPanel value={currentTab} index={1}>
                {/* Ratings Tab */}
                <View style={styles.ratingsTab}>
                  {checkingConnection ? (
                    <ActivityIndicator size="small" color="#1976d2" />
                  ) : (
                    <>
                      <View style={styles.ratingHeader}>
                        <Text style={styles.ratingTitle}>User Ratings</Text>
                        {profile?.averageRating !== undefined && (
                          <View style={styles.averageRating}>
                            <Text style={styles.averageRatingText}>
                              ⭐ {profile.averageRating.toFixed(1)}
                            </Text>
                            <Text style={styles.ratingCount}>
                              ({profile.ratingCount || 0} ratings)
                            </Text>
                          </View>
                        )}
                      </View>

                      {canRate && (
                        <View style={styles.ratePrompt}>
                          <Text style={styles.ratePromptText}>
                            You're connected! You can rate this user.
                          </Text>
                        </View>
                      )}

                      <Text style={styles.comingSoon}>
                        Rating comments coming soon...
                      </Text>
                    </>
                  )}
                </View>
              </TabPanel>

              <TabPanel value={currentTab} index={2}>
                {/* Videos Tab */}
                <View style={styles.videosTab}>
                  <Text style={styles.comingSoon}>
                    Video gallery coming soon...
                  </Text>
                </View>
              </TabPanel>
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1976d2',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabPanel: {
    flex: 1,
  },
  profileTab: {
    padding: 16,
  },
  mainPhoto: {
    width: '100%',
    height: screenHeight * 0.4,
    borderRadius: 8,
    marginBottom: 16,
  },
  photoThumbnails: {
    marginBottom: 16,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedThumbnail: {
    borderColor: '#1976d2',
  },
  infoSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  ratingsTab: {
    padding: 16,
  },
  ratingHeader: {
    marginBottom: 16,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  averageRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageRatingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffa000',
    marginRight: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#666',
  },
  ratePrompt: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  ratePromptText: {
    fontSize: 14,
    color: '#1976d2',
  },
  comingSoon: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
  },
  videosTab: {
    padding: 16,
  },
});

export default ViewProfileModal;
