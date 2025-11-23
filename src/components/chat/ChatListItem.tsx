/**
 * ChatListItem Component - Exact replica of PWA ChatListItem.tsx
 * Displays connection with avatar, username, destination, and unread badge
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface UserInfo {
  uid: string;
  username?: string;
  email?: string;
  photoURL?: string;
}

interface Itinerary {
  id: string;
  destination?: string;
  userInfo?: UserInfo;
}

interface Connection {
  id: string;
  users: string[];
  itineraryIds?: string[];
  itineraries?: Itinerary[];
  createdAt: any;
  unreadCounts?: Record<string, number>;
  addedUsers?: string[];
}

interface ChatListItemProps {
  conn: Connection;
  userId: string;
  onClick: (photoURL: string) => void;
  unread: boolean;
}

function getOtherUser(connection: Connection, userId: string) {
  if (!Array.isArray(connection.itineraries)) {
    return {
      username: "Unknown",
      photoURL: "",
      uid: "",
    };
  }
  const otherItinerary = connection.itineraries.find(
    (it) => it.userInfo && it.userInfo.uid !== userId
  );
  return (
    otherItinerary?.userInfo || {
      username: "Unknown",
      photoURL: "",
      uid: "",
    }
  );
}

function getOtherItinerary(connection: Connection, userId: string) {
  if (!Array.isArray(connection.itineraries)) return undefined;
  return connection.itineraries.find(
    (it) => it.userInfo && it.userInfo.uid !== userId
  );
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ 
  conn, 
  userId, 
  onClick, 
  unread 
}) => {
  const otherUser = getOtherUser(conn, userId);
  const otherItinerary = getOtherItinerary(conn, userId);

  const handleUnconnect = () => {
    Alert.alert(
      "Remove Connection",
      "Are you sure you want to remove this connection?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: () => {
            // TODO: Implement removeConnection functionality
            
          }
        }
      ]
    );
  };

  return (
    <View style={styles.listItem}>
      <TouchableOpacity 
        style={styles.listItemButton}
        onPress={() => onClick(otherUser.photoURL || "")}
      >
        <View style={styles.listItemAvatar}>
          {/* Unread Badge - Matching PWA Badge component */}
          {unread && <View style={styles.unreadBadge} />}
          
          {/* Avatar - Matching PWA Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(otherUser.username || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>
        
        {/* List Item Text - Matching PWA ListItemText */}
        <View style={styles.listItemText}>
          <Text style={styles.primaryText}>
            {otherUser.username || "Unknown"}
          </Text>
          <View style={styles.secondaryContainer}>
            <Text style={styles.destinationLabel}>Destination:</Text>
            <Text style={styles.destinationText}>
              {otherItinerary?.destination || "Unknown"}
            </Text>
          </View>
        </View>
        
        {/* Remove Button - Matching PWA IconButton */}
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={handleUnconnect}
        >
          <Text style={styles.removeIcon}>⊝</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // List Item - Matching PWA ListItem sx
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34, // Matching PWA boxShadow: 10
    shadowRadius: 8,
    elevation: 10,
  },
  
  // List Item Button - Matching PWA ListItemButton
  listItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 56, // Material-UI ListItem default height
  },
  
  // Avatar Container - Matching PWA ListItemAvatar
  listItemAvatar: {
    marginRight: 16,
    position: 'relative',
  },
  
  // Unread Badge - Matching PWA Badge component
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#f44336', // Material-UI error color
    zIndex: 1,
  },
  
  // Avatar - Matching PWA Avatar component
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976d2', // Material-UI primary color
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // List Item Text Container - Matching PWA ListItemText
  listItemText: {
    flex: 1,
  },
  
  // Primary Text - Matching PWA primaryTypographyProps
  primaryText: {
    color: 'white', // Matching PWA color: "white"
    fontWeight: 'bold', // Matching PWA fontWeight: "bold"
    fontSize: 16, // Material-UI body1 fontSize
    marginBottom: 4,
  },
  
  // Secondary Container
  secondaryContainer: {
    flexDirection: 'column',
  },
  
  // Secondary Text - Matching PWA secondary span styling
  destinationLabel: {
    fontSize: 14.4, // 0.9em of 16px
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  
  destinationText: {
    fontSize: 14.4, // 0.9em of 16px
    color: 'rgba(255, 255, 255, 0.7)', // Slightly transparent white
  },
  
  // Remove Button - Matching PWA IconButton
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  
  removeIcon: {
    fontSize: 20,
    color: '#f44336', // Material-UI error color
    fontWeight: 'bold',
  },
});

export default ChatListItem;