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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { auth } from '../../firebase-config';
import { Itinerary } from '../types/Itinerary';
import ItineraryCard from '../components/forms/ItineraryCard';
import useSearchItineraries from '../hooks/useSearchItineraries';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useUpdateItinerary } from '../hooks/useUpdateItinerary';
import { useNewConnection } from '../context/NewConnectionContext';
import { itineraryRepository } from '../repositories/ItineraryRepository';
import { connectionRepository } from '../repositories/ConnectionRepository';
import { saveViewedItinerary, hasViewedItinerary } from '../utils/viewedStorage';
import { filterValidItineraries } from '../utils/itineraryValidator';

const SearchPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [userItineraries, setUserItineraries] = useState<Itinerary[]>([]);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>('');
  const [loadingItineraries, setLoadingItineraries] = useState(true);
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);

  // Hooks
  const {
    matchingItineraries,
    searchItineraries,
    getNextItinerary,
    loading: searchLoading,
    hasMore,
  } = useSearchItineraries();
  
  const { hasReachedLimit, trackView, hasPremium, dailyViewCount } = useUsageTracking();
  const { updateItinerary } = useUpdateItinerary();
  const { setHasNewConnection, setConnectionId, setMatchedUserId } = useNewConnection();

  // Calculate remaining views
  const FREE_DAILY_LIMIT = 10;
  const getRemainingViews = () => {
    if (hasPremium()) return 999; // Show large number for premium
    return Math.max(0, FREE_DAILY_LIMIT - (dailyViewCount || 0));
  };

  // Current itinerary being displayed
  const currentItinerary = matchingItineraries.length > 0 ? matchingItineraries[0] : null;

  // Get auth user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user?.uid || null);
    });
    return unsubscribe;
  }, []);

  // Load user's itineraries
  useEffect(() => {
    if (!userId) return;

    const loadUserItineraries = async () => {
      setLoadingItineraries(true);
      try {
        const itins = await itineraryRepository.listUserItineraries(userId);
        const validItins = filterValidItineraries(itins, true);
        setUserItineraries(validItins);
        
        // Auto-select first itinerary
        if (validItins.length > 0 && !selectedItineraryId) {
          setSelectedItineraryId(validItins[0].id);
        }
      } catch (error) {
        console.error('Error loading itineraries:', error);
        Alert.alert('Error', 'Failed to load your itineraries');
      } finally {
        setLoadingItineraries(false);
      }
    };

    loadUserItineraries();
  }, [userId]);

  // Search for matches when itinerary selected
  useEffect(() => {
    if (!selectedItineraryId || !userId) return;

    const currentUserItinerary = userItineraries.find(
      (it) => it.id === selectedItineraryId
    );
    
    if (!currentUserItinerary) return;

    const performSearch = async () => {
      try {
        await searchItineraries(currentUserItinerary, userId);
      } catch (error) {
        console.error('Error searching itineraries:', error);
        Alert.alert('Error', 'Failed to find matches');
      }
    };

    performSearch();
  }, [selectedItineraryId, userId, userItineraries]);

  const handleLike = async (itinerary: Itinerary) => {
    if (!userId || !selectedItineraryId) return;

    try {
      // Check usage limit
      if (hasReachedLimit()) {
        const remaining = getRemainingViews();
        Alert.alert(
          'Daily Limit Reached',
          `You've used your free daily views (${remaining} remaining). Upgrade to Premium for unlimited matching!`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Track view
      await trackView();

      // Save as viewed
      await saveViewedItinerary(itinerary.id);

      // Update likes array
      const updatedLikes = [...(itinerary.likes || []), userId];
      await updateItinerary(itinerary.id, { likes: updatedLikes });

      // Check for mutual match
      const userItinerary = userItineraries.find((it) => it.id === selectedItineraryId);
      if (userItinerary?.likes?.includes(itinerary.userInfo?.uid || '')) {
        // It's a match!
        await handleMutualMatch(itinerary);
      } else {
        // Not a match yet, move to next
        getNextItinerary();
      }
    } catch (error) {
      console.error('Error liking itinerary:', error);
      Alert.alert('Error', 'Failed to like itinerary');
    }
  };

  const handleDislike = async (itinerary: Itinerary) => {
    try {
      // Check usage limit
      if (hasReachedLimit()) {
        const remaining = getRemainingViews();
        Alert.alert(
          'Daily Limit Reached',
          `You've used your free daily views (${remaining} remaining). Upgrade to Premium for unlimited matching!`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Track view
      await trackView();

      // Save as viewed
      await saveViewedItinerary(itinerary.id);

      // Move to next
      getNextItinerary();
    } catch (error) {
      console.error('Error disliking itinerary:', error);
      Alert.alert('Error', 'Failed to process action');
    }
  };

  const handleMutualMatch = async (itinerary: Itinerary) => {
    if (!userId || !selectedItineraryId) return;

    try {
      const otherUserId = itinerary.userInfo?.uid;
      if (!otherUserId) {
        throw new Error('Other user ID not found');
      }

      const userItinerary = userItineraries.find((it) => it.id === selectedItineraryId);
      if (!userItinerary) {
        throw new Error('User itinerary not found');
      }

      // Create connection
      const result = await connectionRepository.createConnection({
        user1Id: userId,
        user2Id: otherUserId,
        itinerary1Id: selectedItineraryId,
        itinerary2Id: itinerary.id,
        itinerary1: userItinerary,
        itinerary2: itinerary,
      });

      // Update context
      setHasNewConnection(true);
      setConnectionId(result.id);
      setMatchedUserId(otherUserId);

      // Show match modal
      setMatchedUser({
        username: itinerary.userInfo?.username || 'Traveler',
        destination: itinerary.destination,
      });
      setMatchModalVisible(true);

      // Move to next itinerary after a delay
      setTimeout(() => {
        getNextItinerary();
      }, 1500);
    } catch (error) {
      console.error('Error creating connection:', error);
      Alert.alert('Error', 'Failed to create match');
    }
  };

  const handleItineraryChange = (itemValue: string) => {
    setSelectedItineraryId(itemValue);
  };

  const renderContent = () => {
    if (loadingItineraries) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Loading your itineraries...</Text>
        </View>
      );
    }

    if (userItineraries.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>No Itineraries Yet</Text>
          <Text style={styles.emptyText}>
            Create an itinerary to start matching with other travelers!
          </Text>
          <TouchableOpacity style={styles.createButton}>
            <Text style={styles.createButtonText}>Create Itinerary</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!selectedItineraryId) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            Select an itinerary above to find matches
          </Text>
        </View>
      );
    }

    if (searchLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Finding matches...</Text>
        </View>
      );
    }

    if (!currentItinerary) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyTitle}>🎉 You've Seen Everyone!</Text>
          <Text style={styles.emptyText}>
            {hasMore
              ? 'Check back later for new travelers'
              : 'No more matches available at this time'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.cardContainer}>
        <ItineraryCard
          itinerary={currentItinerary as any}
          onLike={handleLike}
          onDislike={handleDislike}
          showEditDelete={false}
        />
        
        {/* Remaining views indicator */}
        {!hasPremium() && (
          <View style={styles.viewsIndicator}>
            <Text style={styles.viewsText}>
              {getRemainingViews()} views remaining today
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Travelers</Text>
      </View>

      {/* Itinerary Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorLabel}>Your Itinerary:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedItineraryId}
            onValueChange={handleItineraryChange}
            style={styles.picker}
            enabled={!loadingItineraries && userItineraries.length > 0}
          >
            {userItineraries.length === 0 ? (
              <Picker.Item label="No itineraries" value="" />
            ) : (
              userItineraries.map((itin) => (
                <Picker.Item
                  key={itin.id}
                  label={`${itin.destination} - ${new Date(itin.startDate || '').toLocaleDateString()}`}
                  value={itin.id}
                />
              ))
            )}
          </Picker>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {renderContent()}
      </ScrollView>

      {/* Match Modal */}
      <Modal
        visible={matchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMatchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎉 It's a Match!</Text>
            <Text style={styles.modalText}>
              You and {matchedUser?.username} are both going to{' '}
              {matchedUser?.destination}!
            </Text>
            <Text style={styles.modalSubtext}>
              Start chatting in the Chats tab
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setMatchModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Awesome!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976d2',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectorContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  createButton: {
    marginTop: 24,
    backgroundColor: '#1976d2',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 16,
  },
  viewsIndicator: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  viewsText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 320,
    width: '90%',
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchPage;
