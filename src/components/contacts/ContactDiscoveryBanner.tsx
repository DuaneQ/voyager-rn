import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface ContactDiscoveryBannerProps {
  /**
   * Sync state
   */
  hasSynced: boolean;
  
  /**
   * Number of matched contacts found
   */
  matchCount: number;
  
  /**
   * Optional timestamp of last sync
   */
  lastSyncedAt?: Date | null;
  
  /**
   * Callback when banner is pressed
   */
  onPress: () => void;
}

/**
 * Format relative time from a date (e.g., "2 hours ago", "Just now")
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // Format absolute date for older syncs
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const ContactDiscoveryBanner: React.FC<ContactDiscoveryBannerProps> = ({
  hasSynced,
  matchCount,
  lastSyncedAt,
  onPress,
}) => {
  // Determine banner text based on state
  const getBannerText = (): string => {
    if (!hasSynced) {
      return 'Find friends on TravalPass';
    }
    
    if (matchCount === 0) {
      return 'Invite friends to join';
    }
    
    if (matchCount <= 5) {
      const plural = matchCount === 1 ? 'contact is' : 'contacts are';
      return `${matchCount} ${plural} on TravalPass`;
    }
    
    // 5+ matches
    return `${matchCount}+ friends on TravalPass!`;
  };
  
  // Determine button text based on state
  const getButtonText = (): string => {
    if (!hasSynced) {
      return 'Discover';
    }
    
    if (matchCount === 0) {
      return 'Invite';
    }
    
    return 'View Them';
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#E3F2FD', '#BBDEFB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon + Text */}
          <View style={styles.leftSection}>
            <Text style={styles.icon}>👥</Text>
            <View style={styles.textContainer}>
              <Text style={styles.text} numberOfLines={2}>
                {getBannerText()}
              </Text>
              {hasSynced && lastSyncedAt && (
                <Text style={styles.timestamp}>
                  Last synced: {formatRelativeTime(lastSyncedAt)}
                </Text>
              )}
            </View>
          </View>
          
          {/* Action Button */}
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonText}>{getButtonText()}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 3,
  },
  gradient: {
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 16,
    minHeight: 60,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1976D2',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  buttonContainer: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
