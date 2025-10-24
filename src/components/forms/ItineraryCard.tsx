/**
 * ItineraryCard Component - Exact replica of PWA ItineraryCard.tsx
 * Mimics Material-UI Card design with React Native components
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface UserInfo {
  uid: string;
  email?: string;
  username?: string;
}

interface Itinerary {
  id: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  activities?: string[];
  userInfo?: UserInfo;
  ai_status?: string;
  aiGenerated?: boolean;
  response?: any;
}

interface ItineraryCardProps {
  itinerary: Itinerary;
  onLike: (itinerary: Itinerary) => void;
  onDislike: (itinerary: Itinerary) => void;
  onEdit?: (itinerary: Itinerary) => void;
  onDelete?: (itinerary: Itinerary) => void;
  showEditDelete?: boolean;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({
  itinerary,
  onLike,
  onDislike,
  showEditDelete = false,
}) => {
  const [viewProfileOpen, setViewProfileOpen] = useState(false);

  // Fix timezone issue by creating date at noon UTC (same as PWA)
  const startDate = itinerary.startDate
    ? new Date(itinerary.startDate + "T12:00:00.000Z").toLocaleDateString()
    : "N/A";
  const endDate = itinerary.endDate
    ? new Date(itinerary.endDate + "T12:00:00.000Z").toLocaleDateString()
    : "N/A";

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
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(itinerary.userInfo?.username || "A").charAt(0).toUpperCase()}
              </Text>
            </View>
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
        <TouchableOpacity 
          style={styles.dislikeButton}
          onPress={() => onDislike(itinerary)}
        >
          <Text style={styles.dislikeIcon}>✕</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.likeButton}
          onPress={() => onLike(itinerary)}
        >
          <Text style={styles.likeIcon}>♡</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Card container - Matching PWA Card sx props
  card: {
    marginHorizontal: 8,
    marginVertical: 16,
    maxWidth: screenWidth < 600 ? 300 : 400,
    maxHeight: screenWidth < 600 ? '50%' : '60%',
    backgroundColor: '#f5f5f5', // Matching PWA backgroundColor
    borderRadius: 8, // Matching PWA borderRadius: 2 (8px in Material-UI)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16, // Matching PWA boxShadow: 3
    shadowRadius: 6,
    elevation: 6,
    padding: screenWidth < 600 ? 4 : 12, // Matching PWA padding xs/sm
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  
  // Card content - Matching PWA CardContent sx
  cardContent: {
    paddingBottom: screenWidth < 600 ? 4 : 8,
    paddingTop: screenWidth < 600 ? 8 : 12,
    paddingHorizontal: screenWidth < 600 ? 8 : 16,
    flex: 1,
  },

  // Profile section - Matching PWA profile layout
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: screenWidth < 600 ? 8 : 16,
  },

  avatarButton: {
    padding: 0,
    marginRight: screenWidth < 600 ? 8 : 16,
  },

  // Avatar - Matching PWA Avatar sx
  avatar: {
    width: screenWidth < 600 ? 40 : 56,
    height: screenWidth < 600 ? 40 : 56,
    borderRadius: screenWidth < 600 ? 20 : 28,
    backgroundColor: '#1976d2', // Material-UI primary color
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#fff',
    fontSize: screenWidth < 600 ? 18 : 24,
    fontWeight: 'bold',
  },

  // Username - Matching PWA Typography variant="h6"
  username: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: screenWidth < 600 ? 17.6 : 20, // h6 fontSize in Material-UI
  },

  // Destination - Matching PWA Typography variant="h5"
  destination: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
    fontSize: screenWidth < 600 ? 19.2 : 24, // h5 fontSize in Material-UI
    marginBottom: 8,
  },

  // Date text - Matching PWA body1 typography
  dateText: {
    textAlign: 'center',
    color: 'rgba(0, 0, 0, 0.6)', // Material-UI textSecondary
    marginBottom: screenWidth < 600 ? 6 : 10,
    fontSize: screenWidth < 600 ? 15.2 : 16, // body1 fontSize
  },

  // Scrollable content - Matching PWA maxHeight and overflow
  scrollContent: {
    maxHeight: screenWidth < 600 ? '15%' : '20%', // Matching PWA 15vh/20vh
    marginTop: 8,
    paddingRight: 8, // padding for scrollbar
  },

  // Description - Matching PWA description typography
  description: {
    fontStyle: 'italic',
    fontSize: screenWidth < 600 ? 15.2 : 16,
    marginBottom: 16,
    textAlign: 'left',
    lineHeight: 22,
  },

  // Activities section
  activitiesSection: {
    alignItems: 'flex-start',
  },

  activitiesTitle: {
    fontWeight: 'bold',
    marginBottom: screenWidth < 600 ? 6 : 10,
    fontSize: screenWidth < 600 ? 15.2 : 16,
    color: '#333',
  },

  activitiesList: {
    paddingLeft: 8,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },

  activityBullet: {
    marginRight: 8,
    marginTop: 2,
    color: '#666',
    fontSize: 16,
  },

  activityText: {
    flex: 1,
    fontSize: screenWidth < 600 ? 13.6 : 14.4, // body2 fontSize
    color: '#333',
    lineHeight: 20,
  },

  moreActivities: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 13,
    marginTop: 8,
  },

  // Card actions - Matching PWA CardActions layout
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.12)', // Material-UI divider color
  },

  dislikeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f44336', // Material-UI error color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  likeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4caf50', // Material-UI success color
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  dislikeIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },

  likeIcon: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default ItineraryCard;