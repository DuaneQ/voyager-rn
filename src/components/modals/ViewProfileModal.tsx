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

import React, { useState, useEffect, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
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
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { UserProfileContext } from '../../context/UserProfileContext';
import * as firebaseCfg from '../../config/firebaseConfig';
import { calculateAge } from '../../utils/calculateAge';
import { VideoService } from '../../services/video/VideoService';
import { Ionicons } from '@expo/vector-icons';

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
  const [allPhotos, setAllPhotos] = useState<string[]>([]);
  const [userVideos, setUserVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [enlargedVideo, setEnlargedVideo] = useState<any | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false); // Mute state for enlarged video

  // Resolve auth lazily - prefer getAuthInstance() but fall back to legacy auth
  const _tentativeAuth: any = typeof (firebaseCfg as any).getAuthInstance === 'function'
    ? (firebaseCfg as any).getAuthInstance()
    : (firebaseCfg as any).auth;
  const _effectiveAuth: any = _tentativeAuth && _tentativeAuth.currentUser ? _tentativeAuth : (firebaseCfg as any).auth;
  const currentUserId = _effectiveAuth?.currentUser?.uid;
  const db = getFirestore();
  const storage = getStorage();

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
          
          // Load all photos from slot-based structure (matching PWA)
          const photos = userData.photos || {};
          const photoSlots = [
            photos.profile,
            photos.slot1,
            photos.slot2,
            photos.slot3,
            photos.slot4,
          ].filter(Boolean);
          
          setAllPhotos(photoSlots);
          
          // Set main profile photo
          if (photos.profile) {
            setSelectedPhoto(photos.profile);
          } else if (photoSlots.length > 0) {
            setSelectedPhoto(photoSlots[0]);
          } else {
            // Try to load from storage slot_0 if no photos in document
            try {
              const photoRef = ref(storage, `users/${userId}/profile/slot_0`);
              const url = await getDownloadURL(photoRef);
              setSelectedPhoto(url);
              setAllPhotos([url]);
            } catch (error) {
              console.log('No profile photo found in storage');
            }
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
  }, [visible, userId, db, storage, onClose]);

  // Load videos when Videos tab is selected
  useEffect(() => {
    if (currentTab !== 2 || !visible || !userId || userVideos.length > 0) return;

    const loadVideos = async () => {
      setLoadingVideos(true);
      try {
        const videosQuery = query(
          collection(db, 'videos'),
          where('userId', '==', userId)
        );
        const videosSnapshot = await getDocs(videosQuery);
        const videos: any[] = [];
        videosSnapshot.forEach((doc) => {
          videos.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setUserVideos(videos);
      } catch (error) {
        console.error('Error loading videos:', error);
      } finally {
        setLoadingVideos(false);
      }
    };

    loadVideos();
  }, [currentTab, visible, userId, db, userVideos.length]);

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
              if (updateUserProfile && currentUserId) {
                // Fetch fresh profile data after blocking
                const userDoc = await getDoc(doc(db, 'users', currentUserId));
                if (userDoc.exists()) {
                  updateUserProfile(userDoc.data() as any);
                }
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

  const handleDeleteVideo = async (video: any) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const videoService = new VideoService();
              await videoService.deleteVideo(video.id, video);
              
              // Remove from local state
              setUserVideos((prev) => prev.filter((v) => v.id !== video.id));
              
              Alert.alert('Success', 'Video deleted successfully');
            } catch (error) {
              console.error('Error deleting video:', error);
              Alert.alert('Error', 'Failed to delete video');
            }
          },
        },
      ]
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
            <ActivityIndicator testID="loading-indicator" size="large" color="#1976d2" />
          </View>
        ) : (
          <>
            {/* Profile Photo, Username, and Star Rating - Always visible at top */}
            <View style={styles.profileHeader}>
              {selectedPhoto ? (
                <TouchableOpacity onPress={() => setEnlargedPhoto(selectedPhoto)}>
                  <Image
                    source={{ uri: selectedPhoto }}
                    style={styles.profilePhoto}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.profilePhotoPlaceholder}>
                  <Text style={styles.profilePhotoPlaceholderText}>?</Text>
                </View>
              )}
              <Text style={styles.username}>{profile?.username || 'User'}</Text>
              
              {/* Star Rating Display */}
              <View style={styles.ratingDisplay}>
                <View style={styles.starRating}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Text
                      key={star}
                      style={[
                        styles.ratingStar,
                        star <= Math.round(profile?.ratings?.average || 0) && styles.ratingStarFilled,
                      ]}
                    >
                      ★
                    </Text>
                  ))}
                </View>
                {profile?.ratings?.average ? (
                  <View style={styles.ratingInfo}>
                    <Text style={styles.ratingAverage}>
                      {profile.ratings.average.toFixed(1)}
                    </Text>
                    <Text style={styles.ratingCountText}>
                      ({profile.ratings.count || 0})
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.noRatingsText}>No ratings yet</Text>
                )}
                {!canRate && !checkingConnection && (
                  <Text style={styles.connectToRateText}>(Connect to rate)</Text>
                )}
              </View>
            </View>

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
                  Photos
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
              <TouchableOpacity
                style={[styles.tab, currentTab === 3 && styles.activeTab]}
                onPress={() => setCurrentTab(3)}
              >
                <Text
                  style={[
                    styles.tabText,
                    currentTab === 3 && styles.activeTabText,
                  ]}
                >
                  Ratings
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            <ScrollView style={styles.content}>
              <TabPanel value={currentTab} index={0}>
                {/* Profile Tab - Read-only form fields matching PWA */}
                <View style={styles.profileTab}>
                  {/* Bio */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Bio</Text>
                    <View style={styles.fieldInputContainer}>
                      <Text style={styles.fieldInputText}>
                        {profile?.bio || ''}
                      </Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Status</Text>
                    <View style={styles.fieldInputContainer}>
                      <Text style={styles.fieldInputText}>
                        {profile?.status || ''}
                      </Text>
                    </View>
                  </View>

                  {/* Gender */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Gender</Text>
                    <View style={styles.fieldInputContainer}>
                      <Text style={styles.fieldInputText}>
                        {profile?.gender || ''}
                      </Text>
                    </View>
                  </View>

                  {/* Sexual Orientation */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Sexual Orientation</Text>
                    <View style={styles.fieldInputContainer}>
                      <Text style={styles.fieldInputText}>
                        {profile?.sexualOrientation || ''}
                      </Text>
                    </View>
                  </View>

                  {/* Education */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Education</Text>
                    <View style={styles.fieldInputContainer}>
                      <Text style={styles.fieldInputText}>
                        {profile?.edu || ''}
                      </Text>
                    </View>
                  </View>

                  {/* Drinking */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Drinking</Text>
                    <View style={styles.fieldInputContainer}>
                      <Text style={styles.fieldInputText}>
                        {profile?.drinking || ''}
                      </Text>
                    </View>
                  </View>

                  {/* Smoking */}
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel}>Smoking</Text>
                    <View style={styles.fieldInputContainer}>
                      <Text style={styles.fieldInputText}>
                        {profile?.smoking || ''}
                      </Text>
                    </View>
                  </View>
                </View>
              </TabPanel>

              <TabPanel value={currentTab} index={1}>
                {/* Photos Tab - Grid of all user photos */}
                <View style={styles.photosTab}>
                  {allPhotos.length > 0 ? (
                    <View style={styles.photoGrid}>
                      {allPhotos.map((photoUrl, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.photoGridItem}
                          onPress={() => setEnlargedPhoto(photoUrl)}
                          testID={`photo-grid-item-${index}`}
                        >
                          <Image
                            source={{ uri: photoUrl }}
                            style={styles.gridPhoto}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No photos available</Text>
                    </View>
                  )}
                </View>
              </TabPanel>

              <TabPanel value={currentTab} index={2}>
                {/* Videos Tab - Grid of user videos */}
                <View style={styles.videosTab}>
                  {loadingVideos ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#1976d2" />
                    </View>
                  ) : userVideos.length > 0 ? (
                    <View style={styles.videoGrid}>
                      {userVideos.map((video) => (
                        <View key={video.id} style={styles.videoGridItem}>
                          <TouchableOpacity
                            style={styles.videoTouchable}
                            onPress={() => setEnlargedVideo(video)}
                            testID={`video-grid-item-${video.id}`}
                          >
                            {video.thumbnailUrl ? (
                              <Image
                                source={{ uri: video.thumbnailUrl }}
                                style={styles.videoThumbnail}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.videoPlaceholder}>
                                <Text style={styles.videoPlaceholderText}>▶</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                          {/* Delete button - only show when viewing own profile */}
                          {currentUserId === userId && (
                            <TouchableOpacity
                              style={styles.deleteVideoButton}
                              onPress={() => handleDeleteVideo(video)}
                            >
                              <Ionicons name="trash-outline" size={20} color="#fff" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No videos available</Text>
                    </View>
                  )}
                </View>
              </TabPanel>

              <TabPanel value={currentTab} index={3}>
                {/* Ratings Tab - With star ratings and comments */}
                <View style={styles.ratingsTab}>
                  {checkingConnection ? (
                    <ActivityIndicator size="small" color="#1976d2" />
                  ) : (
                    <>
                      <View style={styles.ratingHeader}>
                        <Text style={styles.ratingTitle}>User Ratings</Text>
                        {profile?.ratings?.average !== undefined && (
                          <View style={styles.averageRating}>
                            <Text style={styles.averageRatingText}>
                              ⭐ {profile.ratings.average.toFixed(1)}
                            </Text>
                            <Text style={styles.ratingCount}>
                              ({profile.ratings.count || 0} ratings)
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

                      {/* Ratings Comments List */}
                      {profile?.ratings?.ratedBy && Object.keys(profile.ratings.ratedBy).length > 0 ? (
                        <View style={styles.commentsSection}>
                          <Text style={styles.commentsTitle}>User Reviews</Text>
                          <ScrollView style={styles.commentsList} nestedScrollEnabled>
                            {Object.entries(profile.ratings.ratedBy)
                              .filter(([, entry]: any) => entry.comment && entry.comment.trim())
                              .map(([uid, entry]: any) => (
                                <View key={uid} style={styles.commentCard}>
                                  <View style={styles.commentHeader}>
                                    <View style={styles.starRating}>
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Text
                                          key={star}
                                          style={[
                                            styles.star,
                                            star <= entry.rating && styles.starFilled,
                                          ]}
                                        >
                                          ★
                                        </Text>
                                      ))}
                                    </View>
                                    <Text style={styles.commentDate}>
                                      {entry.timestamp
                                        ? new Date(entry.timestamp).toLocaleDateString()
                                        : ''}
                                    </Text>
                                  </View>
                                  <Text style={styles.commentText}>{entry.comment}</Text>
                                  <Text style={styles.commentAuthor}>
                                    {uid === currentUserId ? 'You' : `User: ${uid.slice(0, 6)}...`}
                                  </Text>
                                </View>
                              ))}
                          </ScrollView>
                        </View>
                      ) : (
                        <Text style={styles.noReviewsText}>No reviews yet.</Text>
                      )}
                    </>
                  )}
                </View>
              </TabPanel>
            </ScrollView>
          </>
        )}
      </SafeAreaView>

      {/* Enlarged Photo Modal */}
      <Modal
        visible={!!enlargedPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEnlargedPhoto(null)}
        testID="enlarged-photo-modal"
      >
        <View style={styles.enlargedPhotoContainer}>
          <TouchableOpacity
            style={styles.enlargedPhotoBackdrop}
            activeOpacity={1}
            onPress={() => setEnlargedPhoto(null)}
          >
            <View style={styles.enlargedPhotoContent}>
              <TouchableOpacity
                style={styles.enlargedPhotoCloseButton}
                onPress={() => setEnlargedPhoto(null)}
                testID="enlarged-photo-close-button"
              >
                <Text style={styles.enlargedPhotoCloseText}>✕</Text>
              </TouchableOpacity>
              {enlargedPhoto && (
                <Image
                  source={{ uri: enlargedPhoto }}
                  style={styles.enlargedPhotoImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Enlarged Video Modal */}
      <Modal
        visible={!!enlargedVideo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEnlargedVideo(null)}
        testID="enlarged-video-modal"
      >
        <View style={styles.enlargedVideoContainer}>
          <TouchableOpacity
            style={styles.enlargedVideoBackdrop}
            activeOpacity={1}
            onPress={() => setEnlargedVideo(null)}
          >
            <View style={styles.enlargedVideoContent}>
              <TouchableOpacity
                style={styles.enlargedVideoCloseButton}
                onPress={() => setEnlargedVideo(null)}
                testID="enlarged-video-close-button"
              >
                <Text style={styles.enlargedVideoCloseText}>✕</Text>
              </TouchableOpacity>
              {enlargedVideo && (
                <Video
                  source={{ uri: enlargedVideo.videoUrl }}
                  style={styles.enlargedVideoPlayer}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  isMuted={isVideoMuted}
                />
              )}
              {/* Mute toggle button for profile videos */}
              <TouchableOpacity
                style={styles.profileVideoMuteButton}
                onPress={() => setIsVideoMuted(!isVideoMuted)}
                testID="profile-video-mute-button"
              >
                <Ionicons
                  name={isVideoMuted ? 'volume-mute' : 'volume-high'}
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
    padding: 20,
    backgroundColor: '#fff',
  },
  mainPhoto: {
    width: '100%',
    height: screenHeight * 0.45, // Larger photo area like PWA
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#f5f5f5',
  },
  noPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#d0d0d0', // Slightly darker to match PWA
  },
  noPhotoText: {
    fontSize: 18,
    color: '#999',
    fontWeight: '500',
  },
  infoSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 16,
    color: '#212121',
    lineHeight: 24,
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
  // Photos Tab Styles
  photosTab: {
    padding: 16,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoGridItem: {
    width: (screenWidth - 48) / 2, // (screenWidth - padding*2 - gap) / 2
    height: (screenWidth - 48) / 2, // Square aspect ratio
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  gridPhoto: {
    width: '100%',
    height: '100%',
  },
  // Videos Tab Styles
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  videoGridItem: {
    width: (screenWidth - 48) / 2, // (screenWidth - padding*2 - gap) / 2
    height: ((screenWidth - 48) / 2) * (16 / 9), // 9:16 aspect ratio for videos
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  videoPlaceholderText: {
    fontSize: 48,
    color: '#fff',
  },
  deleteVideoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Empty State Styles
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 18,
    color: '#999',
    textAlign: 'center',
  },
  // Comments Section Styles
  commentsSection: {
    marginTop: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  commentsList: {
    maxHeight: 300,
  },
  commentCard: {
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    color: '#ddd',
    marginRight: 2,
  },
  starFilled: {
    color: '#ffa000',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  // Profile Header Styles (photo, username, rating at top)
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  profilePhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoPlaceholderText: {
    fontSize: 32,
    color: '#999',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ratingStar: {
    fontSize: 18,
    color: '#ddd',
    marginHorizontal: 1,
  },
  ratingStarFilled: {
    color: '#1976d2',
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  ratingAverage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  ratingCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  noRatingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  connectToRateText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
  },
  // Form Field Styles (Profile Tab - matching PWA TextFields)
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    marginLeft: 12,
  },
  fieldInputContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  fieldInputText: {
    fontSize: 16,
    color: '#222',
    lineHeight: 22,
  },
  // Enlarged Photo Modal Styles
  enlargedPhotoContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedPhotoBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedPhotoContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  enlargedPhotoCloseButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  enlargedPhotoCloseText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  enlargedPhotoImage: {
    width: '100%',
    height: '100%',
  },
  // Enlarged Video Modal Styles
  enlargedVideoContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedVideoBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedVideoContent: {
    width: '90%',
    height: '70%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  enlargedVideoCloseButton: {
    position: 'absolute',
    top: -40,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  enlargedVideoCloseText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  enlargedVideoPlayer: {
    width: '100%',
    height: '100%',
  },
  profileVideoMuteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    elevation: 5, // Android elevation for proper touch handling
  },
});

export default ViewProfileModal;
