import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ImageBackground, FlatList, TouchableOpacity, ActivityIndicator, Platform, StatusBar, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserProfileContext } from '../context/UserProfileContext';
import { useConnections } from '../hooks/chat/useConnections';
import { Connection } from '../types/Connection';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const ChatPage: React.FC = () => {
  const { userProfile } = useContext(UserProfileContext);
  const navigation = useNavigation();
  const { connections, loading, error, refresh } = useConnections(userProfile?.uid || null);
  
  // Store user profile photos
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});

  console.log('[ChatPage] Rendering with:', {
    userId: userProfile?.uid,
    connectionsCount: connections.length,
    loading,
    error: error?.message,
  });

  // Fetch profile photos for all users in connections
  useEffect(() => {
    const fetchUserPhotos = async () => {
      if (!connections || connections.length === 0) return;

      const photoMap: Record<string, string> = {};
      const userIds = new Set<string>();

      // Collect all unique user IDs
      connections.forEach(conn => {
        conn.itineraries?.forEach(itin => {
          if (itin.userInfo?.uid && itin.userInfo.uid !== userProfile?.uid) {
            userIds.add(itin.userInfo.uid);
          }
        });
      });

      // Fetch profile photos for each user
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const profilePhoto = userData?.photos?.profile;
              if (profilePhoto) {
                photoMap[uid] = profilePhoto;
              }
            }
          } catch (error) {
            console.error('[ChatPage] Error fetching photo for user:', uid, error);
          }
        })
      );

      setUserPhotos(photoMap);
    };

    fetchUserPhotos();
  }, [connections, userProfile?.uid]);

  const renderConnectionItem = ({ item }: { item: Connection }) => {
    // Get other user(s) info from itineraries
    const otherUserInfos = item.itineraries
      ?.filter(itin => itin.userInfo && itin.userInfo.uid !== userProfile?.uid)
      .map(itin => itin.userInfo);
    
    const otherUserNames = otherUserInfos
      ?.map(info => info?.username || info?.email || 'Unknown')
      .join(', ') || 'Unknown User';
    
    // Get the first other user's ID for photo lookup
    const otherUserId = otherUserInfos?.[0]?.uid;
    const otherUserPhoto = otherUserId ? userPhotos[otherUserId] : null;
    const otherUserInitial = otherUserNames.charAt(0).toUpperCase();
    
    // Get itinerary info if available
    const itinerary = item.itineraries?.[0];
    const destination = itinerary?.destination || 'Unknown';
    // Format dates without time
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const dates = itinerary ? `${formatDate(itinerary.startDate)} - ${formatDate(itinerary.endDate)}` : '';
    
    // Get unread count
    const unreadCount = item.unreadCounts?.[userProfile?.uid || ''] || 0;
    
    return (
      <TouchableOpacity
        style={styles.connectionItem}
        onPress={() => {
          console.log('[ChatPage] Opening chat:', item.id);
          (navigation.navigate as any)('ChatThread', {
            connectionId: item.id,
            otherUserName: otherUserNames,
          });
        }}
      >
        {/* Avatar with actual profile photo or placeholder */}
        {otherUserPhoto ? (
          <Image
            source={{ uri: otherUserPhoto }}
            style={styles.connectionAvatar}
          />
        ) : (
          <View style={styles.connectionAvatar}>
            <Text style={styles.avatarText}>{otherUserInitial}</Text>
          </View>
        )}
        
        <View style={styles.connectionContent}>
          <View style={styles.connectionHeader}>
            <Text style={styles.connectionTitle} numberOfLines={1}>
              {otherUserNames}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.itinerarySummary} numberOfLines={1}>
            {destination}
          </Text>
          
          <Text style={styles.dateText} numberOfLines={1}>
            {dates}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground 
      source={require('../../assets/images/login-image.jpeg')}
      style={styles.container}
      resizeMode="cover"
      imageStyle={styles.backgroundImage}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Traval Buddies</Text>
        </View>
        
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading connections...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <Text style={styles.errorText}>Error loading connections</Text>
              <Text style={styles.errorDetail}>{error.message}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refresh}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : connections.length === 0 ? (
            <View style={styles.centerContent}>
              <View style={styles.emptyStateCard}>
                <View style={styles.planeContainer}>
                  <Text style={styles.planeEmoji}>✈️</Text>
                  <Text style={styles.planeEmoji}>✈️</Text>
                </View>
                
                <Text style={styles.emptyStateTitle}>No Connections Yet</Text>
                
                <Text style={styles.emptyStateText}>
                  This is your chat page. When you match with other travelers, you'll see them here and can start planning your trip together!
                </Text>
                
                <Text style={styles.emptyStateText}>
                  💡 <Text style={styles.boldText}>Tip:</Text> To match with travelers, go to the TravelMatch tab, select one of your itineraries, and start swiping!
                </Text>
                
                <Text style={styles.emptyStateText}>
                  🛡️ <Text style={styles.boldText}>Stay Safe:</Text> Always meet in public places and trust your instincts. You can rate your travel buddies by tapping their profile picture in chat to help others know who's trustworthy.
                </Text>
              </View>
            </View>
          ) : (
            <FlatList
              data={connections}
              keyExtractor={(item) => item.id}
              renderItem={renderConnectionItem}
              contentContainerStyle={styles.listContent}
              onRefresh={refresh}
              refreshing={loading}
            />
          )}
        </View>
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
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyStateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 400,
  },
  planeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  planeEmoji: {
    fontSize: 64,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  boldText: {
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  descriptionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetail: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  connectionItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  connectionAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1976d2',
  },
  connectionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itinerarySummary: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default ChatPage;