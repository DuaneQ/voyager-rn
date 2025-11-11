/**
 * ProfileTab Component
 * Main Profile tab content with stats, accordions, and sign out
 * Reads data from UserProfileContext
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ProfileStats } from './ProfileStats';
import { PersonalInfoAccordion } from './PersonalInfoAccordion';
import { LifestyleAccordion } from './LifestyleAccordion';
import { TravelPreferencesAccordion } from './TravelPreferencesAccordion';
import { useUserProfile } from '../../context/UserProfileContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebaseConfig'; // Use already-initialized auth instance

export const ProfileTab: React.FC = () => {
  const { userProfile } = useUserProfile();

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

  // Placeholder values for unimplemented features
  const connections = 0;
  const trips = 0;
  const rating = 0.0;
  const ratingCount = 0;

  // Handler placeholders (future navigation)
  const handleConnectionsPress = () => {
    Alert.alert('Coming Soon', 'Connections feature is not yet implemented');
  };

  const handleTripsPress = () => {
    Alert.alert('Coming Soon', 'Trips feature is not yet implemented');
  };

  const handleRatingPress = () => {
    Alert.alert('Coming Soon', 'Ratings feature is not yet implemented');
  };

  const handleEditPreferences = () => {
    Alert.alert('Coming Soon', 'Travel preferences editing is not yet implemented');
  };

  const handleSignOut = () => {
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
              await signOut(auth); // Use already-initialized auth instance
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
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
});
