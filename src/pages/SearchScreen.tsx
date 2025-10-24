/**
 * Search Screen - Replicates voyager-pwa Search page
 * Main itinerary search and matching functionality with swipe gestures
 * 
 * Features:
 * - Swipe-based itinerary m   // No need for duplicate functions - using hookserary from search results
  const currentItinerary = matchingItineraries.length > 0 ? matchingItineraries[0] : null;ike, right = like)
 * - Usage tracking integration 
 * - Mutual like detection and connection creation
 * - Real-time itinerary fetching
 * - Freemium model with daily limits
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  Dimensions, 
  TouchableOpacity,
  Animated,
  Alert
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { auth, db } from '../config/firebaseConfig';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  doc, 
  updateDoc, 
  arrayUnion, 
  addDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { useAlert } from '../context/AlertContext';
import ItineraryCard from '../components/forms/ItineraryCard';
import { useUsageTracking } from '../hooks/useUsageTracking';
import useSearchItineraries from '../hooks/useSearchItineraries';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;

// Mock itinerary type (matching PWA structure)
interface Itinerary {
  id: string;
  title: string;
  destination: string;
  duration: string;
  description: string;
  userInfo: {
    uid: string;
    email: string;
    username: string;
  };
  likes?: string[];
  tags?: string[];
}

const SearchScreen: React.FC = () => {
  const { showAlert } = useAlert();
  const [currentItinerary, setCurrentItinerary] = useState<Itinerary | null>(null);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>('');
  const [userItineraries, setUserItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Animation values
  const translateX = new Animated.Value(0);
  const rotate = new Animated.Value(0);
  const opacity = new Animated.Value(1);

  // Hooks (same as PWA)
  const { hasReachedLimit, trackView, hasPremium, dailyViewCount } = useUsageTracking();
  const {
    matchingItineraries,
    searchItineraries,
    getNextItinerary,
    loading: searchLoading,
    hasMore
  } = useSearchItineraries();

  const userId = auth.currentUser?.uid;

  // Fetch user's itineraries (same logic as PWA)
  const fetchUserItineraries = useCallback(async () => {
    if (!userId) return;

    try {
      const q = query(
        collection(db, 'itineraries'),
        where('userInfo.uid', '==', userId),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const itineraries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Itinerary[];

      setUserItineraries(itineraries);
      if (itineraries.length > 0) {
        setSelectedItineraryId(itineraries[0].id);
        // Automatically start searching for matches
        searchItineraries(itineraries[0], userId);
      }
    } catch (error) {
      console.error('Error fetching user itineraries:', error);
    }
  }, [userId, searchItineraries]);

  // Fetch next itinerary to show (excluding own and already viewed)
  const fetchNextItinerary = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Simple query for demo - in production would exclude viewed itineraries
      const q = query(
        collection(db, 'itineraries'),
        where('userInfo.uid', '!=', userId),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const itinerary = {
          id: doc.id,
          ...doc.data()
        } as Itinerary;
        setCurrentItinerary(itinerary);
      } else {
        // Create mock itinerary for demo
        setCurrentItinerary({
          id: 'demo-1',
          title: 'Amazing Tokyo Adventure',
          destination: 'Tokyo, Japan',
          duration: '7 days',
          description: 'Explore the vibrant culture, delicious food, and modern attractions of Tokyo. Visit temples, experience nightlife, and discover hidden gems.',
          userInfo: {
            uid: 'demo-user',
            email: 'traveler@example.com',
            username: 'TokyoExplorer'
          },
          tags: ['Culture', 'Food', 'Urban']
        });
      }
    } catch (error) {
      console.error('Error fetching itineraries:', error);
      showAlert('error', 'Failed to load itineraries');
    }
  }, [userId, showAlert]);

  // Check daily usage limit (replicating PWA logic)
  const checkUsageLimit = useCallback(() => {
    if (hasPremium) return false;
    return dailyViewCount >= 10;
  }, [dailyViewCount, hasPremium]);

  // Note: trackView is provided by useUsageTracking hook; use that implementation

  // Handle dislike (swipe left) - Same logic as PWA
  const handleDislike = useCallback(async () => {
    if (!currentItinerary) return;

    // Check usage limits (same as PWA)
    if (hasReachedLimit()) {
      showAlert('error', 'Daily limit reached! You\'ve viewed 10 itineraries today. Upgrade to Premium for unlimited views.');
      return;
    }

    const success = await trackView();
    if (!success) {
      showAlert('error', 'Unable to track usage. Please try again.');
      return;
    }
    
    console.log('Disliked itinerary:', currentItinerary.id);
    
    // Reset animations and get next itinerary
    translateX.setValue(0);
    rotate.setValue(0);
    opacity.setValue(1);
    
    getNextItinerary(); // Use the proper hook method
  }, [currentItinerary, hasReachedLimit, trackView, showAlert, getNextItinerary, translateX, rotate, opacity]);

  // Handle like (swipe right) with mutual matching logic - Same as PWA
  const handleLike = useCallback(async () => {
    if (!currentItinerary || !userId || !selectedItineraryId) return;

    // Check usage limits (same as PWA)
    if (hasReachedLimit()) {
      showAlert('error', 'Daily limit reached! You\'ve viewed 10 itineraries today. Upgrade to Premium for unlimited views.');
      return;
    }

    const success = await trackView();
    if (!success) {
      showAlert('error', 'Unable to track usage. Please try again.');
      return;
    }
    
    try {
      // Add current user to liked itinerary's likes array (PWA logic)
      const itineraryRef = doc(db, 'itineraries', currentItinerary.id);
      await updateDoc(itineraryRef, {
        likes: arrayUnion(userId),
      });

      // Check for mutual like
      const myItineraryRef = doc(db, 'itineraries', selectedItineraryId);
      const myItinerarySnap = await getDoc(myItineraryRef);
      const myItinerary = myItinerarySnap.data();

      if (myItinerary) {
        const otherUserUid = currentItinerary.userInfo?.uid;
        const myLikes = myItinerary.likes || [];
        
        // If mutual like, create connection (same logic as PWA)
        if (myLikes.includes(otherUserUid)) {
          await addDoc(collection(db, 'connections'), {
            users: [userId, otherUserUid],
            emails: [auth.currentUser?.email || '', currentItinerary.userInfo?.email || ''],
            unreadCounts: { [userId]: 0, [otherUserUid]: 0 },
            createdAt: serverTimestamp(),
          });
          
          showAlert('success', `It's a match! You both liked each other's itineraries.`);
        } else {
          showAlert('success', 'Liked! Waiting to see if they like you back.');
        }
      }

      console.log('Liked itinerary:', currentItinerary.id);
      
      // Reset animations and get next itinerary
      translateX.setValue(0);
      rotate.setValue(0);
      opacity.setValue(1);
      
      getNextItinerary(); // Use the proper hook method
      
    } catch (error) {
      console.error('Error processing like:', error);
      showAlert('error', 'Failed to process like');
    }
  }, [currentItinerary, userId, selectedItineraryId, hasReachedLimit, trackView, showAlert, getNextItinerary, translateX, rotate, opacity]);

  // Pan gesture handler
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      
      if (translationX > SWIPE_THRESHOLD) {
        // Swipe right - like
        Animated.timing(translateX, {
          toValue: screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start(() => handleLike());
      } else if (translationX < -SWIPE_THRESHOLD) {
        // Swipe left - dislike
        Animated.timing(translateX, {
          toValue: -screenWidth,
          duration: 300,
          useNativeDriver: true,
        }).start(() => handleDislike());
      } else {
        // Snap back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Initialize data
  useEffect(() => {
    if (userId) {
      fetchUserItineraries();
      fetchNextItinerary();
      setIsLoading(false);
    }
  }, [userId, fetchUserItineraries, fetchNextItinerary]);

  // Update rotation based on translation
  useEffect(() => {
    const listener = translateX.addListener(({ value }) => {
      const rotationValue = (value / screenWidth) * 30; // Max 30 degrees
      rotate.setValue(rotationValue);
    });
    
    return () => translateX.removeListener(listener);
  }, [translateX, rotate]);

  // Loading states (same logic as PWA)
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading itineraries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle search loading state
  if (searchLoading && !currentItinerary && userItineraries.length > 0 && selectedItineraryId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Searching for matches...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No user itineraries - need to create one
  if (userItineraries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarContent}>
            <Text style={styles.toolbarTitle}>Find Matches</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add Itinerary</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Create your first itinerary</Text>
          <Text style={styles.submessageText}>
            Add an itinerary to start finding travel matches!
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // No matches found
  if (!currentItinerary && !searchLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarContent}>
            <Text style={styles.toolbarTitle}>Find Matches</Text>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Add Itinerary</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {hasMore ? 'Loading more matches...' : 'No more itineraries to view.'}
          </Text>
          {!hasMore && (
            <Text style={styles.submessageText}>
              Create more itineraries or try different dates to find new matches!
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="homeScreen" style={styles.container}>
      {/* Top Toolbar - Replicating PWA ItinerarySelector toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.toolbarContent}>
          <Text style={styles.toolbarTitle}>Find Matches</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Add Itinerary</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.usageIndicator}>
          <Text style={styles.usageText}>
            Views today: {dailyViewCount}/10 {hasPremium && '(Premium)'}
          </Text>
        </View>
      </View>

      {/* Main Content Area - Replicating PWA MatchDisplay */}
      <View style={styles.matchDisplay}>
        {currentItinerary && (
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View
              style={[
                styles.cardWrapper,
                {
                  transform: [
                    { translateX },
                    { rotate: rotate.interpolate({
                      inputRange: [-30, 30],
                      outputRange: ['-30deg', '30deg'],
                      extrapolate: 'clamp'
                    })}
                  ],
                  opacity
                }
              ]}
            >
              <ItineraryCard
                itinerary={currentItinerary}
                onLike={handleLike}
                onDislike={handleDislike}
              />
            </Animated.View>
          </PanGestureHandler>
        )}
      </View>

      {/* Instructions - PWA style */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Swipe or tap buttons to like/pass</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa', // Material-UI background.default
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#1976d2', // Material-UI primary.main
    padding: 12,
    borderRadius: 4, // Material-UI default border radius
    elevation: 2,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Toolbar - Replicating PWA toolbarSx
  toolbar: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 40, // Matching PWA mt: 10
    flexShrink: 0,
  },
  toolbarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    elevation: 1,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  usageIndicator: {
    marginTop: 8,
    alignItems: 'center',
  },
  usageText: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.6)', // Material-UI text.secondary
  },
  
  // Match Display - Replicating PWA MatchDisplay
  matchDisplay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cardWrapper: {
    // The ItineraryCard handles its own styling
  },
  
  // Instructions
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
  submessageText: {
    fontSize: 14,
    color: 'rgba(0, 0, 0, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});

export default SearchScreen;