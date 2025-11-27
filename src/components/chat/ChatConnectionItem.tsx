/**
 * ChatConnectionItem.tsx
 * 
 * Presentation component for rendering a single connection row.
 * Enhanced version matching REQUIREMENTS.md specifications.
 * 
 * Features:
 * - Avatar(s) with initials fallback
 * - Title (username or group name)
 * - Itinerary summary (destination • dates)
 * - Last message preview with truncation
 * - Timestamp (relative time)
 * - Unread badge (numeric count)
 * - Swipe-to-delete action
 * 
 * Architecture:
 * - Pure presentation component (Single Responsibility)
 * - Receives all data via props (no hooks, no state)
 * - Uses formatDate utility for consistent formatting
 * - Accessible labels and roles
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { Connection } from '../../types/Connection';
import { formatMessageTime } from '../../utils/formatDate';

interface ChatConnectionItemProps {
  connection: Connection;
  userId: string;
  onPress: () => void;
  onDelete?: (connectionId: string) => void;
}

/**
 * Get the other user's info from the connection (1:1 chat).
 */
function getOtherUser(connection: Connection, userId: string) {
  if (!Array.isArray(connection.itineraries)) {
    return {
      username: 'Unknown',
      photoURL: '',
      uid: '',
    };
  }
  const otherItinerary = connection.itineraries.find(
    (it) => it.userInfo && it.userInfo.uid !== userId
  );
  return (
    otherItinerary?.userInfo || {
      username: 'Unknown',
      photoURL: '',
      uid: '',
    }
  );
}

/**
 * Get the other user's itinerary (for destination/dates).
 */
function getOtherItinerary(connection: Connection, userId: string) {
  if (!Array.isArray(connection.itineraries)) return undefined;
  return connection.itineraries.find(
    (it) => it.userInfo && it.userInfo.uid !== userId
  );
}

/**
 * Get display title (username for 1:1, participant list for group).
 */
function getDisplayTitle(connection: Connection, userId: string): string {
  if (!connection.users || connection.users.length <= 2) {
    const otherUser = getOtherUser(connection, userId);
    return otherUser.username || 'Unknown';
  }

  // Group chat - show first few names + count
  const otherUsers = connection.itineraries
    ?.filter((it) => it.userInfo && it.userInfo.uid !== userId)
    .map((it) => it.userInfo?.username || 'Unknown')
    .slice(0, 2);

  const remaining = connection.users.length - 2 - (otherUsers?.length || 0);
  if (otherUsers && otherUsers.length > 0) {
    const namesStr = otherUsers.join(', ');
    return remaining > 0 ? `${namesStr}, ${remaining} more` : namesStr;
  }

  return `Group Chat (${connection.users.length} members)`;
}

/**
 * Get itinerary summary (destination • dates).
 */
function getItinerarySummary(connection: Connection, userId: string): string {
  const itinerary = getOtherItinerary(connection, userId);
  if (!itinerary) return '';

  const destination = itinerary.destination || '';
  const dates =
    itinerary.startDate && itinerary.endDate
      ? `${itinerary.startDate} - ${itinerary.endDate}`
      : '';

  if (destination && dates) {
    return `${destination} • ${dates}`;
  }
  return destination || dates;
}

export const ChatConnectionItem: React.FC<ChatConnectionItemProps> = ({
  connection,
  userId,
  onPress,
  onDelete,
}) => {
  const otherUser = getOtherUser(connection, userId);
  const displayTitle = getDisplayTitle(connection, userId);
  const itinerarySummary = getItinerarySummary(connection, userId);

  // Get unread count for current user
  const unreadCount = connection.unreadCounts?.[userId] || 0;

  // Get last message preview
  const lastMessagePreview = connection.lastMessagePreview;
  const previewText = lastMessagePreview?.text || '';
  const previewSender = lastMessagePreview?.sender || '';
  const showImageIcon = !previewText && lastMessagePreview?.imageUrl;

  // Get timestamp (last message or connection creation)
  const timestamp = lastMessagePreview?.createdAt || connection.createdAt;
  const formattedTime = formatMessageTime(
    typeof timestamp === 'number' ? new Date(timestamp) : (timestamp as any)
  );

  /**
   * Handle delete/remove connection with confirmation.
   */
  const handleDelete = () => {
    if (!onDelete) return;
    
    Alert.alert(
      'Remove Connection',
      'This will remove the conversation for you. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onDelete(connection.id);
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={handleDelete}
      accessibilityLabel={`${displayTitle}. ${unreadCount} unread messages. Open chat.`}
      accessibilityRole="button"
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {(otherUser as any).photoURL ? (
          <Image source={{ uri: (otherUser as any).photoURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>
              {(otherUser.username || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title and Timestamp Row */}
        <View style={styles.topRow}>
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.timestamp}>{formattedTime}</Text>
        </View>

        {/* Itinerary Summary */}
        {itinerarySummary && (
          <Text style={styles.itinerarySummary} numberOfLines={1}>
            {itinerarySummary}
          </Text>
        )}

        {/* Last Message Preview */}
        <View style={styles.previewRow}>
          {showImageIcon && <Text style={styles.imageIcon}>📷 </Text>}
          <Text style={styles.preview} numberOfLines={1}>
            {showImageIcon
              ? 'Photo'
              : previewText
              ? `${previewSender ? previewSender + ': ' : ''}${previewText}`
              : 'No messages yet'}
          </Text>
        </View>
      </View>

      {/* Delete Button (tap to show, or use long-press) */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        accessibilityLabel="Remove connection"
        accessibilityRole="button"
      >
        <Text style={styles.deleteIcon}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#8e8e93',
  },
  itinerarySummary: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageIcon: {
    fontSize: 14,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    color: '#8e8e93',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteIcon: {
    fontSize: 20,
  },
});
