/**
 * Search Screen - Working React Native implementation
 * Simplified but functional version to get the app working
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { auth } from '../config/firebaseConfig';
import { useAlert } from '../context/AlertContext';

const SearchScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [dailyViews, setDailyViews] = useState(0);
  const [currentItinerary, setCurrentItinerary] = useState(0);
  const { showAlert } = useAlert();

  const mockItineraries = [
    {
      title: 'Amazing Tokyo Adventure',
      destination: 'Tokyo, Japan',
      duration: '7 days',
      description: 'Explore the vibrant culture, delicious food, and modern attractions of Tokyo.',
      creator: 'TokyoExplorer'
    },
    {
      title: 'Paris Romance',
      destination: 'Paris, France',
      duration: '5 days',
      description: 'Experience the city of love with visits to iconic landmarks and cozy cafes.',
      creator: 'ParisianDreamer'
    },
    {
      title: 'NYC Urban Explorer',
      destination: 'New York, USA',
      duration: '4 days',
      description: 'Dive into the hustle and bustle of the Big Apple with museums, shows, and great food.',
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
    showAlert(`Liked "${mockItineraries[currentItinerary].title}"!`, 'success');
    nextItinerary();
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
    showAlert(`Passed on "${mockItineraries[currentItinerary].title}"`, 'info');
    nextItinerary();
  };

  const nextItinerary = () => {
    setCurrentItinerary(prev => (prev + 1) % mockItineraries.length);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView testID="homeScreen" style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Matches</Text>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Itinerary</Text>
        </TouchableOpacity>
      </View>

      {/* Usage Counter */}
      <View style={styles.usageContainer}>
        <Text style={styles.usageText}>Views today: {dailyViews}/10</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {userId ? (
          <View style={styles.cardContainer}>
            <View style={styles.itineraryCard}>
              <Text style={styles.cardTitle}>{mockItineraries[currentItinerary].title}</Text>
              <Text style={styles.cardDestination}>{mockItineraries[currentItinerary].destination}</Text>
              <Text style={styles.cardDuration}>{mockItineraries[currentItinerary].duration}</Text>
              <Text style={styles.cardDescription}>
                {mockItineraries[currentItinerary].description}
              </Text>
              <View style={styles.userInfo}>
                <Text style={styles.userText}>Created by: {mockItineraries[currentItinerary].creator}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.dislikeButton} onPress={handleDislike}>
                <Text style={styles.buttonText}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
                <Text style={styles.buttonText}>♡</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>Please log in to see itineraries</Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>Tap buttons to like or pass</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.12)',
    marginTop: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
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

export default SearchScreen;