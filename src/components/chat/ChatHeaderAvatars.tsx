/**
 * ChatHeaderAvatars.tsx
 * 
 * Component for displaying participant avatars in the chat header.
 * Shows stacked/overlapping avatars with overflow chip (+N) for groups.
 * 
 * Features:
 * - Display up to 4 avatars with stacked presentation
 * - Overflow chip (+N) for remaining participants
 * - Initials fallback for missing photos
 * - Tap-to-open-profile navigation
 * - Accessible labels for screen readers
 * 
 * Architecture:
 * - Pure presentation component (no state, no hooks except navigation)
 * - Receives participant data via props
 * - Uses default avatar asset from profile code
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

interface Participant {
  uid: string;
  username?: string;
  photoURL?: string;
}

interface ChatHeaderAvatarsProps {
  participants: Participant[];
  currentUserId: string;
  maxVisible?: number; // Default: 4
  onAvatarPress?: (participant: Participant) => void;
}

const AVATAR_SIZE = 36;
const OVERLAP = 10; // How much avatars overlap

/**
 * Render a single avatar with fallback to initials.
 */
const Avatar: React.FC<{
  participant: Participant;
  index: number;
  onPress?: () => void;
}> = ({ participant, index, onPress }) => {
  const initial = (participant.username || 'U').charAt(0).toUpperCase();
  const zIndex = 100 - index; // Higher index = lower z-index

  return (
    <TouchableOpacity
      style={[styles.avatarContainer, { zIndex, marginLeft: index > 0 ? -OVERLAP : 0 }]}
      onPress={onPress}
      accessibilityLabel={`Open profile: ${participant.username || 'Unknown'}`}
      accessibilityRole="button"
    >
      {participant.photoURL ? (
        <Image
          source={{ uri: participant.photoURL }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
      )}
      <View style={styles.avatarBorder} />
    </TouchableOpacity>
  );
};

/**
 * Overflow chip showing "+N" for remaining participants.
 */
const OverflowChip: React.FC<{ count: number }> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <View
      style={[styles.avatarContainer, { zIndex: 0, marginLeft: -OVERLAP }]}
      accessibilityLabel={`${count} more participants`}
    >
      <View style={styles.overflowChip}>
        <Text style={styles.overflowText}>+{count}</Text>
      </View>
      <View style={styles.avatarBorder} />
    </View>
  );
};

export const ChatHeaderAvatars: React.FC<ChatHeaderAvatarsProps> = ({
  participants,
  currentUserId,
  maxVisible = 4,
  onAvatarPress,
}) => {
  // Filter out current user
  const otherParticipants = participants.filter((p) => p.uid !== currentUserId);

  // Split into visible and overflow
  const visibleParticipants = otherParticipants.slice(0, maxVisible);
  const overflowCount = Math.max(0, otherParticipants.length - maxVisible);

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Chat with ${otherParticipants.length} participant${
        otherParticipants.length !== 1 ? 's' : ''
      }`}
    >
      {visibleParticipants.map((participant, index) => (
        <Avatar
          key={participant.uid}
          participant={participant}
          index={index}
          onPress={() => onAvatarPress?.(participant)}
        />
      ))}
      <OverflowChip count={overflowCount} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: AVATAR_SIZE + 4, // Add space for border
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  overflowChip: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#8e8e93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
