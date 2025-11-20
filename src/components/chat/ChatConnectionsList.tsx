/**
 * ChatConnectionsList.tsx
 * 
 * Container component for displaying the list of chat connections.
 * Implements S.O.L.I.D principles with clear separation of concerns.
 * 
 * Features:
 * - Virtualized FlatList for performance with many connections
 * - Search/filter bar for finding specific connections
 * - Pull-to-refresh for manual updates
 * - Pagination via useConnections hook
 * - Real-time updates via Firestore listeners
 * 
 * Architecture:
 * - Uses useConnections hook for data (no direct Firestore access)
 * - Delegates rendering to ChatConnectionItem (presentation component)
 * - Pure container pattern following Single Responsibility Principle
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  Alert,
} from 'react-native';
import { useConnections } from '../../hooks/chat/useConnections';
import { useRemoveConnection } from '../../hooks/useRemoveConnection';
import { ChatConnectionItem } from './ChatConnectionItem';
import { Connection } from '../../types/Connection';

interface ChatConnectionsListProps {
  userId: string;
  onConnectionPress: (connection: Connection) => void;
}

export const ChatConnectionsList: React.FC<ChatConnectionsListProps> = ({
  userId,
  onConnectionPress,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { connections, loading, error, hasMore, loadMore, refresh } = useConnections(userId);
  const removeConnection = useRemoveConnection();

  /**
   * Handle connection deletion.
   */
  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    const result = await removeConnection(connectionId);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to remove connection');
    }
  }, [removeConnection]);

  /**
   * Filter connections based on search query.
   * Searches in username, destination, and itinerary dates.
   */
  const filteredConnections = React.useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return connections;

    const query = trimmedQuery.toLowerCase();
    return connections.filter((conn) => {
      // Search in other user's username
      const otherItinerary = conn.itineraries?.find(
        (it) => it.userInfo && it.userInfo.uid !== userId
      );
      const username = otherItinerary?.userInfo?.username?.toLowerCase() || '';
      
      // Search in destination
      const destination = otherItinerary?.destination?.toLowerCase() || '';
      
      // Search in dates
      const startDate = otherItinerary?.startDate?.toLowerCase() || '';
      const endDate = otherItinerary?.endDate?.toLowerCase() || '';

      return (
        username.includes(query) ||
        destination.includes(query) ||
        startDate.includes(query) ||
        endDate.includes(query)
      );
    });
  }, [connections, searchQuery, userId]);

  /**
   * Handle load more (pagination).
   */
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMore();
    }
  }, [loading, hasMore, loadMore]);

  /**
   * Render a single connection item.
   */
  const renderItem = useCallback(
    ({ item }: { item: Connection }) => (
      <ChatConnectionItem
        connection={item}
        userId={userId}
        onPress={() => onConnectionPress(item)}
        onDelete={handleDeleteConnection}
      />
    ),
    [userId, onConnectionPress, handleDeleteConnection]
  );

  /**
   * Render footer with loading indicator or end message.
   */
  const renderFooter = useCallback(() => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }, [loading]);

  /**
   * Render empty state.
   */
  const renderEmptyComponent = useCallback(() => {
    if (loading && connections.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Loading connections...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Error loading connections</Text>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      );
    }

    if (searchQuery.trim() && filteredConnections.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No connections match your search</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No connections yet</Text>
        <Text style={styles.emptySubtext}>
          Start matching with other travelers to begin chatting!
        </Text>
      </View>
    );
  }, [loading, connections.length, error, searchQuery, filteredConnections.length]);

  /**
   * Key extractor for FlatList optimization.
   */
  const keyExtractor = useCallback((item: Connection) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Search/Filter Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search connections..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Connections List */}
      <FlatList
        data={filteredConnections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading && connections.length > 0}
            onRefresh={refresh}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyComponent}
        // Performance optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        // Accessibility
        accessibilityLabel="Connections list"
        accessibilityRole="list"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  listContent: {
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    marginTop: 8,
    textAlign: 'center',
  },
});
