/**
 * ItineraryCard Component - Exact replica of PWA ItineraryCard.tsx
 * Mimics Material-UI Card design with React Native components
 * 
 * @module components/forms/ItineraryCard
 * @description Displays an itinerary card with user profile, destination, dates,
 * description, activities, and like/dislike action buttons. Matches PWA functionality
 * while using React Native components.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Itinerary } from '../../types/Itinerary';
import { ViewProfileModal } from '../modals/ViewProfileModal';
import { auth } from '../../../firebase-config';

const { width: screenWidth } = Dimensions.get('window');

const DEFAULT_AVATAR = 'https://firebasestorage.googleapis.com/v0/b/mundo1-dev.appspot.com/o/defaults%2FDEFAULT_AVATAR.png?alt=media';
const LOCAL_DEFAULT_AVATAR = require('../../../assets/images/DEFAULT_AVATAR.png');

export interface ItineraryCardProps {
  itinerary: Itinerary;
  onLike: (itinerary: Itinerary) => Promise<void>;
  onDislike: (itinerary: Itinerary) => Promise<void>;
  onEdit?: (itinerary: Itinerary) => void;
  onDelete?: (itinerary: Itinerary) => void;
  showEditDelete?: boolean;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({
  itinerary,
  onLike,
  onDislike,
  onEdit,
  onDelete,
  showEditDelete = false,
}) => {
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [processingReaction, setProcessingReaction] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [useLocalAvatar, setUseLocalAvatar] = useState(false);
  const currentUserId = auth.currentUser?.uid;

  // Load profile photo from Firestore user document (matching PWA useGetUserProfilePhoto)
  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (!itinerary.userInfo?.uid) {
        console.log('[ItineraryCard] No user ID, using local default avatar');
        setUseLocalAvatar(true);
        return;
      }
      
      try {
        const db = getFirestore();
        const userRef = doc(db, 'users', itinerary.userInfo.uid);
        console.log('[ItineraryCard] Fetching user document for:', itinerary.userInfo.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const photoUrl = userData?.photos?.profile;
          
          if (photoUrl) {
            console.log('[ItineraryCard] Profile photo URL found:', photoUrl.substring(0, 50) + '...');
            setProfilePhoto(photoUrl);
            setUseLocalAvatar(false);
          } else {
            console.log('[ItineraryCard] No profile photo in user document, using local avatar');
            setUseLocalAvatar(true);
          }
        } else {
          console.log('[ItineraryCard] User document not found, using local avatar');
          setUseLocalAvatar(true);
        }
      } catch (error) {
        console.log('[ItineraryCard] Error loading profile photo:', error);
        setUseLocalAvatar(true);
      }
    };

    loadProfilePhoto();
  }, [itinerary.userInfo?.uid]);

  // Robust date parsing: accept Date instances, epoch numbers, ISO datetimes, or YYYY-MM-DD
  const parseToDate = (val: any): Date | null => {
    if (!val && val !== 0) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string' && /^\d+$/.test(val)) return new Date(Number(val));
    if (typeof val === 'string') {
      if (val.includes('T')) return new Date(val);
      return new Date(val + 'T12:00:00.000Z');
    }
    return null;
  };

  const _start = parseToDate(itinerary.startDate);
  const _end = parseToDate(itinerary.endDate);
  const startDate = _start ? _start.toLocaleDateString() : 'N/A';
  const endDate = _end ? _end.toLocaleDateString() : 'N/A';

  // Get activities - for AI itineraries, extract from nested structure (same logic as PWA)
  const getActivities = (): string[] => {
    const extendedItinerary = itinerary as any;
    
    // Check if this is an AI-generated itinerary
    if (extendedItinerary.ai_status === 'completed' || extendedItinerary.aiGenerated) {
      const aiData = extendedItinerary.response?.data?.itinerary;
      const dailyData = aiData?.days || aiData?.dailyPlans;
      
      if (dailyData && Array.isArray(dailyData) && dailyData.length > 0) {
        const activities: string[] = [];
        dailyData.forEach((day: any) => {
          if (day.activities && Array.isArray(day.activities)) {
            day.activities.forEach((activity: any) => {
              const activityName = activity.name || activity.title || '';
              if (activityName.trim()) {
                activities.push(activityName);
              }
            });
          }
        });
        return activities;
      }
    }
    
    return itinerary.activities || [];
  };

  const activities = getActivities();

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {/* Profile photo and username - Replicating PWA layout */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarButton}
            onPress={() => setViewProfileOpen(true)}
            disabled={!itinerary.userInfo?.uid}
          >
            <Image
              source={useLocalAvatar || !profilePhoto ? LOCAL_DEFAULT_AVATAR : { uri: profilePhoto }}
              style={styles.avatar}
              onError={() => {
                console.log('[ItineraryCard] Image load error, falling back to local default avatar');
                setUseLocalAvatar(true);
              }}
            />
          </TouchableOpacity>
          <Text style={styles.username}>
            {itinerary.userInfo?.username || "Anonymous"}
          </Text>
        </View>

        {/* Destination Title - Matching PWA Typography variant="h5" */}
        <Text style={styles.destination}>
          {itinerary.destination || "Unknown Destination"}
        </Text>

        {/* Date Information - Matching PWA layout */}
        <Text style={styles.dateText}>Start Date: {startDate}</Text>
        <Text style={styles.dateText}>End Date: {endDate}</Text>

        {/* Scrollable content area - Matching PWA maxHeight and overflow */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={true}>
          {/* Description */}
          <Text style={styles.description}>
            {itinerary.description || "No description provided."}
          </Text>

          {/* Activities List - Matching PWA activities layout */}
          {activities && activities.length > 0 && (
            <View style={styles.activitiesSection}>
              <Text style={styles.activitiesTitle}>Activities:</Text>
              <View style={styles.activitiesList}>
                {activities.slice(0, 10).map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <Text style={styles.activityBullet}>•</Text>
                    <Text style={styles.activityText}>{activity}</Text>
                  </View>
                ))}
                {activities.length > 10 && (
                  <Text style={styles.moreActivities}>
                    ... and {activities.length - 10} more activities
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Action Buttons - Matching PWA CardActions with like/dislike icons */}
      <View style={styles.cardActions}>
        {showEditDelete && currentUserId === itinerary.userInfo?.uid ? (
          <>
            {/* Edit/Delete buttons for own itineraries */}
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => onEdit?.(itinerary)}
            >
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => onDelete?.(itinerary)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Like/Dislike buttons for other itineraries */}
            <TouchableOpacity 
              testID="dislike-button"
              style={styles.dislikeButton}
              onPress={async () => {
                if (processingReaction) return;
                try {
                  setProcessingReaction(true);
                  await onDislike(itinerary);
                } catch (err) {
                  console.error('Error disliking itinerary:', err);
                } finally {
                  setProcessingReaction(false);
                }
              }}
              disabled={processingReaction}
            >
              {processingReaction ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.dislikeIcon}>✕</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              testID="like-button"
              style={styles.likeButton}
              onPress={async () => {
                if (processingReaction) return;
                try {
                  setProcessingReaction(true);
                  await onLike(itinerary);
                } catch (err) {
                  console.error('Error liking itinerary:', err);
                } finally {
                  setProcessingReaction(false);
                }
              }}
              disabled={processingReaction}
            >
              {processingReaction ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.likeIcon}>✈️</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* ViewProfileModal for read-only profile view */}
      {itinerary.userInfo?.uid && (
        <ViewProfileModal
          visible={viewProfileOpen}
          onClose={() => setViewProfileOpen(false)}
          userId={itinerary.userInfo.uid}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Card container - Larger card to show all information
  card: {
    marginHorizontal: 16,
    marginVertical: 20,
    width: screenWidth < 600 ? screenWidth * 0.85 : 450, // Larger card
    minHeight: 400, // Remove maxHeight to allow content to show
    backgroundColor: '#fff', // White background like screenshots
    borderRadius: 16, // More rounded corners
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    padding: screenWidth < 600 ? 16 : 20,
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  
  // Card content - More padding for better layout
  cardContent: {
    paddingBottom: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    flex: 1,
  },

  // Profile section - Matching PWA profile layout
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  avatarButton: {
    padding: 0,
    marginRight: 12,
  },

  // Avatar - Larger for better visibility
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },

  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Username - Larger, bolder
  username: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 20,
  },

  // Destination - Larger headline
  destination: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#000',
    fontSize: 26,
    marginBottom: 12,
  },

  // Date text - More visible
  dateText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 8,
    fontSize: 16,
  },

  // Scrollable content - Larger viewport
  scrollContent: {
    maxHeight: 250, // More space to show content
    marginTop: 12,
    paddingRight: 8,
  },

  // Description - More readable
  description: {
    fontStyle: 'italic',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'left',
    lineHeight: 24,
    color: '#333',
  },

  // Activities section
  activitiesSection: {
    alignItems: 'flex-start',
  },

  activitiesTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 16,
    color: '#000',
  },

  activitiesList: {
    paddingLeft: 8,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },

  activityBullet: {
    marginRight: 8,
    marginTop: 2,
    color: '#666',
    fontSize: 16,
  },

  activityText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },

  moreActivities: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },

  // Card actions - Match screenshot buttons (large circular buttons)
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginTop: 16,
  },

  editButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2196F3', // Material-UI blue
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },

  deleteButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f44336', // Material-UI red
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },

  // Dislike button - Matching SearchPage example itinerary buttons
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

  // Like button - Matching SearchPage example itinerary buttons
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

  editIcon: {
    fontSize: 28,
    color: '#fff',
  },

  deleteIcon: {
    fontSize: 28,
    color: '#fff',
  },

  // Icons matching SearchPage button text
  dislikeIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },

  likeIcon: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ItineraryCard;