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
  Platform,
} from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import * as firebaseCfg from '../../config/firebaseConfig';
import { Itinerary } from '../../types/Itinerary';
import { ViewProfileModal } from '../modals/ViewProfileModal';
import { getAuthInstance } from '../../config/firebaseConfig';

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
  // Resolve auth lazily - prefer getAuthInstance() but fall back to legacy auth
  const _tentativeAuth: any = typeof (firebaseCfg as any).getAuthInstance === 'function'
    ? (firebaseCfg as any).getAuthInstance()
    : (firebaseCfg as any).auth;
  const _effectiveAuth: any = _tentativeAuth && _tentativeAuth.currentUser ? _tentativeAuth : (firebaseCfg as any).auth;
  const currentUserId = _effectiveAuth?.currentUser?.uid;

  // Load profile photo from Firestore user document (matching PWA useGetUserProfilePhoto)
  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (!itinerary.userInfo?.uid) {
        
        setUseLocalAvatar(true);
        return;
      }
      
      try {
        const db = getFirestore();
        const userRef = doc(db, 'users', itinerary.userInfo.uid);
        
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const photoUrl = userData?.photos?.profile;
          
          if (photoUrl) {
            
            setProfilePhoto(photoUrl);
            setUseLocalAvatar(false);
          } else {
            
            setUseLocalAvatar(true);
          }
        } else {
          
          setUseLocalAvatar(true);
        }
      } catch (error) {
        
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
        {/* Profile photo and username - Top and center of card */}
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
                
                setUseLocalAvatar(true);
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Username below profile photo */}
        <Text style={styles.username}>
          {itinerary.userInfo?.username || "Anonymous"}
        </Text>

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
  // Card container - Consistent size across platforms
  card: {
    marginHorizontal: 16,
    marginVertical: 20,
    width: screenWidth * 0.9, // Consistent width on both platforms
    minHeight: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    // Platform-specific shadows
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
    alignSelf: 'center',
    overflow: 'hidden',
  },
  
  // Card content - Consistent padding with profile at top with profile at top
  cardContent: {
    paddingBottom: 16,
    paddingTop: 24,
    paddingHorizontal: 20,
    flex: 1,
  },

  // Profile section - Top and center of card with proper spacing
  profileSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  avatarButton: {
    padding: 0,
  },

  // Avatar - Larger and more prominent
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#e0e0e0',
    backgroundColor: '#f0f0f0',
  },

  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Username - Bold and readable, centered below avatar
  username: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 12,
    marginTop: 4,
  },

  // Destination - Prominent headline
  destination: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#000',
    fontSize: 26,
    marginBottom: 16,
    letterSpacing: 0.5,
  },

  // Date text - Clear and readable
  dateText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
    fontSize: 16,
  },

  // Scrollable content - Adequate space
  scrollContent: {
    maxHeight: 280,
    marginTop: 16,
    paddingRight: 8,
  },

  // Description - Readable and styled
  description: {
    fontStyle: 'italic',
    fontSize: 16,
    marginBottom: 20,
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
    marginBottom: 12,
    fontSize: 18,
    color: '#000',
  },

  activitiesList: {
    paddingLeft: 8,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  activityBullet: {
    marginRight: 10,
    marginTop: 2,
    color: '#666',
    fontSize: 18,
  },

  activityText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },

  moreActivities: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 14,
    marginTop: 10,
  },

  // Card actions - Large circular buttons like iOS screenshot
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingHorizontal: 60,
    marginTop: 20,
  },

  editButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  deleteButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Dislike button - Consistent across platforms
  dislikeButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // Like button - Consistent across platforms
  likeButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  editIcon: {
    fontSize: 32,
    color: '#fff',
  },

  deleteIcon: {
    fontSize: 32,
    color: '#fff',
  },

  // Icons - Larger and more visible
  dislikeIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },

  likeIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ItineraryCard;