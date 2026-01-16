/**
 * RatingsModal Component
 * Displays user ratings and reviews in a modal
 * Shows average rating, total count, and list of individual reviews
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Rating {
  rating: number;
  comment?: string;
  timestamp?: number;
}

interface RatingsData {
  average?: number;
  count?: number;
  ratedBy?: Record<string, Rating>;
}

export interface RatingsModalProps {
  visible: boolean;
  onClose: () => void;
  ratings?: RatingsData;
  currentUserId?: string;
}

export const RatingsModal: React.FC<RatingsModalProps> = ({
  visible,
  onClose,
  ratings,
  currentUserId,
}) => {
  const hasRatings = ratings && ratings.count && ratings.count > 0;
  const ratedByEntries = ratings?.ratedBy ? Object.entries(ratings.ratedBy) : [];
  const reviewsWithComments = ratedByEntries.filter(([, entry]) => entry.comment && entry.comment.trim());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="ratings-modal"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ratings & Reviews</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            testID="close-ratings-modal"
            accessibilityRole="button"
            accessibilityLabel="Close ratings modal"
          >
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {hasRatings ? (
            <>
              {/* Summary Section */}
              <View style={styles.summaryContainer}>
                <Text style={styles.averageRating}>
                  ⭐ {ratings.average?.toFixed(1) || '0.0'}
                </Text>
                <Text style={styles.ratingCount}>
                  {ratings.count} {ratings.count === 1 ? 'review' : 'reviews'}
                </Text>
              </View>

              {/* Reviews List */}
              {reviewsWithComments.length > 0 ? (
                <View style={styles.reviewsSection}>
                  <Text style={styles.sectionTitle}>User Reviews</Text>
                  {reviewsWithComments.map(([uid, entry]) => (
                    <View key={uid} style={styles.reviewCard} testID={`review-${uid}`}>
                      <View style={styles.reviewHeader}>
                        <View style={styles.starRating}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Text
                              key={star}
                              style={[
                                styles.star,
                                star <= entry.rating && styles.starFilled,
                              ]}
                            >
                              ★
                            </Text>
                          ))}
                        </View>
                        {entry.timestamp && (
                          <Text style={styles.reviewDate}>
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      {entry.comment && (
                        <Text style={styles.reviewComment}>{entry.comment}</Text>
                      )}
                      <Text style={styles.reviewAuthor}>
                        {uid === currentUserId ? 'You' : `User: ${uid.slice(0, 6)}...`}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    {ratings.count} {ratings.count === 1 ? 'rating' : 'ratings'} received, but no written reviews yet.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No ratings yet</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  averageRating: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 16,
    color: '#666',
  },
  reviewsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
  },
  star: {
    fontSize: 16,
    color: '#ddd',
    marginRight: 2,
  },
  starFilled: {
    color: '#FFD700',
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewAuthor: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
