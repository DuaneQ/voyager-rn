/**
 * SearchPage - React Native implementation of itinerary matching
 * 
 * @module pages/SearchPage
 * @description Main screen for discovering and matching with other travelers.
 * Features: itinerary selector, card-based matching UI, like/dislike actions,
 * mutual match detection, usage limit enforcement.
 * 
 * Flow:
 * 1. User selects own itinerary from dropdown
 * 2. System searches for matching itineraries
 * 3. User views matches one-by-one with ItineraryCard
 * 4. Like/Dislike actions advance to next match
 * 5. Mutual likes create connection → chat enabled
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  ImageBackground,
  Platform,
} from 'react-native';
import { getAuthInstance } from '../config/firebaseConfig';

// Platform-safe useFocusEffect - on web, just use useEffect
let useFocusEffect: (callback: () => void | (() => void)) => void;
if (Platform.OS === 'web') {
  useFocusEffect = (callback) => {
    // On web, run on mount (no focus concept in React Router)
    useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, []);
  };
} else {
  useFocusEffect = require('@react-navigation/native').useFocusEffect;
}
import { Itinerary } from '../types/Itinerary';
import ItineraryCard from '../components/forms/ItineraryCard';
import { ItinerarySelector } from '../components/search/ItinerarySelector';
import useSearchItineraries from '../hooks/useSearchItineraries';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useUpdateItinerary } from '../hooks/useUpdateItinerary';
import { useAlert } from '../context/AlertContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAllItineraries } from '../hooks/useAllItineraries';
import { connectionRepository } from '../repositories/ConnectionRepository';
import { saveViewedItinerary, hasViewedItinerary } from '../utils/viewedStorage';
import AddItineraryModal from '../components/search/AddItineraryModal';
import { FeedbackButton } from '../components/utilities/FeedbackButton';
import SubscriptionCard from '../components/common/SubscriptionCard';

const SearchPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentMockIndex, setCurrentMockIndex] = useState(0);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Stripe checkout result status (Web only)
  const [checkoutStatus, setCheckoutStatus] = useState<'success' | 'cancel' | null>(null);
  const { showAlert } = useAlert();
  const { userProfile } = useUserProfile();
  
  // Usage tracking hook
  const { hasReachedLimit, trackView, dailyViewCount, refreshProfile } = useUsageTracking();
  
  // Update itinerary hook (for persisting likes)
  const { updateItinerary } = useUpdateItinerary();
  
  // Fetch all itineraries (AI + manual) from PostgreSQL
  const { itineraries, loading: itinerariesLoading, error: itinerariesError, refreshItineraries } = useAllItineraries();
  
  // Search hook for finding matching itineraries
  const { 
    matchingItineraries, 
    searchItineraries, 
    getNextItinerary, 
    loading: searchLoading, 
    hasMore, 
    error: searchError 
  } = useSearchItineraries();

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
    const authInstance = typeof getAuthInstance === 'function' ? getAuthInstance() : null;
    
    if (!authInstance?.onAuthStateChanged) {
      // No auth available - set loading to false immediately
      setIsLoading(false);
      return () => {};
    }
    
    const unsubscribe = authInstance.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  // Detect Stripe checkout result from URL query param (Web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const checkout = urlParams.get('checkout');
    
    if (checkout === 'success' || checkout === 'cancel') {
      setCheckoutStatus(checkout);
      // Remove the query param from URL without page reload
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Auto-clear the status message after 5 seconds
      const timeoutId = setTimeout(() => setCheckoutStatus(null), 5000);
      
      // Cleanup timeout if component unmounts
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Refresh itineraries whenever user navigates to this screen
  useFocusEffect(
    React.useCallback(() => {
      if (userId) {
        refreshItineraries();
        refreshProfile(); // Refresh usage tracking too
      }
    }, [userId, refreshItineraries, refreshProfile])
  );

  const handleItinerarySelect = async (id: string) => {
    setSelectedItineraryId(id);
    
    if (!userId) {
      showAlert('warning', 'Please log in to search for matches');
      return;
    }
    
    // Find the selected itinerary
    const selectedItinerary = itineraries.find(itin => itin.id === id);
    if (!selectedItinerary) {
      console.error('[SearchPage] Selected itinerary not found:', id);
      return;
    }

    // Trigger search for matching itineraries
    await searchItineraries(selectedItinerary as any, userId);
  };

  const handleAddItinerary = () => {
    // Check profile completion before opening modal
    if (!userProfile?.dob || !userProfile?.gender) {
      showAlert(
        'warning',
        'Please complete your profile (date of birth and gender) before creating an itinerary.'
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

  const handleLike = async (itinerary: Itinerary) => {
    if (!userId) {
      showAlert('warning', 'Please log in to like itineraries');
      return;
    }

    console.log('[SearchPage] 👍 handleLike START:', {
      itineraryId: itinerary.id,
      destination: itinerary.destination,
      userId
    });

    // Track usage (checks limit with fresh data internally)
    const success = await trackView();
    if (!success) {
      console.error('[SearchPage] ⛔ Like BLOCKED: trackView returned false (limit reached)');
      if (Platform.OS === 'web') {
        showAlert('info', 'Daily limit reached. Tap Upgrade for unlimited views and AI Itineraries');
      } else {
        showAlert(
          'info', 
          'Daily limit reached. Sign in on the web and tap the UPGRADE button on TravalMatch for unlimited views.',
          'https://travalpass.com/login',
          'Sign In to Upgrade'
        );
      }
      return;
    }

    console.log('[SearchPage] ✅ trackView succeeded - processing like');

    try {

      // Save as viewed
      saveViewedItinerary(itinerary.id);
      
      // 1. Update the liked itinerary with current user's ID
      const existingLikes = Array.isArray(itinerary.likes) ? itinerary.likes : [];
      const newLikes = Array.from(new Set([...existingLikes, userId]));

      // Persist likes via RPC (this calls the cloud function)
      try {
        const updatedItinerary = await updateItinerary(itinerary.id, { likes: newLikes });
        
      } catch (updateError) {
        console.error('[SearchPage] ❌ Failed to update itinerary likes:', updateError);
        throw new Error('Failed to save like. Please try again.');
      }
      
      // 2. Fetch fresh itineraries to check for mutual match (important!)
      
      const freshItineraries = await refreshItineraries();
      
      // 3. Get the current user's selected itinerary from fresh data
      const myItinerary = freshItineraries.find(itin => itin.id === selectedItineraryId);
      
      if (!myItinerary) {
        
        await getNextItinerary();
        return;
      }
      
      // 4. Check for mutual match
      const otherUserUid = itinerary.userInfo?.uid;
      if (!otherUserUid) {
        
        await getNextItinerary();
        return;
      }
      
      const myLikes = Array.isArray(myItinerary.likes) ? myItinerary.likes : [];

      if (myLikes.includes(otherUserUid)) {
        // MUTUAL MATCH! Create connection
        try {
          const myEmail = myItinerary?.userInfo?.email ?? '';
          const otherEmail = itinerary?.userInfo?.email ?? '';

          await connectionRepository.createConnection({
            user1Id: userId,
            user2Id: otherUserUid,
            itinerary1Id: selectedItineraryId,
            itinerary2Id: itinerary.id,
            itinerary1: myItinerary as any,
            itinerary2: itinerary as any
          });

          showAlert('success', "🎉 It's a match! You can now chat with this traveler.");
        } catch (connError: any) {
          console.error('[SearchPage] ❌ Error creating connection:', connError);
          console.error('[SearchPage] ❌ Error details:', JSON.stringify(connError, null, 2));
          // Don't fail the like action if connection creation fails
          showAlert('warning', 'Match detected but connection setup had issues. Please check Chats.');
        }
      } else {
        // no mutual match yet
      }
      
      // Advance to next itinerary
      await getNextItinerary();
      
    } catch (error: any) {
      console.error('[SearchPage] Error handling like:', error);
      showAlert('error', error?.message || 'Failed to like itinerary. Please try again.');
    }
  };

  const handleDislike = async (itinerary: Itinerary) => {
    if (!userId) {
      showAlert('warning', 'Please log in to browse itineraries');
      return;
    }

    console.log('[SearchPage] 👎 handleDislike START:', {
      itineraryId: itinerary.id,
      destination: itinerary.destination,
      userId
    });

    // Track usage (checks limit with fresh data internally)
    const success = await trackView();
    if (!success) {
      console.error('[SearchPage] ⛔ Dislike BLOCKED: trackView returned false (limit reached)');
      if (Platform.OS === 'web') {
        showAlert('info', 'Daily limit reached. Tap Upgrade for unlimited views and 20 AI Itineraries per day');
      } else {
        showAlert(
          'info', 
          'Daily limit reached. Sign in on the web and tap the UPGRADE button on TravalMatch for unlimited views and 20 AI Itineraries per day.',
          'https://travalpass.com/login',
          'Sign In to Upgrade'
        );
      }
      return;
    }

    console.log('[SearchPage] ✅ trackView succeeded - processing dislike');

    try {
      // Save as viewed
      saveViewedItinerary(itinerary.id);
      
      // Advance to next itinerary
      getNextItinerary();
      
    } catch (error) {
      console.error('[SearchPage] Error handling dislike:', error);
      showAlert('error', 'Failed to process dislike. Please try again.');
    }
  };

  // Handle mock itinerary navigation (only for onboarding)
  const handleMockLike = () => {
    nextMockItinerary();
  };

  const handleMockDislike = () => {
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
        {/* Stripe Checkout Status Message (Web only) */}
        {Platform.OS === 'web' && checkoutStatus === 'success' && (
          <View style={styles.checkoutSuccess}>
            <Text style={styles.checkoutSuccessText}>
              Payment successful! Your subscription is now active.
            </Text>
          </View>
        )}
        {Platform.OS === 'web' && checkoutStatus === 'cancel' && (
          <View style={styles.checkoutCancel}>
            <Text style={styles.checkoutCancelText}>
              Payment canceled. No changes were made to your subscription.
            </Text>
          </View>
        )}

        {/* Subscription Card - Web only, compact floating style */}
        <SubscriptionCard compact />

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
          <Text style={styles.usageText}>Views today: {dailyViewCount}/10</Text>
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

                {/* Action Buttons for Mock Itineraries */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    testID="dislike-button"
                    style={styles.dislikeButton} 
                    onPress={handleMockDislike}
                  >
                    <Text style={styles.buttonText}>✕</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    testID="like-button"
                    style={styles.likeButton} 
                    onPress={handleMockLike}
                  >
                    <Text style={styles.buttonText}>✈️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : selectedItineraryId ? (
              /* User has selected an itinerary - show matching results */
              <>
                {searchLoading ? (
                  <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#ebf2f3ff" />
                    <Text style={[styles.loadingText, { color: '#fff' }]}>Searching for matches...</Text>
                  </View>
                ) : matchingItineraries.length > 0 ? (
                  /* Show ItineraryCard for current match */
                  <ScrollView 
                    style={styles.cardScrollContainer}
                    contentContainerStyle={styles.cardScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <ItineraryCard
                      itinerary={matchingItineraries[0] as any}
                      onLike={handleLike}
                      onDislike={handleDislike}
                      showEditDelete={false}
                    />
                  </ScrollView>
                ) : (
                  /* No matches found */
                  <View style={styles.centerContent}>
                    <Text style={styles.emptyText}>
                      {searchError ? (
                        <Text style={{ color: '#fff' }}>Error: {searchError}</Text>
                      ) : (
                        <Text style={{ color: '#fff' }}>
                          No matches found for this itinerary. Try adjusting your preferences or dates.
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              /* User has itineraries but hasn't selected one yet */
              <View style={styles.centerContent}>
                <Text style={styles.emptyText}>
                  Select an itinerary above to find travel companions
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

      <AddItineraryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onItineraryAdded={handleItineraryAdded}
        itineraries={itineraries}
        userProfile={userProfile}
      />

      {/* Feedback Button - vertical along right side */}
      <FeedbackButton />

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
  // Stripe checkout status messages (Web only)
  checkoutSuccess: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#e0ffe0',
    padding: 12,
    borderRadius: 8,
    zIndex: 2000,
    alignItems: 'center',
  },
  checkoutSuccessText: {
    color: '#1b5e20',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  checkoutCancel: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    zIndex: 2000,
    alignItems: 'center',
  },
  checkoutCancelText: {
    color: '#bf360c',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
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
  cardScrollContainer: {
    flex: 1,
  },
  cardScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
});

export default SearchPage;