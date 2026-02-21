import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
// Note: useNavigation and useFocusEffect are imported conditionally to support web platform
import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { app } from '../../firebase-config';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { useUserProfile } from '../context/UserProfileContext';
import { usePhotoUpload } from '../hooks/photo/usePhotoUpload';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { EditProfileModal, ProfileData } from '../components/profile/EditProfileModal';
import { PhotoGrid } from '../components/profile/PhotoGrid';
import { ProfileTab } from '../components/profile/ProfileTab';
import { VideoGrid } from '../components/video/VideoGrid';
import { AIItinerarySection } from '../components/profile/AIItinerarySection';
import { ContactDiscoveryBanner } from '../components/contacts/ContactDiscoveryBanner';
import { ContactPermissionModal } from '../components/contacts/ContactPermissionModal';
import { ContactsService } from '../services/contacts/ContactsService';
import { ContactDiscoveryRepository } from '../repositories/contacts/ContactDiscoveryRepository';
import { MatchedContact, UnmatchedContact } from '../services/contacts/types';
import { ContactToInvite } from '../components/contacts/InviteContactCard';
import type { PhotoSlot } from '../types/Photo';

// Platform-specific route param handling
let useRouteParams: () => { openEditModal?: boolean; incompleteProfile?: boolean; missingFields?: string[] };

if (Platform.OS === 'web') {
  // Web: use URL search params
  useRouteParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
      openEditModal: params.get('edit') === 'true',
      incompleteProfile: params.get('incomplete') === 'true',
      missingFields: params.get('missingFields')?.split(',') || [],
    };
  };
} else {
  // Native: use React Navigation
  const { useRoute } = require('@react-navigation/native');
  useRouteParams = () => {
    try {
      const route = useRoute();
      return route.params || {};
    } catch {
      return {};
    }
  };
}

type TabType = 'profile' | 'photos' | 'videos' | 'itinerary';

// Safe navigation hook wrapper for cross-platform compatibility
const useSafeNavigation = () => {
  if (Platform.OS === 'web') {
    // Web doesn't use React Navigation
    return null;
  }
  
  try {
    const { useNavigation } = require('@react-navigation/native');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useNavigation();
  } catch (error) {
    console.warn('[ProfilePage] Navigation not available:', error);
    return null;
  }
};

// Safe focus effect hook wrapper for cross-platform compatibility
const useSafeFocusEffect = (callback: () => void, deps: any[]) => {
  if (Platform.OS === 'web') {
    // Web: use regular useEffect since there's no navigation context
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(callback, deps);
  } else {
    // Native: use useFocusEffect from React Navigation
    try {
      const { useFocusEffect } = require('@react-navigation/native');
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useFocusEffect(
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useCallback(callback, deps)
      );
    } catch (error) {
      console.warn('[ProfilePage] useFocusEffect not available, falling back to useEffect:', error);
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(callback, deps);
    }
  }
};

// Versioned AsyncStorage keys — ensures app upgrades invalidate stale contact cache
const APP_VERSION = Constants.expoConfig?.version ?? '0';

