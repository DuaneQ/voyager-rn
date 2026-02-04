/**
 * ProfileTab Component
 * Main Profile tab content with stats, accordions, and sign out
 * Reads data from UserProfileContext
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal, Platform } from 'react-native';
import { ProfileStats } from './ProfileStats';
import { PersonalInfoAccordion } from './PersonalInfoAccordion';
import { LifestyleAccordion } from './LifestyleAccordion';
import { TravelPreferencesAccordion } from './TravelPreferencesAccordion';
import { RatingsModal } from '../modals/RatingsModal';
import { useUserProfile } from '../../context/UserProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useConnections } from '../../hooks/chat/useConnections';
import { useAllItineraries } from '../../hooks/useAllItineraries';
import { accountDeletionService } from '../../services/account/AccountDeletionService';

interface ProfileTabProps {
  onEditPreferences?: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onEditPreferences }) => {
  const { userProfile } = useUserProfile();
  const { signOut, user } = useAuth();
  const [ratingsModalVisible, setRatingsModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Fetch real data using hooks
  const { connections: connectionsData } = useConnections(user?.uid || null);
  const { itineraries } = useAllItineraries();

  // Calculate age from date of birth
  const calculateAge = (dob: string | undefined): number | undefined => {
    if (!dob) return undefined;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age;
  };

  const age = calculateAge(userProfile?.dob);

  // Calculate real values from fetched data
  const connections = connectionsData?.length || 0;
  const trips = itineraries?.length || 0;
  const rating = userProfile?.ratings?.average || 0;
  const ratingCount = userProfile?.ratings?.count || 0;

  // Handler placeholders (future navigation to detailed views)
  const handleConnectionsPress = () => {
    // TODO: Navigate to Connections/Chat tab
    Alert.alert('Connections', `You have ${connections} connection${connections !== 1 ? 's' : ''}`);
  };

  const handleTripsPress = () => {
    // TODO: Navigate to Trips/Itineraries list
    Alert.alert('Trips', `You have ${trips} trip${trips !== 1 ? 's' : ''}`);
  };

  const handleRatingPress = () => {
    // Open RatingsModal to show detailed reviews
    setRatingsModalVisible(true);
  };

  const handleEditPreferences = () => {
    if (onEditPreferences) {
      onEditPreferences();
    } else {
      // Fallback if no callback provided
      if (Platform.OS === 'web') {
        window.alert('Travel preferences editing is not yet configured');
      } else {
        Alert.alert('Coming Soon', 'Travel preferences editing is not yet configured');
      }
    }
  };

  const handleSignOut = () => {
    // Web browsers don't support Alert.alert, so use window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        signOut().catch((error) => {
          console.error('Sign out error:', error);
          window.alert('Failed to sign out. Please try again.');
        });
      }
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut();
              } catch (error) {
                console.error('Sign out error:', error);
                Alert.alert('Error', 'Failed to sign out. Please try again.');
              }
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password to confirm account deletion');
      return;
    }

    setIsDeleting(true);
    try {
      await accountDeletionService.deleteAccount(deletePassword);
      Alert.alert('Success', 'Your account has been deleted. We hope to see you again!');
      // User will be automatically logged out
    } catch (error: any) {
      console.error('[ProfileTab] Delete account error:', error);
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Error', 'For security, please log out and log back in before deleting your account.');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
      }
    } finally {
      setIsDeleting(false);
      setDeleteAccountModalVisible(false);
      setDeletePassword('');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Stats Row */}
      <ProfileStats
        connections={connections}
        trips={trips}
        rating={rating}
        ratingCount={ratingCount}
        onConnectionsPress={handleConnectionsPress}
        onTripsPress={handleTripsPress}
        onRatingPress={handleRatingPress}
      />

      {/* Accordions */}
      <View style={styles.accordionsContainer}>
        <PersonalInfoAccordion
          age={age}
          gender={userProfile?.gender}
          status={userProfile?.status}
          orientation={userProfile?.sexualOrientation}
        />

        <LifestyleAccordion
          education={userProfile?.edu}
          drinking={userProfile?.drinking}
          smoking={userProfile?.smoking}
        />

        <TravelPreferencesAccordion onEditPress={handleEditPreferences} />
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        accessibilityRole="button"
        accessibilityLabel="Sign Out"
        testID="sign-out-button"
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete Account Button - Danger Zone */}
      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setDeleteAccountModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Delete Account"
          testID="delete-account-button"
        >
          <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      {/* Ratings Modal */}
      <RatingsModal
        visible={ratingsModalVisible}
        onClose={() => setRatingsModalVisible(false)}
        ratings={userProfile?.ratings}
        currentUserId={user?.uid}
      />

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteAccountModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account?</Text>
            <Text style={styles.modalText}>
              This action cannot be undone. All your data will be permanently deleted,
              including your profile, itineraries, connections, and messages.
            </Text>
            <Text style={styles.modalWarning}>
              Your usage agreement acceptance will be preserved for legal compliance.
            </Text>
            
            <TextInput
              testID="delete-password-input"
              style={styles.passwordInput}
              placeholder="Enter your password to confirm"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoCapitalize="none"
              editable={!isDeleting}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                testID="cancel-delete-button"
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setDeleteAccountModalVisible(false);
                  setDeletePassword('');
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                testID="confirm-delete-button"
                style={[styles.modalButton, styles.confirmDeleteButton]}
                onPress={handleDeleteAccount}
                disabled={isDeleting || !deletePassword}
              >
                <Text style={styles.confirmDeleteButtonText}>
                  {isDeleting ? 'Deleting...' : 'Delete Forever'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  accordionsContainer: {
    padding: 16,
    gap: 12,
  },
  signOutButton: {
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  dangerZone: {
    marginTop: 24,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 12,
  },
  deleteAccountButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#dc3545',
  },
  modalText: {
    fontSize: 14,
    marginBottom: 12,
    color: '#666',
    lineHeight: 20,
  },
  modalWarning: {
    fontSize: 12,
    marginBottom: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#dc3545',
  },
  confirmDeleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
