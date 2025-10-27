/**
 * PhotoGrid Component
 * Displays a grid of user's travel photos
 * Phase 1: Basic photo display with upload capability
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3; // 3 columns with padding

interface Photo {
  id: string;
  url: string;
  caption?: string;
  uploadedAt: Date;
}

interface PhotoGridProps {
  photos: Photo[];
  onPhotoPress: (photo: Photo) => void;
  onAddPhoto: () => void;
  isOwnProfile: boolean;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoPress,
  onAddPhoto,
  isOwnProfile,
}) => {
  const renderPhoto = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.photoContainer}
      onPress={() => onPhotoPress(item)}
      accessibilityLabel={`Photo: ${item.caption || 'Travel photo'}`}
      testID={`photo-item-${item.id}`}
    >
      <Image source={{ uri: item.url }} style={styles.photo} />
    </TouchableOpacity>
  );

  const renderAddButton = () => {
    if (!isOwnProfile || photos.length >= 9) return null;

    return (
      <TouchableOpacity
        style={[styles.photoContainer, styles.addButton]}
        onPress={onAddPhoto}
        accessibilityLabel="Add photo"
        testID="add-photo-button"
      >
        <Ionicons name="add" size={40} color="#1976d2" />
        <Text style={styles.addButtonText}>Add Photo</Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="images-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>
        {isOwnProfile ? 'No photos yet' : 'No photos to display'}
      </Text>
      {isOwnProfile && (
        <TouchableOpacity style={styles.emptyAddButton} onPress={onAddPhoto}>
          <Text style={styles.emptyAddButtonText}>Add your first travel photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const allItems = isOwnProfile && photos.length < 9 
    ? [...photos, { id: 'add-button', url: '', uploadedAt: new Date() }]
    : photos;

  return (
    <View style={styles.container} testID="photo-grid">
      <View style={styles.header}>
        <Text style={styles.title}>Travel Photos</Text>
        <Text style={styles.count}>
          {photos.length}/9
        </Text>
      </View>

      {photos.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={allItems}
          renderItem={({ item }) =>
            item.id === 'add-button' ? renderAddButton() : renderPhoto({ item })
          }
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  count: {
    fontSize: 14,
    color: '#999',
  },
  row: {
    justifyContent: 'flex-start',
  },
  photoContainer: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  addButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#1976d2',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 12,
    color: '#1976d2',
    marginTop: 4,
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 16,
  },
  emptyAddButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