const ProfilePage: React.FC = () => {
  const routeParams = useRouteParams();
  const navigation = useSafeNavigation();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { userProfile, updateProfile, isLoading } = useUserProfile();
  const { selectAndUploadPhoto, deletePhoto, uploadState } = usePhotoUpload();
  const { signOut } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Initialize contact discovery service (handles full flow internally)
  const contactsService = new ContactsService();
  const contactDiscoveryRepo = new ContactDiscoveryRepository();
  
  // Contact Discovery State
  const [contactsSynced, setContactsSynced] = useState(false);
  const [matchedContactsCount, setMatchedContactsCount] = useState(0);
  const [matchedContacts, setMatchedContactsRaw] = useState<MatchedContact[]>([]);
  const [contactsToInvite, setContactsToInviteRaw] = useState<ContactToInvite[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  
  // Wrap setters to use functional updates (prevents dependency issues)
  const setMatchedContacts = React.useCallback((value: MatchedContact[] | ((prev: MatchedContact[]) => MatchedContact[])) => {
    setMatchedContactsRaw(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      return newValue;
    });
  }, []);
  
  const setContactsToInvite = React.useCallback((value: ContactToInvite[] | ((prev: ContactToInvite[]) => ContactToInvite[])) => {
    setContactsToInviteRaw(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      return newValue;
    });
  }, []);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);

  // Removed auto-opening of EditProfileModal
  // Profile completion is now only enforced when creating itineraries
  // Users can explore the app without being forced to complete their profile

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

    // Check for non-empty string values (trim to handle whitespace)
    const usernameCheck = userProfile.username?.trim();
    if (usernameCheck) score += weights.username;
    
    const bioCheck = userProfile.bio?.trim();
    if (bioCheck) score += weights.bio;
    
    const dobCheck = userProfile.dob?.trim();
    if (dobCheck) score += weights.dob;
    
    const genderCheck = userProfile.gender?.trim();
    if (genderCheck) score += weights.gender;
    
    const orientationCheck = userProfile.sexualOrientation?.trim();
    if (orientationCheck) score += weights.sexualOrientation;
    
    const statusCheck = userProfile.status?.trim();
    if (statusCheck) score += weights.status;
    
    const photoCheck = userProfile.photoURL || userProfile.photos?.profile;
    if (photoCheck) score += weights.photoURL;
    
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
        showAlert('success', 'Profile photo updated successfully');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      showAlert('error', `Failed to update profile photo: ${err.message}`);
    }
  };

  /**
   * Handle profile photo delete
   */
  const handleDeleteProfilePhoto = async () => {
    try {
      await deletePhoto('profile' as PhotoSlot);
      showAlert('success', 'Profile photo removed');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Delete failed');
      showAlert('error', `Failed to delete profile photo: ${err.message}`);
    }
  };

  const handleSaveProfile = async (data: ProfileData) => {
    try {
      await updateProfile(data);
      setEditModalVisible(false); // Close modal immediately after successful save
      showAlert('success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('error', 'Failed to update profile');
      throw error; // Let modal handle the error state
    }
  };

  /**
   * Handle gallery photo upload success
   */
  const handleGalleryPhotoUploadSuccess = (slot: PhotoSlot, url: string) => {
    showAlert('success', `Photo uploaded to ${slot}`);
  };

  /**
   * Handle gallery photo delete success
   */
  const handleGalleryPhotoDeleteSuccess = (slot: PhotoSlot) => {
    showAlert('success', `Photo removed from ${slot}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation happens automatically via AuthContext
    } catch (error) {
      showAlert('error', 'Error signing out');
    }
  };

  /**
   * Refresh contact discovery stats from Firestore contactSyncs collection
   * Fetches most recent sync metadata and updates state
   * Also restores contact arrays from AsyncStorage if available
   */
  const refreshContactStats = useCallback(async () => {
    if (!user?.uid) return;

    try {
      // Restore contact arrays from AsyncStorage (iOS fix)
      const storedMatched = await AsyncStorage.getItem(`matched_contacts_${user.uid}_${APP_VERSION}`);
      const storedToInvite = await AsyncStorage.getItem(`contacts_to_invite_${user.uid}_${APP_VERSION}`);
      
      if (storedMatched) {
        const parsedMatched = JSON.parse(storedMatched);
        setMatchedContacts(parsedMatched);
      }
      
      if (storedToInvite) {
        const parsedToInvite = JSON.parse(storedToInvite);
        setContactsToInvite(parsedToInvite);
      }
      
      // Fetch sync metadata from Firestore
      const db = getFirestore(app);
      const contactSyncsRef = collection(db, 'contactSyncs');
      const q = query(
        contactSyncsRef,
        where('userId', '==', user.uid),
        orderBy('syncedAt', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const syncDoc = querySnapshot.docs[0];
        const syncData = syncDoc.data();
        
        // Update state with most recent sync data
        setContactsSynced(true);
        setMatchedContactsCount(syncData.totalMatches || 0);
        
        // Convert Firestore Timestamp to Date
        if (syncData.syncedAt) {
          const timestamp = syncData.syncedAt as Timestamp;
          setLastSyncedAt(timestamp.toDate());
        }
      }
    } catch (error) {
      console.warn('[ProfilePage] Error refreshing contact stats:', error);
      // Don't show error to user - this is a background refresh
    }
  }, [user?.uid, setMatchedContacts, setContactsToInvite]);

  /**
   * Refresh contact stats when tab comes into focus
   * Uses platform-safe focus effect (regular useEffect on web, useFocusEffect on native)
   */
  useSafeFocusEffect(() => {
    refreshContactStats();
  }, [refreshContactStats]);

  /**
   * Handle contact discovery banner press
   */
  const handleContactDiscoveryPress = () => {
    if (!contactsSynced) {
      // First time: show permission modal
      setPermissionModalVisible(true);
    } else {
      // Already synced - give option to view results or re-sync
      Alert.alert(
        'Contact Discovery',
        'What would you like to do?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Results', 
            onPress: () => {
              // Navigate to discovery results page (mobile only)
              if (Platform.OS !== 'web' && navigation) {
                navigation.navigate('DiscoveryResults', {
                  matchedContacts,
                  contactsToInvite,
                });
              }
            }
          },
          { 
            text: 'Re-sync Contacts', 
            onPress: async () => {
              // Clear cache and AsyncStorage to force fresh sync
              if (user?.uid) {
                await AsyncStorage.removeItem(`matched_contacts_${user.uid}_${APP_VERSION}`);
                await AsyncStorage.removeItem(`contacts_to_invite_${user.uid}_${APP_VERSION}`);
                await contactsService.clearCache();
              }
              setPermissionModalVisible(true);
            },
            style: 'default'
          }
        ]
      );
    }
  };

  /**
   * Handle when user allows contact access from permission modal
   * Integrates with ContactsService (which calls ContactDiscoveryRepository)
   */
  const handleAllowContactAccess = async () => {
    try {
      // Check if contacts are supported on this platform
      if (!contactsService.isSupported()) {
        setPermissionModalVisible(false);
        showAlert('error', 'Contact discovery is not available in this browser. Use Chrome on Android, or download our iOS/Android app for the best experience.');
        return;
      }
      
      // Step 1: Request permission
      const permissionStatus = await contactsService.requestPermission();
      
      // Close modal after permission result
      setPermissionModalVisible(false);
      
      if (permissionStatus !== 'granted') {
        showAlert('error', 'Contact permission denied');
        return;
      }
      
      showAlert('info', 'Syncing contacts...');
      
      // Step 2: Sync contacts (ContactsService handles: fetch -> hash -> match)
      // Force refresh to bypass cache and read all contacts from device
      const syncResult = await contactsService.syncContacts(true);
      
      if (syncResult.errors && syncResult.errors.length > 0) {
        console.warn('[ProfilePage] Contact sync errors:', syncResult.errors);
      }
      
      // Step 3: Update state
      setContactsSynced(true);
      setMatchedContactsCount(syncResult.matched.length);
      setMatchedContacts(syncResult.matched);
      setLastSyncedAt(new Date()); // Set sync timestamp
      
      // Convert unmatched contacts to ContactToInvite format
      const inviteList: ContactToInvite[] = syncResult.unmatched.map(c => ({
        id: c.contactId,
        name: c.name || 'Unknown',
        contactInfo: c.identifier,
        type: c.identifierType as 'email' | 'phone',
        hash: '', // Will be generated when invite is sent
      }));
      setContactsToInvite(inviteList);
      
      // Persist to AsyncStorage for iOS state restoration
      if (user?.uid) {
        await AsyncStorage.setItem(`matched_contacts_${user.uid}_${APP_VERSION}`, JSON.stringify(syncResult.matched));
        await AsyncStorage.setItem(`contacts_to_invite_${user.uid}_${APP_VERSION}`, JSON.stringify(inviteList));
      }
      
      if (syncResult.matched.length > 0) {
        showAlert('success', `Found ${syncResult.matched.length} contacts on TravalPass!`);
      } else {
        showAlert('info', 'No contacts found on TravalPass yet');
      }
    } catch (error) {
      setPermissionModalVisible(false); // Make sure modal closes on error
      const err = error instanceof Error ? error : new Error('Sync failed');
      console.error('[ProfilePage] Contact sync error:', err);
      showAlert('error', `Failed to sync contacts: ${err.message}`);
    }
  };

  /**
   * Handle Connect button - create connection with matched user
   */
  const handleConnectUser = async (userId: string) => {
    if (!user) return;
    
    try {
      // TODO: Implement connection creation in Firestore
      // For now, just show success
      showAlert('success', 'Connection request sent!');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to connect');
      showAlert('error', `Failed to connect: ${err.message}`);
    }
  };

  /**
   * Handle Invite button - send SMS/email with referral link
   */
  const handleInviteContact = async (contact: ContactToInvite) => {
    if (!user) return;
    
    try {
      // Call sendContactInvite Cloud Function
      const hashingService = contactsService['hashingService'];
      const hash = contact.type === 'phone'
        ? await hashingService.hashPhoneNumber(contact.contactInfo)
        : await hashingService.hashEmail(contact.contactInfo);
      
      const result = await contactDiscoveryRepo.sendInvite(hash, 'sms');
      
      // Open native SMS/Email with invite link
      const message = `Hey ${contact.name}! Join me on TravalPass to find travel buddies: ${result.inviteLink}`;
      
      if (contact.type === 'phone') {
        const smsUrl = Platform.OS === 'ios'
          ? `sms:${contact.contactInfo}&body=${encodeURIComponent(message)}`
          : `sms:${contact.contactInfo}?body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrl);
      } else {
        const emailUrl = `mailto:${contact.contactInfo}?subject=${encodeURIComponent('Join me on TravalPass!')}&body=${encodeURIComponent(message)}`;
        await Linking.openURL(emailUrl);
      }
      
      showAlert('success', 'Invite sent!');
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to send invite');
      showAlert('error', `Failed to send invite: ${err.message}`);
    }
  };

  /**
   * Handle Invite All button
   */
  const handleInviteAll = async () => {
    // TODO: Implement bulk invite
    showAlert('info', 'Invite all coming soon!');
  };

  /**
   * Handle when user dismisses permission modal
   */
  const handleDismissPermissionModal = () => {
    setPermissionModalVisible(false);
  };

  // Debug logging

  // Show loading state while profile is being fetched
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If no profile exists after loading completes, auto-open edit modal to create profile
  // This handles cases where Firestore data was deleted or sign-up failed to create profile
  if (!userProfile) {

    // Show minimal UI with edit modal
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyStateTitle}>Profile Not Found</Text>
          <Text style={styles.emptyStateText}>
            Let's create your profile to get started
          </Text>
          <TouchableOpacity 
            style={styles.createProfileButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Text style={styles.createProfileButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
        
        {/* Edit modal for creating new profile */}
        <EditProfileModal
          visible={editModalVisible}
          onClose={() => {
            // Allow user to dismiss the modal
            setEditModalVisible(false);
            Alert.alert(
              'Profile Incomplete',
              'Some features may be limited until you complete your profile. You can create it anytime from the Profile tab.',
              [{ text: 'OK' }]
            );
          }}
          onSave={handleSaveProfile}
          initialData={{
            username: '',
            bio: '',
            dob: '',
            gender: '',
            sexualOrientation: '',
            status: '',
            edu: '',
            drinking: '',
            smoking: '',
          }}
        />
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
        return <ProfileTab onEditPreferences={() => setActiveTab('itinerary')} />;
      
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
        return <AIItinerarySection onRequestEditProfile={handleEditProfile} />;
      
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
          location={
            userProfile.location 
              ? [userProfile.location.city, userProfile.location.state, userProfile.location.country]
                  .filter(Boolean)
                  .join(', ')
              : undefined
          }
          profileCompleteness={calculateCompleteness()}
          onEditPress={handleEditProfile}
          onPhotoPress={handleChangeProfilePhoto}
          onPhotoDelete={handleDeleteProfilePhoto}
          hasPhoto={!!(userProfile.photoURL || userProfile.photos?.profile)}
          uploadProgress={uploadState.progress}
          isUploading={uploadState.loading}
        />

        {/* Contact Discovery Banner */}
        <ContactDiscoveryBanner
          hasSynced={contactsSynced}
          matchCount={matchedContactsCount}
          lastSyncedAt={lastSyncedAt}
          onPress={handleContactDiscoveryPress}
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
        initialData={{
          username: userProfile?.username || '',
          bio: userProfile?.bio || '',
          dob: userProfile?.dob || '',
          gender: userProfile?.gender || '',
          sexualOrientation: userProfile?.sexualOrientation || '',
          status: userProfile?.status || '',
          edu: userProfile?.edu || '',
          drinking: userProfile?.drinking || '',
          smoking: userProfile?.smoking || '',
        }}
      />
      
      {/* Contact Permission Modal */}
      <ContactPermissionModal
        visible={permissionModalVisible}
        onAllowAccess={handleAllowContactAccess}
        onDismiss={handleDismissPermissionModal}
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
    fontSize: 18,
    color: '#666',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  createProfileButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createProfileButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 32,
  },
  getStartedButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
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