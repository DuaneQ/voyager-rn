/**
 * Search Screen - React Native implementation with PostgreSQL integration
 * Fetches all user itineraries (AI + manual) and displays matches
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ImageBackground,
  Alert,
} from 'react-native';
import { auth } from '../config/firebaseConfig';
import { useAlert } from '../context/AlertContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAllItineraries } from '../hooks/useAllItineraries';
import { ItinerarySelector } from '../components/search/ItinerarySelector';
import AddItineraryModal from '../components/search/AddItineraryModal';

const SearchPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyViews, setDailyViews] = useState(0);
  const [currentMockIndex, setCurrentMockIndex] = useState(0);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { showAlert } = useAlert();
  const { userProfile } = useUserProfile();
  
  // Fetch all itineraries (AI + manual) from PostgreSQL
  const { itineraries, loading: itinerariesLoading, error: itinerariesError, refreshItineraries } = useAllItineraries();

  // Mock itineraries shown only when user has no real itineraries
  const mockItineraries = [
    {
      title: 'Amazing Tokyo Adventure',
      destination: 'Tokyo, Japan',
      duration: '7 days',
      description: 'AI Generated - Here is where you will search for other travelers going to the same destination with overlapping dates.  After saving your user profile, you can click the Add Itinerary button above to manually create an itinerary.',
      creator: 'TokyoExplorer'
    },
    {
      title: 'Paris Romance',
      destination: 'Paris, France',
      duration: '5 days',
      description: 'You can use AI to create an itinerary for you after saving your travel preference profile. After you have itineraries you will select one from the combobox above. If you have any potential matches they will appear here.',
      creator: 'ParisianDreamer'
    },
    {
      title: 'NYC Urban Explorer',
      destination: 'New York, USA',
      duration: '4 days',
      description: 'You can view their profile and ratings from past travels with others.  Click the airplane to like their itinerary. If the same traveler likes your itinerary then it is a match! Once you match you can navigate to the Chats tab to start planning your trip together!',
      creator: 'CityWalker'
    }
  ];

  useEffect(() => {
    // Simple auth check
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auto-select first itinerary when loaded
  useEffect(() => {
    if (itineraries.length > 0 && !selectedItineraryId) {
      setSelectedItineraryId(itineraries[0].id);
    }
  }, [itineraries, selectedItineraryId]);

  const handleItinerarySelect = (id: string) => {
    setSelectedItineraryId(id);
    // TODO: Fetch matching itineraries from search service
    console.log('[SearchPage] Selected itinerary:', id);
  };

  const handleAddItinerary = () => {
    // Check profile completion before opening modal
    if (!userProfile?.dob || !userProfile?.gender) {
      Alert.alert(
        'Complete Your Profile',
        'Please complete your profile (date of birth and gender) before creating an itinerary.',
        [{ text: 'OK' }]
      );
      return;
    }
    setModalVisible(true);
  };

  const handleItineraryAdded = async () => {
    // Refresh itinerary list after create/edit/delete
    await refreshItineraries();
    setModalVisible(false);
    showAlert('Itinerary saved successfully!', 'success');
  };

  const handleLike = () => {
    if (!userId) {
      showAlert('Please log in to like itineraries', 'warning');
      return;
    }
    
    if (dailyViews >= 10) {
      showAlert('Daily limit reached! Upgrade to premium for unlimited views.', 'info');
      return;
    }

    setDailyViews(prev => prev + 1);
    showAlert(`Liked "${mockItineraries[currentMockIndex].title}"!`, 'success');
    nextMockItinerary();
  };

  const handleDislike = () => {
    if (!userId) {
      showAlert('Please log in to browse itineraries', 'warning');
      return;
    }

    if (dailyViews >= 10) {
      showAlert('Daily limit reached! Upgrade to premium for unlimited views.', 'info');
      return;
    }

    setDailyViews(prev => prev + 1);
    showAlert(`Passed on "${mockItineraries[currentMockIndex].title}"`, 'info');
    nextMockItinerary();
  };

  const nextMockItinerary = () => {
    setCurrentMockIndex(prev => (prev + 1) % mockItineraries.length);
  };

  if (isLoading) {
    return (
      <ImageBackground 
        source={require('../../assets/images/login-image.jpeg')}
        style={styles.container}
        resizeMode="cover"
        imageStyle={styles.backgroundImage}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground 
      source={require('../../assets/images/login-image.jpeg')}
      style={styles.container}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView
        testID="homeScreen"
        accessible={true}
        accessibilityLabel="homeScreen"
        style={styles.safeArea}
      >
        {/* Itinerary Selector Dropdown */}
        <ItinerarySelector
          itineraries={itineraries}
          selectedItineraryId={selectedItineraryId}
          onSelect={handleItinerarySelect}
          onAddItinerary={handleAddItinerary}
          loading={itinerariesLoading}
        />

      {/* Usage Counter - only show when user has itineraries */}
      {itineraries.length > 0 && (
        <View style={styles.usageContainer}>
          <Text style={styles.usageText}>Views today: {dailyViews}/10</Text>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {userId ? (
          <>
            {/* Show mock itineraries only when user has no real itineraries */}
            {itineraries.length === 0 ? (
              <View style={styles.cardContainer}>
                <View style={styles.itineraryCard}>
                  <Text style={styles.cardTitle}>{mockItineraries[currentMockIndex].title}</Text>
                  <Text style={styles.cardDestination}>{mockItineraries[currentMockIndex].destination}</Text>
                  <Text style={styles.cardDuration}>{mockItineraries[currentMockIndex].duration}</Text>
                  <Text style={styles.cardDescription}>
                    {mockItineraries[currentMockIndex].description}
                  </Text>
                  <View style={styles.userInfo}>
                    <Text style={styles.userText}>Created by: {mockItineraries[currentMockIndex].creator}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={styles.dislikeButton} onPress={handleDislike}>
                    <Text style={styles.buttonText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
                    <Text style={styles.buttonText}>✈️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Show matching itineraries when user has selected an itinerary */
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>
                  {selectedItineraryId 
                    ? 'Select an itinerary above to find matches'
                    : 'No matches found yet'}
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>Please log in to see itineraries</Text>
          </View>
        )}
      </View>

      {/* Add Itinerary Modal */}
      <AddItineraryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onItineraryAdded={handleItineraryAdded}
        itineraries={itineraries}
        userProfile={userProfile}
      />
    </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  usageContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
  },
  usageText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itineraryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
    maxWidth: 350,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDestination: {
    fontSize: 18,
    color: '#1976d2',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDuration: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  userInfo: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  userText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 60,
    paddingVertical: 30,
    width: '100%',
  },
  dislikeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  likeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  instructions: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)',
  },
  instructionText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
  },
});

export default SearchPage;