/**
 * VideoCommentsModal Component
 * Modal for viewing and adding comments on videos
 * React Native implementation mirroring PWA functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  SafeAreaView,
  Dimensions,
  Keyboard,
} from 'react-native';

const { height: screenHeight } = Dimensions.get('window');
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getDoc,
  getDocFromServer,
  updateDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db, getAuthInstance } from '../../config/firebaseConfig';
import { Video, VideoComment } from '../../types/Video';

interface VideoCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  video: Video;
  onCommentAdded?: () => void;
}

interface CommentWithUser extends VideoComment {
  username?: string;
  profilePhotoURL?: string;
}

export const VideoCommentsModal: React.FC<VideoCommentsModalProps> = ({
  visible,
  onClose,
  video,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const currentUser = getAuthInstance()?.currentUser;
  const maxCommentLength = 300;

  // Track keyboard height on Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Load comments when modal opens
  // Only reload when modal becomes visible or video ID changes
  // Do NOT reload on video.comments changes to avoid re-opening after comment submission
  useEffect(() => {
    if (visible && video.id) {
      loadComments();
    }
  }, [visible, video.id]);

  const loadComments = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch fresh video data from Firestore to get latest comments
      const videoRef = doc(db, 'videos', video.id);
      // Use getDocFromServer to bypass Firestore cache and get fresh data
      const videoDoc = await getDocFromServer(videoRef);
      
      if (!videoDoc.exists()) {
        setError('Video not found');
        setLoading(false);
        return;
      }
      
      const videoData = videoDoc.data();
      const freshComments = videoData?.comments || [];

      // Enrich comments with user data
      const commentsWithUsers: CommentWithUser[] = await Promise.all(
        freshComments.map(async (comment: VideoComment) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', comment.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...comment,
                username: userData.username || 'Unknown User',
                profilePhotoURL: userData.profilePhotoURL || null,
              };
            }
          } catch (error) {
            console.error('Error loading user data for comment:', error);
          }

          return {
            ...comment,
            username: 'Unknown User',
            profilePhotoURL: null,
          };
        })
      );

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentUser) {
      setError('You must be logged in to comment');
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    if (newComment.length > maxCommentLength) {
      setError(`Maximum ${maxCommentLength} characters allowed.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Create new comment object
      const newCommentData: VideoComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.uid,
        text: newComment.trim(),
        createdAt: Timestamp.now(),
      };

      // Update the video document
      const videoRef = doc(db, 'videos', video.id);
      await updateDoc(videoRef, {
        comments: arrayUnion(newCommentData),
        updatedAt: Timestamp.now(),
      });

      // Add comment to local state (optimistic update)
      const newCommentWithUser: CommentWithUser = {
        ...newCommentData,
        username: currentUser.displayName || 'You',
        profilePhotoURL: currentUser.photoURL ?? undefined,
      };

      setComments((prev) => [newCommentWithUser, ...prev]);
      setNewComment('');

      // Notify parent component
      onCommentAdded?.();
    } catch (error: any) {
      console.error('[VideoCommentsModal] Error adding comment:', error);
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (timestamp: Timestamp): string => {
    const now = Date.now();
    const commentTime = timestamp.toMillis();
    const diffInSeconds = Math.floor((now - commentTime) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleClose = () => {
    setNewComment('');
    setError(null);
    onClose();
  };

  const renderComment = ({ item }: { item: CommentWithUser }) => (
    <View style={styles.commentItem}>
      <View style={styles.commentAvatar}>
        {item.profilePhotoURL ? (
          <Image
            source={{ uri: item.profilePhotoURL }}
            style={styles.avatarImage}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={20} color="#666" />
          </View>
        )}
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{item.username}</Text>
          <Text style={styles.commentTime}>
            {formatTimeAgo(item.createdAt)}
          </Text>
        </View>
        <Text style={styles.commentText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Comments ({comments.length})
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        <View style={styles.commentsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976d2" />
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No comments yet. Be the first to comment!
              </Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>

        {/* Comment Input */}
        {currentUser && (
          <View style={[
            styles.inputContainer,
            Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: keyboardHeight }
          ]}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              editable={!submitting}
              multiline
              maxLength={maxCommentLength}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || submitting) && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!newComment.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
            <Text style={styles.characterCount}>
              {newComment.length}/{maxCommentLength}
            </Text>
          </View>
        )}

        {!currentUser && (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>
              Log in to leave a comment
            </Text>
          </View>
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    // Add padding at bottom for Android navigation bar
    paddingBottom: Platform.OS === 'android' ? 60 : 0,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  commentsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  commentsList: {
    padding: 8,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1976d2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  characterCount: {
    position: 'absolute',
    bottom: 4,
    right: 60,
    fontSize: 10,
    color: '#666',
  },
  loginPrompt: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  loginPromptText: {
    color: '#666',
  },
});
